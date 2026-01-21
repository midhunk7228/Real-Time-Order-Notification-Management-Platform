import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3002';

let socket = null;

export const connectSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
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

export const joinOrderRoom = (orderId) => {
  if (socket) {
    socket.emit('join-order', orderId);
  }
};

export const leaveOrderRoom = (orderId) => {
  if (socket) {
    socket.emit('leave-order', orderId);
  }
};

export const onOrderUpdate = (callback) => {
  if (socket) {
    socket.on('order-update', callback);
  }
};

export const onOrderStatusChange = (callback) => {
  if (socket) {
    socket.on('order-status-change', callback);
  }
};

export const offOrderUpdate = () => {
  if (socket) {
    socket.off('order-update');
  }
};

export const offOrderStatusChange = () => {
  if (socket) {
    socket.off('order-status-change');
  }
};

export default socket;
