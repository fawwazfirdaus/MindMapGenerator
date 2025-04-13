import React, { useMemo } from 'react';
import ReactFlow, {
  Controls,
  Background,
} from 'reactflow';

import 'reactflow/dist/style.css';
import BranchNode from './BranchNode';
import RootNode from './RootNode';

const nodeTypes = {
  branchNode: BranchNode,
  rootNode: RootNode,
};

function MindMap({ nodes, edges, onNodesChange, onEdgesChange, onConnect, onNodeClick }) {
  const memoizedNodeTypes = useMemo(() => nodeTypes, []);

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        fitView
        nodesDraggable={true}
        nodeTypes={memoizedNodeTypes}
      >
        <Controls />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}

export default MindMap; 