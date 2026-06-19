let io;

module.exports = {
  init: (server) => {
    const { Server } = require('socket.io');
    io = new Server(server, {
      cors: {
        origin: '*', // Adjust as needed
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
      }
    });

    io.on('connection', (socket) => {
      console.log('New socket connection:', socket.id);
      
      // Clients can join rooms based on their user ID to receive direct notifications
      socket.on('joinRoom', (userId) => {
        socket.join(userId);
        console.log(`Socket ${socket.id} joined room ${userId}`);
      });
      
      socket.on('disconnect', () => {
        console.log('Socket disconnected:', socket.id);
      });
    });

    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error('Socket.io not initialized!');
    }
    return io;
  }
};
