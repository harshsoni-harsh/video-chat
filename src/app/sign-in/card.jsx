import React, { useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

const FileUpload = () => {
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const uploadFile = () => {
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const fileData = e.target.result.split(',')[1]; // base64 encoded string

        // Send file to server
        socket.emit('file-upload', {
          file: fileData,
          fileName: file.name,
        });
        console.log('File uploaded:', file.name);
      };
      reader.readAsDataURL(file); // convert file to base64 string
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      <button onClick={uploadFile}>Upload</button>
    </div>
  );
};

export default FileUpload;
