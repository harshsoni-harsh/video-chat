import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs'
import multer from 'multer'

const app = express();
const server = http.createServer(app);
const io = new Server(server, {cors: {
  origin: "http://localhost:3000",  
  methods: ["GET", "POST"],
  credentials: true,
}});

app.use(express.static('public'));
const corsOptions = {
  origin: 'http://localhost:3000',
  methods: 'GET,POST',
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));
const upload = multer({ dest: 'uploads/' }); 

const getCurrentTime = () => {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); // Format: HH:MM
};

io.on('connection', (socket) => {
  console.log(`A user connected: ${socket.id}`);

  // Emit a welcome message to the client
  socket.emit('welcome', { message: 'Welcome to the chat!', time: getCurrentTime() });
  

  // Handle incoming chat messages from clients
  socket.on('chat message', (msg) => {
    const messageWithTime = {
      text: msg.text,  // Message text
      sender: msg.sender || 'unknown',  
      time: getCurrentTime(),  
    };

    console.log(`Message from ${socket.id}:`, messageWithTime);

    socket.broadcast.emit('chat message', messageWithTime);
  });

  socket.on('file-upload', (data) => {
    console.log("file-upload",data)
    const { fileName,time, SelectedFile } = data;
   // const arra=arrayBufferToBase64(SelectedFile)
   // console.log(fileName,SelectedFile)
  //  const a=upload.single('uploaded_file')
  //  console.log("a",a)
    console.log("buf",SelectedFile);
    socket.broadcast.emit('file-upload', SelectedFile);
  });

  socket.on('disconnect', () => {
    console.log(`A user disconnected: ${socket.id}`);
  });
});

server.listen(3001, () => {
  console.log('Server is running on port 3001');
});
