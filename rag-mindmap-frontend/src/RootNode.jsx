import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

// Custom node for the root/source file
const RootNode = memo(({ data }) => {

  const handleAddBranch = () => {
    // Call the function passed via props from App.jsx
    if (data.onAddBranch) {
      data.onAddBranch(); 
    } else {
      console.warn('onAddBranch handler not provided to RootNode', data);
    }
  };

  // Placeholder Chat handler
  const handleChat = () => {
    console.log('Chat button clicked for node:', data.label);
    // TODO: Implement chat functionality (e.g., open chat panel)
  };

  return (
    <div style={{
      background: '#e6f7ff', // Different background for root
      border: '1px solid #1890ff',
      borderRadius: '8px', // Slightly larger radius
      padding: '20px', // Increased padding
      minWidth: '250px', // Increased min width
      maxWidth: '450px', // Increased max width
      textAlign: 'center',
      fontSize: '14px', // Base font size
    }}>
      {/* Node Title */}
      <div style={{ marginBottom: '12px', fontWeight: 'bold', fontSize: '1.2em' }}>
        {data.label || 'Source Node'}
      </div>

      {/* Summary Section */}
      {data.summary && (
        <div style={{
          marginBottom: '15px', 
          fontSize: '0.95em', 
          color: '#555', 
          textAlign: 'left',
          maxHeight: '100px', // Limit summary height
          overflowY: 'auto' // Add scroll if summary is long
         }}>
          {data.summary}
        </div>
      )}

      {/* Buttons Container */}
      <div style={{ display: 'flex', justifyContent: 'space-around', gap: '10px' }}>
        <button
          onClick={handleAddBranch}
          style={{
            padding: '8px 15px',
            fontSize: '0.9em',
            cursor: 'pointer'
          }}
        >
          Add Branch
        </button>
        <button
          onClick={handleChat} // Add Chat handler
          style={{
            padding: '8px 15px',
            fontSize: '0.9em',
            cursor: 'pointer',
            background: '#f0f0f0' // Different style for chat button?
          }}
        >
          Chat
        </button>
      </div>

      {/* Handle for outgoing connections (to first-level branches) */}
      <Handle type="source" position={Position.Bottom} id="source" />
    </div>
  );
});

export default RootNode; 