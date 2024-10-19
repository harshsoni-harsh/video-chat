"use client";
import { useState, useEffect, useRef } from "react";
import io from 'socket.io-client'; // Import socket.io-client
import Card from './sign-in/card';
import { Camera, Mic, Phone, Share, Video, MessageCircle, Send, Upload, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Component() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("fileSharing");
  const [files, setFiles] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const socket = useRef(null);

  const router = useRouter();
  const handlesign_up = () => {
    router.push("/sign-up");
  };
  const handlesign_in = () => {
    router.push("/sign-in");
  };

  const handlechatroom = () => {
    router.push("/chat")
  }

  useEffect(() => {
    // Connect to the Socket.io server
    socket.current = io('http://localhost:3001'); // Adjust to your server address

    // Listen for chat messages from the server
    socket.current.on('chat message', (msg) => {
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: msg, sender: "server" },
      ]);
    });

    // Cleanup on component unmount
    return () => {
      socket.current.disconnect();
    };
  }, []);

  const handleFileUpload = (event) => {
    const newFiles = Array.from(event.target.files).map((file) => file.name);
    setFiles([...files, ...newFiles]);
  };

  const removeFile = (index) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
  };

  const sendMessage = () => {
    if (newMessage.trim()) {
      socket.current.emit('chat message', newMessage); // Send message to Socket.io server
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: newMessage, sender: "user" },
      ]);
      setNewMessage("");
    }
  };

  const toggleChat = () => setIsChatOpen(!isChatOpen);

  return (
    <div className="flex flex-col lg:flex-row w-full max-w-7xl mx-auto p-4 transition-all duration-300 ease-in-out">
      <div className={`bg-red rounded-3xl shadow-lg p-4 transition-all duration-300 ease-in-out ${isChatOpen ? 'lg:w-2/3' : 'w-full'}`}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="md:w-1/3 space-y-4">
            <div className="bg-white p-4 rounded-xl shadow">
              <h2 className="text-2xl font-bold mb-2">File Sharing</h2>
              <p className="text-sm text-gray-500 mb-4">Upload and manage your files</p>
              <label className="w-full bg-teal-500 hover:bg-teal-600 text-white py-2 px-4 rounded-lg cursor-pointer inline-block text-center">
                <input type="file" className="hidden" onChange={handleFileUpload} multiple />
                <Upload className="inline-block mr-2" size={16} />
                Upload Files
              </label>
            </div>
            <div className="bg-white p-4 rounded-xl shadow">
              <h3 className="font-semibold mb-2">Uploaded Files</h3>
              <ul className="space-y-2">
                {files.map((file, index) => (
                  <li key={index} className="flex justify-between items-center">
                    <span className="truncate">{file}</span>
                    <button onClick={() => removeFile(index)} className="text-red-500">
                      <X size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="md:w-2/3 space-y-4">
            <div className="aspect-video bg-gray-700 rounded-xl relative">
              <div className="absolute top-2 right-2 bg-gray-200 rounded-md p-1">
                <div className="w-8 h-8 bg-gray-400 rounded-full"></div>
              </div>
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
                {[Mic, Video, Phone, Share, Camera].map((Icon, index) => (
                  <button key={index} className={`p-2 rounded-full ${index === 2 ? 'bg-red-500' : 'bg-gray-500'} text-white`}>
                    <Icon size={16} />
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow">
              <h3 className="text-lg font-semibold mb-2">Video Conference History</h3>
              <ul className="space-y-2">
                {["Team Meeting", "Project Review", "Client Call", "Weekly Sync"].map((item, index) => (
                  <li key={index} className="flex justify-between items-center">
                    <span>{item}</span>
                    <span className="text-blue-500">{index === 0 ? "Today" : `${index + 1} days ago`}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="flex justify-between mt-4">
          <button className="py-2 px-4 bg-white text-gray-800 rounded-lg border border-gray-300 hover:bg-gray-100" onClick={handlesign_in}>Sign In</button>
          <button onClick={toggleChat} className="py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center">
            <MessageCircle className="mr-2" size={16} />
            <span>Chat</span>
          </button>
          <button className="py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg" onClick={handlesign_up}>Sign Up</button>
        </div>
      </div>
      {isChatOpen && (
        <div className="w-full lg:w-1/3 mt-4 lg:mt-0 lg:ml-4 bg-white rounded-3xl shadow-lg p-4 transition-all duration-300 ease-in-out">
          <h2 className="text-2xl font-bold mb-4">Chat</h2>
          <div className="h-96 overflow-y-auto mb-4 p-4 bg-gray-100 rounded-lg">
            {messages.map((message, index) => (
              <div key={index} className={`mb-2 ${message.sender === "user" ? "text-right" : "text-left"}`}>
                <span className={`inline-block p-2 rounded-lg ${message.sender === "user" ? "bg-blue-500 text-white" : "bg-gray-300"}`}>
                  {message.text}
                </span>
              </div>
            ))}
          </div>
          <div className="flex">
            <input
              type="text"
              className="flex-grow mr-2 p-2 border border-gray-300 rounded-lg"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button onClick={sendMessage} className="p-2 bg-blue-500 text-white rounded-lg">
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
      
      <Card />
    </div>
  );
}
