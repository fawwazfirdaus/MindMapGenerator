import React, { useState } from 'react';

function FileUpload({ onFileSelect }) { // Pass a callback prop
  const [selectedFileName, setSelectedFileName] = useState('');

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFileName(file.name);
      console.log('File selected:', file.name); // Placeholder action
      if (onFileSelect) {
        onFileSelect(file); // Call the callback with the file object
      }
    }
  };

  return (
    <div style={{ padding: '10px', borderBottom: '1px solid #ccc' }}>
      <label htmlFor="file-upload" style={{ marginRight: '10px' }}>
        Upload Source File:
      </label>
      <input
        id="file-upload"
        type="file"
        onChange={handleFileChange}
        // Add accept attribute for specific file types if needed later
        // accept=".pdf,.mp4,.mov"
      />
      {selectedFileName && <span style={{ marginLeft: '10px' }}>Selected: {selectedFileName}</span>}
    </div>
  );
}

export default FileUpload; 