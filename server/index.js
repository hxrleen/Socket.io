const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const crypto = require('crypto');


const app = express();
const httpServer = http.createServer(app);
const io = socketIo(httpServer, {
  cors: { origin: '*' }
});

const port = 3000;
let users = {};
let rooms = {};


io.on('connection', (socket) => {
  console.log('a user connected');


  // Assign a default name or prompt for the user to set their name
  users[socket.id] = `User${socket.id.substr(0, 2)}`; // Default name
  io.emit('users', users);   // Emit the users list to all clients

  // Handle receiving a new message
  socket.on('message', (message) => {
    const roomId = users[socket.id].room;
    console.log('Message received:', message);
    io.emit('message', `${users[socket.id]}: ${message}`);
  });



  const generateRoomId = () => {
    return crypto.randomBytes(4).toString('hex');
  };


  //create room
  socket.on('createRoom', () => {
    const roomId = generateRoomId();
    rooms[roomId] = [socket.id];
    users[socket.id].room = roomId;
    socket.join(roomId);
    users[socket.id] = { name: `User${socket.id.substr(0, 2)}`, room: roomId };
    socket.emit('roomCreated', roomId);
    io.to(roomId).emit('users', rooms[roomId].map(id => users[id])); // Emit the users list to the room
  })



  // Handle joining an existing room
  // socket.on('joinRoom', (roomId) => {
  //   socket.join(roomId);
  //   users[socket.id] = { name: `User${socket.id.substr(0, 2)}`, room: roomId };
  //   io.to(roomId).emit('users', getUsersInRoom(roomId)); // Emit the users list to the room
  // });


  socket.on('joinRoom', (roomId, callback) => {
    if (rooms[roomId]) {
      rooms[roomId].push(socket.id); // Add the user to the room
      users[socket.id].room = roomId;
      socket.join(roomId);
      io.to(roomId).emit('users', rooms[roomId].map(id => users[id])); // Emit the user list to the room
      callback(true); // Notify the client that the join was successful
    } else {
      callback(false); // Notify the client that the room was not found
    }
  });


  // Handle buzzer press
  socket.on('buzzer', () => {
    const roomId = users[socket.id].room;
    const timestamp = new Date().toLocaleTimeString();
    io.emit('buzzer', { name: users[socket.id], timestamp });
  });


  // Handle setting a custom name for the user
  socket.on('setName', (name) => {
    if (name && name.trim()) {
      users[socket.id] = name;
      // const roomId = Object.keys(rooms).find(roomId => rooms[roomId].includes(socket.id));
      const roomId = users[socket.id].room;

      console.log(roomId);
      // io.to(roomId).emit('users', rooms[roomId].map(id => users[id])); // Update user list for the room
      io.emit('users', users);
    }
  });


  const getUsersInRoom = (roomId) => {
    return Object.fromEntries(Object.entries(users).filter(([id, user]) => user.room === roomId));
  };

  // Handle user disconnection
  socket.on('disconnect', () => {
    console.log('a user disconnected!');
    const roomId = users[socket.id]?.room;
    delete users[socket.id];
    if (roomId) {
      io.to(roomId).emit('users', getUsersInRoom(roomId)); // Update all clients in the room with the user list after a disconnection
    }
  });



});

httpServer.listen(port, () => console.log(`listening on port ${port}`));
