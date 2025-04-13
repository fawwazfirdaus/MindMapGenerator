import './App.css'
import MindMap from './MindMap'
import FileUpload from './FileUpload'
import React, { useState, useCallback } from 'react';
import { applyNodeChanges, applyEdgeChanges, addEdge } from 'reactflow';
import dagre from 'dagre'; // Import dagre
import NodeDetailModal from './NodeDetailModal'; // Import the new modal component

// Define initial state - empty until file is processed
const initialNodes = [];
const initialEdges = [];

// --- Dagre Layout Configuration ---
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

// Define estimated dimensions for nodes (adjust as needed based on your CSS)
const NODE_WIDTH = 350; // Increased width to accommodate text
const NODE_HEIGHT = 150; // Increased height
const MANUAL_Y_OFFSET = 200; // Vertical distance for manually added nodes
const MANUAL_X_OFFSET = 250; // Horizontal distance/spread for manually added nodes

const getLayoutedElements = (nodesToLayout, edgesToLayout, direction = 'TB') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction, nodesep: 100, ranksep: 120 }); // Adjust spacing

  nodesToLayout.forEach((node) => {
    // Provide Dagre with node dimensions
    // Use node.width and node.height if available, otherwise use constants
    const width = node.width || NODE_WIDTH;
    const height = node.height || NODE_HEIGHT;
    dagreGraph.setNode(node.id, { label: node.data.label, width: width, height: height });
  });

  edgesToLayout.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodesToLayout.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const width = node.width || NODE_WIDTH;
    const height = node.height || NODE_HEIGHT;
    // We need to center the node position based on the node width and height
    node.position = {
      x: nodeWithPosition.x - width / 2,
      y: nodeWithPosition.y - height / 2,
    };
    node.targetPosition = isHorizontal ? 'left' : 'top';
    node.sourcePosition = isHorizontal ? 'right' : 'bottom';

    return node;
  });

  return { nodes: layoutedNodes, edges: edgesToLayout };
};
// --- End Dagre Layout Configuration ---

// Counter for unique IDs for manually added nodes
let manualNodeCounter = 0;

// Recursive function to convert API data to basic React Flow nodes and edges (NO positions)
function createGraphElements(branchData, level = 0, handleAddSubBranchCallback) {
  const nodes = [];
  const edges = [];

  const node = {
      id: branchData.id,
      type: level === 0 ? 'rootNode' : 'branchNode',
      data: {
          label: branchData.topic,
          summary: branchData.summary,
          // Pass the callback for BranchNodes
          onAddSubBranch: level > 0 ? () => handleAddSubBranchCallback(branchData.id) : undefined,
          // RootNode might need 'onAddBranch' if we reinstate that too
          // Add image_url if available from data
          image_url: branchData.image_url || null,
      },
      // Position is now calculated by Dagre later
      position: { x: 0, y: 0 },
      // Let's give Dagre hints if possible, otherwise it uses defaults
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
  };
  nodes.push(node);

  // Recursively process children and create edges
  if (branchData.children && branchData.children.length > 0) {
      branchData.children.forEach((child) => {
          const edge = {
              id: `e-${branchData.id}-${child.id}`,
              source: branchData.id, // Parent is the source
              target: child.id,     // Child is the target
              animated: true,
              type: 'smoothstep',
          };
          edges.push(edge);

          // Process child recursively
          const childElements = createGraphElements(child, level + 1, handleAddSubBranchCallback);
          nodes.push(...childElements.nodes);
          edges.push(...childElements.edges);
      });
  }

  return { nodes, edges };
}

function App() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState(null); // State for selected node ID
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false); // State for modal visibility

  // --- Function to MANUALLY add sub-branches ---
  const handleAddSubBranch = useCallback((parentNodeId) => {
    manualNodeCounter++;
    const newNodeId = `manual-${parentNodeId}-${manualNodeCounter}`;
    const newEdgeId = `edge-manual-${parentNodeId}-${manualNodeCounter}`;

    setNodes((nds) => {
      const parentNode = nds.find(n => n.id === parentNodeId);
      if (!parentNode) {
          console.error("Parent node not found for adding sub-branch:", parentNodeId);
          return nds;
      }

      // Simple relative positioning for manual nodes
      const newY = parentNode.position.y + MANUAL_Y_OFFSET;
      // Basic horizontal spread - alternate left/right slightly
      const childCount = nds.filter(n => edges.some(e => e.source === parentNodeId && e.target === n.id)).length;
      const newX = parentNode.position.x + (childCount % 2 === 0 ? -1 : 1) * MANUAL_X_OFFSET / 2 * (Math.random() * 0.5 + 0.75); // Add some randomness


      const newNode = {
        id: newNodeId,
        type: 'branchNode',
        data: {
          label: `Manual Sub-topic ${manualNodeCounter}`,
          summary: `Manually added branch from ${parentNode.data.label}. Add more details here.`,
          // Crucially, allow adding further sub-branches from this new node
          onAddSubBranch: () => handleAddSubBranch(newNodeId),
        },
        position: { x: newX, y: newY },
        width: NODE_WIDTH, // Ensure manual nodes also have dimensions
        height: NODE_HEIGHT,
      };

      return [...nds, newNode];
    });

    setEdges((eds) => {
      const newEdge = {
        id: newEdgeId,
        source: parentNodeId,
        target: newNodeId,
        animated: false, // Maybe non-animated for manual edges?
        type: 'smoothstep',
      };
      return [...eds, newEdge];
    });
  }, [setNodes, setEdges, edges]); // Added edges dependency for childCount calculation
  // --- End Manual Add Sub-branch ---

  // React Flow handlers
  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );
  const onConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  // --- Handle File Upload and API Call ---
  const handleFileSelected = async (file) => {
    console.log("handleFileSelected triggered with file:", file);
    if (!file) {
        console.log("No file selected, exiting handleFileSelected.");
        return;
    }
    manualNodeCounter = 0; // Reset manual counter on new upload

    setIsLoading(true);
    setError(null);
    setNodes([]);
    setEdges([]);
    setSelectedFileName(file.name);
    setSelectedNodeId(null); // Reset modal state on new upload
    setIsDetailModalOpen(false);

    const formData = new FormData();
    formData.append('file', file);

    console.log('Sending file to backend:', file.name);

    try {
      // Use environment variable in production
      // const apiUrl = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/generate_mindmap/';
      // Simplification: Use the hardcoded URL directly for now
      const apiUrl = 'http://127.0.0.1:8000/generate_mindmap/';
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorDetail = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorDetail = errorData.detail || errorDetail;
        } catch (jsonError) { console.error("Could not parse error JSON:", jsonError); }
        throw new Error(errorDetail);
      }

      const mindMapData = await response.json();
      console.log('Received mind map data from backend:', mindMapData);

      // 1. Create basic nodes and edges from API data
      const { nodes: initialFlowNodes, edges: initialFlowEdges } = createGraphElements(mindMapData, 0, handleAddSubBranch);
      console.log('Initial (unlayouted) nodes:', initialFlowNodes);
      console.log('Initial edges:', initialFlowEdges);


      // 2. Calculate layout using Dagre
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        initialFlowNodes,
        initialFlowEdges
      );
      console.log('Layouted nodes:', layoutedNodes);


      setNodes(layoutedNodes);
      setEdges(layoutedEdges); // Use the layouted edges

    } catch (err) {
      console.error('Error generating mind map:', err);
      setError(err.message || 'An unknown error occurred.');
      setNodes([]); // Clear nodes on error
      setEdges([]); // Clear edges on error
    } finally {
      setIsLoading(false);
    }
  };
  // --- End Handle File Upload ---

  // Handler for clicking a node
  const handleNodeClick = useCallback((event, node) => {
    console.log("Node clicked:", node); // Log the clicked node
    setSelectedNodeId(node.id);
    setIsDetailModalOpen(true);
  }, []); // Dependencies: none

  // Handler for closing the modal
  const handleCloseModal = useCallback(() => {
    setIsDetailModalOpen(false);
    setSelectedNodeId(null); // Clear selection when modal closes
  }, []); // Dependencies: none

  // Find the data for the selected node
  const selectedNodeData = nodes.find(node => node.id === selectedNodeId)?.data;

  return (
    <div className="app-container">
      <h1>RAG Mind Map Generator</h1>
      <FileUpload onFileSelect={handleFileSelected} disabled={isLoading} />
      {selectedFileName && !isLoading && !error && <p>Generated from: {selectedFileName}</p>}
      {isLoading && <p>Generating Mind Map... Please wait.</p>}
      {error && <p className="error-message">Error: {error}</p>}

      <div className="mindmap-container" style={{ height: '70vh', width: '100%', border: '1px solid #ccc', position: 'relative' }}>
        <MindMap
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
        />
      </div>

      {/* Conditionally render the modal */}
      {isDetailModalOpen && selectedNodeData && (
         <NodeDetailModal
           isOpen={isDetailModalOpen}
           onClose={handleCloseModal}
           nodeData={selectedNodeData}
         />
       )}
    </div>
  )
}

export default App
