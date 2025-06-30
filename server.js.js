const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const waiting = {}; // { room: socketId }

io.on('connection', socket => {
  console.log('New connection:', socket.id);

  socket.on('join-room', (room) => {
    console.log(`${socket.id} wants to join room ${room}`);

    if (waiting[room]) {
      const partner = waiting[room];
      delete waiting[room];

      socket.join(room);
      io.sockets.sockets.get(partner)?.join(room);

      io.to(room).emit('room-ready');
    } else {
      waiting[room] = socket.id;
      socket.join(room);
      socket.emit('waiting');
    }
  });

  socket.on('leave-room', (room) => {
    socket.leave(room);
    console.log(`${socket.id} left room ${room}`);
    if (waiting[room] === socket.id) delete waiting[room];
  });

  socket.on('signal', ({ room, data }) => {
    socket.to(room).emit('signal', { data });
  });

  socket.on('disconnect', () => {
    console.log('Disconnected:', socket.id);
    for (const r in waiting) {
      if (waiting[r] === socket.id) delete waiting[r];
    }
  });
});

server.listen(3000, () => console.log('Server running on http://localhost:3000'));



