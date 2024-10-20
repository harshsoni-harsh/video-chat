'use client';
import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { FaPaperPlane } from 'react-icons/fa';


const socket = io('http://localhost:3001', {
  transports: ['websocket'],
});

  

const Chat = () => {
    const [messages, setMessages] = useState([]); 
    const [newMessage, setNewMessage] = useState("");
    const [SelectedFile,setSelectedFile] = useState(null); 

    const getCurrentTime = () => {
        const now = new Date();
        return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); 
    };

    const sendMessage = () => {
        if (newMessage.trim()) {
            const time = getCurrentTime();
            const messageObj = { text: newMessage, sender: "user", time };

            socket.emit('chat message', messageObj);  
            setMessages((prevMessages) => [
                ...prevMessages,
                messageObj,  
            ]);
            setNewMessage("");  
        }
    };

    // Handle file upload
    const handleFileUpload = (event) => {
        console.log("selectFile->",SelectedFile)
       
        if (SelectedFile) {
            const time = getCurrentTime();
            const messageObj={fileName:SelectedFile.name,time,SelectedFile}
            socket.emit('file-upload', messageObj);
                  setMessages((prevMessages) => [
                    ...prevMessages,
                    messageObj,  
                ]);
           // const reader = new FileReader();
            // console.log("reader",reader.onloadend)
            // reader.onloadend = () => {
            //     const fileData = reader.result.split(',')[1]; 
            //     console.log("fileData",fileData)
            //     const messageObj = {
            //         text: SelectedFile.name,
            //         sender: "user",
            //         time,
            //         SelectedFile,
            //         isFile: true, // Flag to indicate this message is a file
            //     };
            //     socket.emit('file-upload', messageObj); // Emit file upload to the server
            //     setMessages((prevMessages) => [
            //         ...prevMessages,
            //         messageObj,  // Append the user's file message with time
            //     ]);
            // };
            // reader.readAsDataURL(selectedFile); // Read file as Data URL

            //setFile(null); 
        }
    };

    useEffect(() => {
        socket.on('chat message', (msg) => {
            setMessages((prevMessages) => [
                ...prevMessages,
                { text: msg.text, sender: "server", time: msg.time }, 
            ]);
        });

        socket.on('file-upload', (msg) => {
            console.log("msg",msg)
            setMessages((prevMessages) => [
                ...prevMessages,
                { text: msg.text, sender: "server", time: msg.time, fileData: msg.fileData, isFile: true },
            ]);
        });

        return () => {
            socket.off('chat message'); 
            socket.off('file-upload');    
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
                            className={`mb-4 flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                            <div className="flex flex-col">
                                <span className={`inline-block p-3 max-w-xs rounded-lg shadow-md text-sm 
                                    ${message.sender === "user" ? "bg-blue-500 text-white" : "bg-gray-300 text-gray-800"}`}>
                                    {message.isFile ? (
                                        <a href={`data:application/octet-stream;base64,${message.fileData}`} download={message.text}>
                                            {message.text}
                                        </a>
                                    ) : (
                                        message.text
                                    )}
                                </span>
                                <span className="text-xs text-gray-500 mt-1">
                                    {message.time}
                                </span>
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
                        name='uploaded_file'
                        className="border border-gray-300 rounded-lg p-2 ml-2 text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600 transition duration-200"
                    />
                     <button 
                        onClick={handleFileUpload}
                        className="bg-blue-500 hover:bg-blue-600 text-white rounded-r-lg p-3 transition-all duration-200 flex items-center justify-center">
                        <FaPaperPlane size={20} />
                    </button>
                    <button 
                        onClick={sendMessage} 
                        className="bg-blue-500 hover:bg-blue-600 text-white rounded-r-lg p-3 transition-all duration-200 flex items-center justify-center">
                        <FaPaperPlane size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Chat;
