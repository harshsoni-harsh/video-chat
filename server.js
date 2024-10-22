import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs'
import multer from 'multer'
import path from 'path'
import {fileURLToPath} from 'url'

const __filename = fileURLToPath(import.meta.url); // Get the current file path
const __dirname = path.dirname(__filename); 


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
    console.log("msg",msg)
    const messageWithTime = {
      text: msg.text,  // Message text
      sender: msg.sender || 'unknown',  
      time: getCurrentTime(),  
    };

    console.log(`Message from ${socket.id}:`, messageWithTime);

    socket.broadcast.emit('chat message', messageWithTime);
  });

//   socket.on('file-upload',  (data) => {
//     console.log("file-upload",data)
//     const { fileName,time, SelectedFile } = data;
   
//     const a= upload.single('uploaded_file')
//     console.log("a",a)
//     const apath=path.join(__dirname, 'upload')
//       fs.writeFile("/upload/he.img", SelectedFile, (err) => {
//       //callback({ message: err ? "failure" : "success" });
//       });
// // const dat=SelectedFile.tostring()
// // console.log("dat",dat)
    
//     socket.broadcast.emit('file-upload', SelectedFile);
//   });


socket.on("file-upload", (file) => {
  console.log("file",file)
  const { text, time, SelectedFile } = file;
  console.log(text,"time", time, SelectedFile)
//   const uploadPath = path.join(__dirname, 'uploads');
// console.log(uploadPath)
  // if (!fs.existsSync(uploadPath)) {
  //   fs.mkdirSync(uploadPath);
  // }

  //  const filePath = path.join(uploadPath, text);

  // // Save the file to the uploads directory
  const filePath_for_writein_file = path.join(__dirname, 'uploads')
  
  // fs.writeFileSync(`${filePath_for_writein_file}/${text}`, SelectedFile, (err) => {
  //   if (err) {
  //     console.error('Error saving file:', err);
  //     socket.emit('file-upload-error', 'File upload failed');
  //     return;
  //   }

  //   console.log(`File saved: ${filePath_for_writein_file}`);
  //    socket.emit('file-upload-success', 'File uploaded successfully');
  // })

  //   // Broadcast the file upload event to other clients
  const filePath=path.join(__dirname, 'uploads',`${text}`)
console.log("filepath->",filePath)

 fs.readFile(filePath, (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
    }
    console.log("dat1",data)
    const file2 = {
      text:text ,
      time:time,
      SelectedFile: data, 
    };
    console.log("file2",file2)
    socket.broadcast.emit('file-upload_from_server', file2);

  })

  
  // const blobData = new Blob(SelectedFile, { type: 'image/JPG' });
//  const datatotransfer= new Uint8Array(SelectedFile)
  // console.log("blob",blobData)
  // console.log(file2.SelectedFile)
   //});
});



  socket.on('disconnect', () => {
    console.log(`A user disconnected: ${socket.id}`);
  });
});

server.listen(3001, () => {
  console.log('Server is running on port 3001');
});




// const download=(msg)=>{
  // const blob = new Blob([msg.SelectedFile], { type: 'application/octet-stream' });
  // const url = window.URL.createObjectURL(blob);
  // const link = document.createElement('a');
  // link.href = url;
  // link.setAttribute('download', msg.fileName);
  // document.body.appendChild(link);
  // link.click();
  // link.remove();
  // window.URL.revokeObjectURL(url);
// }