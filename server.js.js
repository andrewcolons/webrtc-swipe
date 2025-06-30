// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let users = {}; // Store user data for matchmaking

// Serve static files (your HTML, JS, CSS)
app.use(express.static('public'));

// When a new user connects to the server
io.on('connection', (socket) => {
  console.log('User connected: ' + socket.id);

  // When a user submits their profile data
  socket.on('user-form', (data) => {
    users[socket.id] = data; // Store user profile
    console.log('User form received:', data);
    findMatch(socket); // Try to find a match
  });

  // Handling incoming WebRTC offer from a user
  socket.on('offer', (data) => {
    const { offer, to } = data;
    io.to(to).emit('offer', { offer, from: socket.id }); // Send offer to the other user
  });

  // Handling the incoming answer from the matched user
  socket.on('answer', (data) => {
    const { answer, to } = data;
    io.to(to).emit('answer', { answer }); // Send answer to the other user
  });

  // Handling ICE candidates (used for NAT traversal in WebRTC)
  socket.on('ice-candidate', (data) => {
    const { candidate, to } = data;
    io.to(to).emit('ice-candidate', { candidate }); // Send ICE candidate to the other user
  });

  // Clean up when a user disconnects
  socket.on('disconnect', () => {
    delete users[socket.id]; // Remove user from matchmaking pool
    console.log('User disconnected: ' + socket.id);
  });
});

// Function to find a match for the user based on gender and country
function findMatch(socket) {
  for (let userId in users) {
    if (userId !== socket.id) { // Don't match the user with themselves
      // Check if their preferences match
      const user = users[socket.id];
      const potentialMatch = users[userId];

      if (
        (user.preferredGender === potentialMatch.gender || user.preferredGender === 'either') &&
        user.country === potentialMatch.country
      ) {
        // Notify both users about the match
        io.to(socket.id).emit('match-found', { matchId: userId });
        io.to(userId).emit('match-found', { matchId: socket.id });
        break; // Exit after finding the first match
      }
    }
  }
}

// Start the server and listen for connections
server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
