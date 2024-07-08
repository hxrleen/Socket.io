const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const httpServer = http.createServer(app);
const io = socketIo(httpServer, {
  cors: { origin: '*' }
});

const port = 3000;
let users = {};

io.on('connection', (socket) => {
  console.log('a user connected');

  // Assign a default name or prompt for the user to set their name
  users[socket.id] = `User${socket.id.substr(0, 2)}`; // Default name, can be customized
  io.emit('users', users); // Emit the users list to all clients

  // Handle receiving a new message
  socket.on('message', (message) => {
    console.log('Message received:', message);
    io.emit('message', `${users[socket.id]}: ${message}`);
  });

  // Handle buzzer press
  socket.on('buzzer', () => {
    const timestamp = new Date().toLocaleTimeString();
    io.emit('buzzer', { name: users[socket.id], timestamp });
  });

  // Handle setting a custom name for the user
  socket.on('setName', (name) => {
    if (name && name.trim()) {
      users[socket.id] = name;
      io.emit('users', users); // Update all clients with the new user list
    }
  });

  // Handle user disconnection
  socket.on('disconnect', () => {
    console.log('a user disconnected!');
    delete users[socket.id];
    io.emit('users', users); // Update all clients with the user list after a disconnection
  });
});

httpServer.listen(port, () => console.log(`listening on port ${port}`));
