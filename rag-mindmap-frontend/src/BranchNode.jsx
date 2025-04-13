import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

// Use memo for performance optimization with React Flow
const BranchNode = memo(({ data }) => {
  const handleAddSubBranch = () => {
    // console.log(`Add sub-branch requested for node: ${data.label}`);
    // Call the function passed via props
    if (data.onAddSubBranch) {
      data.onAddSubBranch();
    } else {
      console.warn('onAddSubBranch handler not provided to BranchNode', data);
    }
  };

  // Placeholder Chat handler
  const handleChat = () => {
    console.log('Chat button clicked for node:', data.label);
    // TODO: Implement chat functionality
  };

  return (
    <div style={{
      background: '#fafafa', // Slightly different background
      border: '1px solid #ccc',
      borderRadius: '8px',
      padding: '15px', // Increased padding
      minWidth: '220px', // Increased min width
      maxWidth: '400px', // Increased max width
      textAlign: 'center',
      fontSize: '14px',
    }}>
      {/* Handle for incoming connections (from parent) */}
      <Handle type="target" position={Position.Top} id="target" />

      {/* Node Title */}
      <div style={{ marginBottom: '10px', fontWeight: 'bold', fontSize: '1.1em' }}>
         {/* We can differentiate title/summary later if needed */}
         {data.label || 'Branch Node'}
      </div>
      
      {/* Summary Section */}
      {data.summary && (
        <div style={{
          marginBottom: '12px',
          fontSize: '0.9em', 
          color: '#666', 
          textAlign: 'left',
          maxHeight: '80px', // Limit summary height
          overflowY: 'auto' // Add scroll
         }}>
          {data.summary}
        </div>
      )}

      {/* Buttons Container */}
      <div style={{ display: 'flex', justifyContent: 'space-around', gap: '10px' }}>
        <button
          onClick={handleAddSubBranch}
          style={{
            padding: '6px 12px',
            fontSize: '0.8em',
            cursor: 'pointer'
          }}
        >
          Add Sub-branch
        </button>
        <button
          onClick={handleChat} // Add Chat handler
          style={{
            padding: '6px 12px',
            fontSize: '0.8em',
            cursor: 'pointer',
            background: '#f0f0f0'
          }}
        >
          Chat
        </button>
      </div>

      {/* Handle for outgoing connections (to children) */}
      <Handle type="source" position={Position.Bottom} id="source" />
    </div>
  );
});

export default BranchNode; 