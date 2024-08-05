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
let users = {};  // Stores user data
let rooms = {};  // Stores active rooms
let roomHosts = {};  // Maps roomId to host socket ID
let roomConfigs = {}; // Stores room configuration (single or multiple buzzing)
let userBuzzes = {}; // Tracks if a user has already buzzed in single buzz rooms
let buzzerEvents = {}; // Tracks buzzer events for each room
let roomRounds = {}; // Stores round information for each room

let currentRound = 1;

io.on('connection', (socket) => {
  console.log(`A user connected: ${socket.id}`);

  // Set default name
  users[socket.id] = { id: socket.id, name: `User${socket.id.substr(0, 2)}`, isHost: false };

  socket.on('message', (message) => {
    console.log(`Message received: ${message}`);
    const roomId = getRoomIdForSocket(socket.id);
    if (roomId) {
      io.to(roomId).emit('message', `${users[socket.id].name}: ${message}`); // Use user name
    }
  });

  socket.on('createRoom', (buzzMode) => { // Accept buzz mode (single/multiple)
    const roomId = crypto.randomBytes(3).toString('hex'); // Generate a random room ID
    rooms[roomId] = [socket.id]; // Store the room with the creator's socket ID
    roomHosts[roomId] = socket.id; // Set the creator as the host
    users[socket.id].isHost = true; // Mark the user as host
    roomConfigs[roomId] = buzzMode; // Set the room configuration
    buzzerEvents[roomId] = []; // Initialize buzzer events array
    roomRounds[roomId] = { totalRounds: 0, currentRound: 0 }; // Initialize round information
    socket.join(roomId);
    socket.emit('roomCreated', roomId); // Emit the roomId only to the creator
    emitRoomUsers(roomId); // Emit the user list to the room
  });

  socket.on('joinRoom', (roomId, callback) => {  
    if (roomId && rooms[roomId]) {
      if (!rooms[roomId].includes(socket.id)) {
        rooms[roomId].push(socket.id);
      }
      socket.join(roomId);
      emitRoomUsers(roomId);
      socket.emit('currentState', {
        users: rooms[roomId].map(id => ({ id, name: users[id].name, isHost: roomHosts[roomId] === id })),
        buzzerEvents: buzzerEvents[roomId]
      });

      socket.emit('notification', `Welcome ${users[socket.id].name}, you are now in room ${roomId}`);
      if (roomHosts[roomId] === socket.id) {
        socket.emit('notification', 'You are the host');
      }
      callback(true);
    } else {
      callback(false);
    }
  });

  socket.on('buzzer', () => {
    const timestamp = new Date().toLocaleTimeString();
    const roomId = getRoomIdForSocket(socket.id);
    if (roomId) {
      if (roomConfigs[roomId] === 'single' && userBuzzes[socket.id]) {
        socket.emit('notification', 'You can only buzz once in this room.');
      } else {
        const event = { name: users[socket.id].name, timestamp };
        io.to(roomId).emit('buzzer', event); // Use user name
        buzzerEvents[roomId].push(event); // Save the event
        if (roomConfigs[roomId] === 'single') {
          userBuzzes[socket.id] = true; // Mark user as buzzed
        }
      }
    }
  });

  socket.on('setName', (name) => {
    if (name && name.trim()) {
      users[socket.id].name = name; // Update the user's name
      const roomId = getRoomIdForSocket(socket.id);
      if (roomId) {
        emitRoomUsers(roomId); // Emit the updated user list to the room
      }
    }
  });

  socket.on('leaveRoom', () => {
    const roomId = getRoomIdForSocket(socket.id);
    if (roomId) {
      if (users[socket.id].isHost) {
        socket.emit('hostLeaveRoomAttempt', `${users[socket.id].name}, you are the host. You cannot leave the room without closing it.`);
      } else {
        rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
        emitRoomUsers(roomId); // Emit the updated user list to the room
        io.to(roomId).emit('notification', `${users[socket.id].name} has left the room`); // Notify others

        if (rooms[roomId].length === 0) {
          delete rooms[roomId]; // Remove the room if it's empty
          delete roomHosts[roomId]; // Remove the room host mapping
          delete roomConfigs[roomId]; // Remove the room configuration
          delete buzzerEvents[roomId];
          delete roomRounds[roomId]; // Remove round information
        }

        delete users[socket.id]; // Remove user from user list
        delete userBuzzes[socket.id]; // Clear buzzed state
        socket.leave(roomId); // Ensure the socket leaves the room
        socket.emit('leaveRoom', 'success'); // Acknowledge successful leave
      }
    }
  });

  socket.on('closeRoom', () => {
    const roomId = getRoomIdForSocket(socket.id);
    if (roomId && users[socket.id].isHost) {
      io.to(roomId).emit('roomClosed', 'The room has been closed by the host.');
      rooms[roomId].forEach(id => {
        delete users[id];
        delete userBuzzes[id];
      });
      delete rooms[roomId];
      delete roomHosts[roomId];
      delete roomConfigs[roomId];
      delete buzzerEvents[roomId];
      delete roomRounds[roomId];
      io.to(roomId).socketsLeave(roomId);
    }
  });

  socket.on('disconnect', () => {
    console.log(`A user disconnected: ${socket.id}`);
    const roomId = getRoomIdForSocket(socket.id);
    if (roomId) {
      rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
      emitRoomUsers(roomId); // Emit the updated user list to the room
      io.to(roomId).emit('notification', `${users[socket.id].name} has left the room`); // Notify others
      if (rooms[roomId].length === 0) {
        delete rooms[roomId]; // Remove the room if it's empty
        delete roomHosts[roomId]; // Remove the room host mapping
        delete roomConfigs[roomId]; // Remove the room configuration
        delete buzzerEvents[roomId];
        delete roomRounds[roomId]; // Remove round information
      }
    }
    delete users[socket.id]; // Remove user from user list
    delete userBuzzes[socket.id]; // Clear buzzed state
  });

  socket.on('startTimer', (roomId) => {
    io.to(roomId).emit('startTimer', 30); // Emit to all clients in the room to start a 30-second timer
  });



  socket.on('timerEnded', (roomId) => {
    io.to(roomId).emit('timerEnded'); // Notify all clients in the room that the timer has ended
    currentRound += 1; // Increment round after the timer ends
    io.to(roomId).emit('updateRound', currentRound); // Notify clients of the new round
    userBuzzes = {}; // Reset buzzer press state for the new round
  });

  socket.on('setGameRounds', (roomId, totalRounds) => {
    if (roomId && users[socket.id].isHost && Number.isInteger(totalRounds)) {
      roomRounds[roomId].totalRounds = totalRounds;
      roomRounds[roomId].currentRound = 0; // Reset current round
      io.to(roomId).emit('gameRoundsSet', totalRounds); // Notify all clients in the room
    }
  });

  socket.on('startRound', (roomId) => {
    if (roomId && users[socket.id].isHost) {
      if (roomRounds[roomId].currentRound < roomRounds[roomId].totalRounds) {
        roomRounds[roomId].currentRound += 1;
        io.to(roomId).emit('roundStarted', roomRounds[roomId].currentRound); // Notify all clients in the room
      } else {
        socket.emit('notification', 'All rounds have been completed.');
      }
    }
  });

  socket.on('endRound', (roomId) => {
    if (roomId && users[socket.id].isHost) {
      io.to(roomId).emit('roundEnded', roomRounds[roomId].currentRound); // Notify all clients in the room
      if (roomRounds[roomId].currentRound === roomRounds[roomId].totalRounds) {
        io.to(roomId).emit('gameEnded'); // Notify all clients in the room that the game has ended
      }
    }
  });
});

// Emit users in a specific room
function emitRoomUsers(roomId) {
  if (!rooms[roomId]) return;

  io.to(roomId).emit('users', rooms[roomId].map(id => ({
    id,
    name: users[id].name,
    isHost: roomHosts[roomId] === id
  })));
}

// Helper function to get the room ID for a given socket ID
function getRoomIdForSocket(socketId) {
  return Object.keys(rooms).find(roomId => rooms[roomId].includes(socketId));
}

httpServer.listen(port, () => console.log(`Listening on port ${port}`));
