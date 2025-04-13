import React from 'react';
import './NodeDetailModal.css'; // We will create this file next

function NodeDetailModal({ isOpen, onClose, nodeData }) {
  // Don't render anything if the modal isn't open or there's no node data
  if (!isOpen || !nodeData) {
    return null;
  }

  // Stop click propagation to prevent closing modal when clicking inside content
  const handleContentClick = (e) => {
    e.stopPropagation();
  };

  return (
    // The overlay covers the whole screen and handles closing when clicked
    <div className="modal-overlay" onClick={onClose}>
      {/* The content area stops click propagation */}
      <div className="modal-content" onClick={handleContentClick}>
        {/* Close button */}
        <button className="modal-close-button" onClick={onClose} aria-label="Close modal">
          &times; {/* Use &times; for a standard 'X' */}
        </button>

        {/* Node Topic */}
        <h2>{nodeData.label || 'Node Details'}</h2>

        {/* Node Image (if available) */}
        {nodeData.image_url && (
             <img src={nodeData.image_url} alt={`Visual for ${nodeData.label}`} className="modal-image"/>
        )}

        {/* Node Summary */}
        <p className="modal-summary">{nodeData.summary || 'No summary available.'}</p>

        <hr />

        {/* Chat Section Placeholder */}
        <div className="chat-section">
          <h3>Chat about this topic</h3>
          <div className="chat-history-placeholder">
            {/* Placeholder for where chat messages will appear */}
            <p><i>Chat functionality coming soon...</i></p>
          </div>
          <div className="chat-input-placeholder">
            {/* Placeholder for the chat input field */}
            <input type="text" placeholder="Ask a question..." disabled />
            <button disabled>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NodeDetailModal; 