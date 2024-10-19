'use client';
import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { FaPaperPlane } from 'react-icons/fa';

// Establish socket connection
const socket = io('http://localhost:3001', {
  transports: ['websocket'],
});

const Chat = () => {
    const [messages, setMessages] = useState([]); 
    const [newMessage, setNewMessage] = useState("");

    const getCurrentTime = () => {
        const now = new Date();
        return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); // Format: HH:MM
    };

    // Send the message to the server
    const sendMessage = () => {
        if (newMessage.trim()) {
            const time = getCurrentTime();
            const messageObj = { text: newMessage, sender: "user", time };

            socket.emit('chat message', messageObj);  // Emit message to the server
            setMessages((prevMessages) => [
                ...prevMessages,
                messageObj,  // Append the user's message with time
            ]);
            setNewMessage("");  // Clear input after sending
        }
    };

    useEffect(() => {
        // Listen for incoming messages from the server
        socket.on('chat message', (msg) => {
            setMessages((prevMessages) => [
                ...prevMessages,
                { text: msg.text, sender: "server", time: msg.time },  // Append server messages with time
            ]);
        });

        return () => {
            socket.off('chat message');  // Clean up the socket on component unmount
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
                                    {message.text}
                                </span>
                                <span className="text-xs text-gray-500 mt-1">
                                    {message.time}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-4 flex">
                    <input
                        type="text"
                        className="flex-grow p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 transition-all duration-200"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    />
                    <button 
                        onClick={sendMessage} 
                        className="ml-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-3 transition-all duration-200 flex items-center justify-center">
                        <FaPaperPlane size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Chat;
