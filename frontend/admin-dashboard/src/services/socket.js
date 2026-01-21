import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3002';

let socket = null;

export const connectSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
    });
    
    socket.on('connect', () => {
      console.log('Connected to WebSocket');
      socket.emit('join-order', 'admin'); // Join admin room
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const onOrderUpdate = (callback) => {
  if (socket) {
    socket.on('order-update', callback);
    socket.on('order-status-change', callback);
  }
};

export const offOrderUpdate = () => {
  if (socket) {
    socket.off('order-update');
    socket.off('order-status-change');
  }
};

export default socket;
