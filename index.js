const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app);
const cors = require("cors");
app.use(cors());

let UserName = "";
const rooms = {};
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});
io.on("connection", (socket) => {
  socket.on("createRoom", (data) => {
    if (!rooms[data.roomName]) {
      rooms[data.roomName] = { users: [], sockets: [] };
      UserName = data.username;
      rooms[data.roomName].users.push({ name: data.username });
      rooms[data.roomName].sockets.push(socket.id);
      socket.join(data.roomName);
      const roomDetails = {
        rName: data.roomName,
        user: rooms[data.roomName].users,
      };
      io.to(data.roomName).emit("roomCreated", roomDetails);
    } else {
      io.to(socket.id).emit("roomAlreadyExist");
    }
  });
  socket.on("joinRoom", (roomName, username) => {
    let flag = 0;
    for (const eachroom in rooms) {
      if (eachroom == roomName) {
        flag = 1;
        break;
      }
    }
    if (flag == 1) {
      let flag2=0;
      for(let index=0;index<rooms[roomName].users.length;index++){
        if(rooms[roomName].users[index].name===`${username}`){
          flag2=1;
          io.to(socket.id).emit(
            "roomNotExist",
            "This username already exist so please make unique name."
          );
          break;
        }
      }
      if(flag2==0){
        rooms[roomName].users.push({ name: username });
        rooms[roomName].sockets.push(socket.id);
  
        UserName = username;
        socket.join(roomName);
        socket.in(roomName).emit("show-msg", {
          message: `${username} has joined the chat`,
          roomName: roomName,
          username: "Chat-Bot",
        });
        const roomDetails = { rName: roomName, user: rooms[roomName].users };
        io.to(roomName).emit("userJoined", roomDetails);
      }
    } else {
      io.to(socket.id).emit(
        "roomNotExist",
        "Room not exists by this name. you can create a new room."
      );
    }
  });
  socket.on("leaveRoom", (roomName, username) => {
    if (rooms[roomName]) {
      const index = rooms[roomName].sockets.indexOf(socket.id);
      if (index !== -1) {
        rooms[roomName].users.splice(index, 1);
        rooms[roomName].sockets.splice(index, 1);
        if (rooms[roomName].users.length == 0) {
          delete rooms[roomName];
        } else {
          socket.to(roomName).emit("leavedRoom", rooms[roomName].users);
        }
        socket.in(roomName).emit("show-msg", {
          message: `${username} has left the chat.`,
          roomName: roomName,
          username: "Chat-Bot",
        });
      }
    }
  });
  socket.on("deleteRoom", (data) => {
    if (rooms[data.roomName]) {
      if (socket.id == rooms[data.roomName].sockets[0]) {
        const size = rooms[data.roomName].users.length;
        for (let index = 0; index < size; index++) {
          io.to(rooms[data.roomName].sockets[0]).emit("roomDeleted");
          rooms[data.roomName].users.splice(0, 1);
          rooms[data.roomName].sockets.splice(0, 1);
        }
        if (rooms[data.roomName].users.length == 0) {
          delete rooms[data.roomName];
          const arr = [];
          io.to(data.roomName).emit("userleft", arr);
        } else {
          io.to(data.roomName).emit("userleft", rooms[data.roomName].users);
        }
      }
    }
  });
  socket.on("send-message", (data) => {
    socket.in(data.roomName).emit("show-msg", data);
  });
  socket.on("disconnect", () => {
    for (const roomName in rooms) {
      const index = rooms[roomName].sockets.indexOf(socket.id);
      if (index !== -1) {
        rooms[roomName].users.splice(index, 1);
        rooms[roomName].sockets.splice(index, 1);
        if (rooms[roomName].users.length == 0) {
          delete rooms[roomName];
        } else {
          io.to(roomName).emit("userleft", rooms[roomName].users);
        }
        socket.in(roomName).emit("show-msg", {
          message: `${UserName} has left the chat.`,
          roomName: roomName,
          username: "Chat-Bot",
        });
      }
    }
  });
});

server.listen(3001, () => {
  console.log(`Server runnning on port no 3001`);
});
