// 'use client'
// import React, { useEffect, useState } from 'react';
// import io from 'socket.io-client';
// import { FaPaperPlane } from 'react-icons/fa';

// const socket = io('http://localhost:3001', { transports: ['websocket'] });

// const Chat = () => {
//   const [messages, setMessages] = useState([]);
//   const [newMessage, setNewMessage] = useState("");
//   const [selectedFile, setSelectedFile] = useState(null);

//   const getCurrentTime = () => {
//     const now = new Date();
//     return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
//   };

//   const download=(msg)=>{
//     const blob = new Blob([msg.SelectedFile], { type: 'application/octet-stream' });
//     const url = window.URL.createObjectURL(blob);
//     const link = document.createElement('a');
//     link.href = url;
//     link.setAttribute('download', msg.fileName);
//     document.body.appendChild(link);
//     link.click();
//     link.remove();
//     window.URL.revokeObjectURL(url);
//   }



//   const sendMessage = () => {
//     if (newMessage.trim()) {
//       const time = getCurrentTime();
//       const messageObj = { text: newMessage, sender: 'user', time };

//       socket.emit('chat message', messageObj);
//       setMessages((prevMessages) => [...prevMessages, messageObj]);
//       setNewMessage('');
//     }
//   };

//   const handleFileUpload = async () => {
//     if (selectedFile) {
//       const time = getCurrentTime();
//       const reader = new FileReader();
//       reader.onloadend = () => {
//         const fileBuffer = reader.result; // This is an ArrayBuffer
//         const messageObj = {
//           fileName: selectedFile.name,
//           time,
//           SelectedFile: new Uint8Array(fileBuffer), // Keep it as a Uint8Array
//         };
//         console.log("messageObj->", messageObj); 
//         socket.emit('file-upload', messageObj);
//         console.log("file-upload")
//         setMessages((prevMessages) => [...prevMessages, messageObj]);
//       };
//       reader.readAsArrayBuffer(selectedFile);
//     }
//   };

//   useEffect(() => {
//     socket.on('chat message', (msg) => {
//       setMessages((prevMessages) => [...prevMessages, { text: msg.text, sender: 'server', time: msg.time }]);
//     });

//     socket.on('file-upload_from_server', (msg) => {
//       console.log('msg',msg.fileName)
//       console.log("selectedfile",msg.SelectedFile)
//       setMessages((prevMessages) => [
//         ...prevMessages,
//         { text: msg.fileName, sender: 'server', time: msg.time,filedata:msg.selectedFile, isFile: true },
//       ]);
//     });

//     return () => {
//       socket.off('chat message');
//       socket.off('file-upload_from_server');
//     };
//   }, []);

//   return (
//     <div className="flex justify-center items-center h-screen bg-gray-900 p-4">
//       <div className="w-full lg:w-1/3 bg-white rounded-3xl shadow-2xl p-6 flex flex-col justify-between">
//         <h2 className="text-3xl font-bold text-gray-800 mb-4 text-center">Chat Room</h2>
//         <div className="flex-grow h-96 overflow-y-auto p-4 bg-gray-100 rounded-lg shadow-inner">
//           {messages.map((message, index) => (
//             <div
//               key={index}
//               className={`mb-4 flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
//               <div className="flex flex-col">
//                 <span className={`inline-block p-3 max-w-xs rounded-lg shadow-md text-sm 
//                   ${message.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-800'}`}>
//                   {message.isFile ? (
//                     <a href={`/uploads/${message.text}`} download={message.text}>
//                       {message.text}
//                     </a>
//                   ) : (
//                     message.text
//                   )}
//                 </span>
//                 <span className="text-xs text-gray-500 mt-1">{message.time}</span>
//               </div>
//             </div>
//           ))}
//         </div>
//         <div className="mt-4 flex items-center">
//           <input
//             type="text"
//             className="flex-grow p-3 border border-gray-300 rounded-l-lg focus:outline-none focus:border-indigo-500 transition-all duration-200"
//             placeholder="Type a message..."
//             value={newMessage}
//             onChange={(e) => setNewMessage(e.target.value)}
//             onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
//           />
//           <input
//             type="file"
//             onChange={(e) => setSelectedFile(e.target.files[0])}
//             className="border border-gray-300 rounded-lg p-2 ml-2 text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600 transition duration-200"
//           />
//           <button
//             onClick={handleFileUpload}
//             className="bg-blue-500 hover:bg-blue-600 text-white rounded-r-lg p-3 transition-all duration-200 flex items-center justify-center">
//             <FaPaperPlane size={20} />
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Chat;
'use client'
import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { FaPaperPlane } from 'react-icons/fa';

const socket = io('http://localhost:3001', { transports: ['websocket'] });

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const download=(msg)=>{
    console.log("clicked->",msg)
    // const buffer = Buffer.from(msg);
    // console.log("buffer",buffer)
    const nodeJSBuffer = {
      "type": "Buffer",
      "data": [255, 216, 255, 224, 0, 16, 74, 70, 73, 70, 0, 1, 1, 1, 0, 96, 0, 96, 0, 0, 255, 219, 0, 67, 0, 16, 11, 12, 14, 12, 10, 16, 14, 13, 14, 18, 17, 16, 19, 24, 41, 27, 24, 22, 22, 24, 50, 36, 38, 30, 41, 59, 52, 62, 61, 58, 52, 57, 56, 65, 73, 94, 80, 65, 69, 89, 70, 56, 57, 82, 111, 83, 89, 97, 100, 105, 106, 105, 63, 79, 115, 123, 114, 102, 122, 94, 103, 105, 101, 255, 219, 0, 67, 1, 17, 18, 18, 24, 21, 24,]
   }
   const buffer = Buffer.from(nodeJSBuffer);
   const blob = new Blob([buffer]);                  
   const url = window.URL.createObjectURL(blob);
   console.log("url",url)
   const a = document.createElement("a");
   document.body.appendChild(a);
   a.style = "display: none";
   a.href = url;
   a.download = "filename.JPG";
   a.click();
   window.URL.revokeObjectURL(url);
  }

// const blob = new Blob([buffer]);                      
// const url = window.URL.createObjectURL(blob);
// const a = document.createElement("a");
// document.body.appendChild(a);
// a.style = "display: none";
// a.href = url;
// a.download = "filename.pdf";
// a.click();
// window.URL.revokeObjectURL(url);



  const sendMessage = () => {
    if (newMessage.trim()) {
      const time = getCurrentTime();
      const messageObj = { text: newMessage, sender: 'user', time };

      socket.emit('chat message', messageObj);
      setMessages((prevMessages) => [...prevMessages, messageObj]);
      setNewMessage('');
    }
  };

  const handleFileUpload = async () => {
    console.log("selecteFile",selectedFile)
    if (selectedFile) {
      const time = getCurrentTime();
      const reader = new FileReader();
      reader.onloadend = () => {
        const fileBuffer = reader.result; // This is an ArrayBuffer
        const messageObj = {
          text: selectedFile.name,
          time,
          SelectedFile: new Uint8Array(fileBuffer), // Keep it as a Uint8Array
        };
        console.log("messageObj->", messageObj.SelectedFile); 
        socket.emit('file-upload', messageObj);
        setMessages((prevMessages) => [...prevMessages, messageObj]);
      };
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  useEffect(() => {
    socket.on('chat message', (msg) => {
      setMessages((prevMessages) => [...prevMessages, { text: msg.text, sender: 'server', time: msg.time }]);
      console.log("newmessages->",newMessage)
    });

    socket.on('file-upload_from_server', (msg) => {
      console.log('msg',msg)
      download(msg)
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: msg.text, sender: 'server', time: msg.time,filedata:msg.SelectedFile, isFile: true },
      ]);
      console.log("file-upload message",messages,newMessage)
    });

    return () => {
      socket.off('chat message');
      socket.off('file-upload_from_server');
    };
  }, []);

  return (
    <div className="flex justify-center items-center h-screen bg-gray-900 p-4">
      <div className="w-full lg:w-1/3 bg-white rounded-3xl shadow-2xl p-6 flex flex-col justify-between">
        <h2 className="text-3xl font-bold text-gray-800 mb-4 text-center">Chat Room</h2>
        <div className="flex-grow h-96 overflow-y-auto p-4 bg-gray-100 rounded-lg shadow-inner">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`mb-4 flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className="flex flex-col">
                <span className={`inline-block p-3 max-w-xs rounded-lg shadow-md text-sm 
                  ${message.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-800'}`}>
                  {message.isFile ? (
                    <button >
                      {message.text}
                    </button>
                  ) : (
                    message.text
                  )}
                </span>
                <span className="text-xs text-gray-500 mt-1">{message.time}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center">
          <input
            type="text"
            className="flex-grow p-3 border border-gray-300 rounded-l-lg focus:outline-none focus:border-indigo-500 transition-all duration-200"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          <input
            type="file"
            onChange={(e) => setSelectedFile(e.target.files[0])}
            className="border border-gray-300 rounded-lg p-2 ml-2 text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600 transition duration-200"
          />
          <button
            onClick={handleFileUpload}
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-r-lg p-3 transition-all duration-200 flex items-center justify-center">
            <FaPaperPlane size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;