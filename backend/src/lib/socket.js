'use strict';

const { Server } = require('socket.io');

let io = null;

function initSocket(httpsServer, corsOrigins) {
  io = new Server(httpsServer, {
    cors: {
      origin: corsOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    // Client tells us which user they are → join personal room
    socket.on('join', (userId) => {
      if (userId) socket.join(`user:${userId}`);
    });
    // Join institution room for institution-wide broadcasts
    socket.on('joinInstitution', (institutionId) => {
      if (institutionId) socket.join(`institution:${institutionId}`);
    });
    // Join role room (me_officer, admin, etc.)
    socket.on('joinRole', (role) => {
      if (role) socket.join(`role:${role}`);
    });
  });

  return io;
}

function getIo() {
  return io; // may be null before init; callers should guard
}

// Convenience emitters
function emitToUser(userId, event, data) {
  if (io && userId) io.to(`user:${userId}`).emit(event, data);
}

function emitToRole(role, event, data) {
  if (io && role) io.to(`role:${role}`).emit(event, data);
}

function emitToInstitution(institutionId, event, data) {
  if (io && institutionId) io.to(`institution:${institutionId}`).emit(event, data);
}

function emitGlobal(event, data) {
  if (io) io.emit(event, data);
}

module.exports = { initSocket, getIo, emitToUser, emitToRole, emitToInstitution, emitGlobal };
