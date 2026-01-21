const { Server } = require('socket.io');
const { ORDER_EVENTS } = require('../../../shared/src/events/schemas');

let io = null;

const initialize = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Join order room for real-time updates
    socket.on('join-order', (orderId) => {
      socket.join(`order:${orderId}`);
      console.log(`Client ${socket.id} joined order:${orderId}`);
    });

    // Leave order room
    socket.on('leave-order', (orderId) => {
      socket.leave(`order:${orderId}`);
      console.log(`Client ${socket.id} left order:${orderId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  console.log('WebSocket server initialized');
  return io;
};

const emitOrderUpdate = (orderId, orderData) => {
  if (io) {
    io.to(`order:${orderId}`).emit('order-update', {
      orderId,
      ...orderData,
      timestamp: new Date().toISOString()
    });
    // Also emit to admin room
    io.to('admin').emit('order-update', {
      orderId,
      ...orderData,
      timestamp: new Date().toISOString()
    });
  }
};

const emitOrderStatusChange = (orderId, status, metadata = {}) => {
  if (io) {
    io.to(`order:${orderId}`).emit('order-status-change', {
      orderId,
      status,
      ...metadata,
      timestamp: new Date().toISOString()
    });
    // Also emit to admin room
    io.to('admin').emit('order-status-change', {
      orderId,
      status,
      ...metadata,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  initialize,
  emitOrderUpdate,
  emitOrderStatusChange
};
