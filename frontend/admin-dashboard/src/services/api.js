import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  verify: () => api.get('/auth/verify'),
};

export const orderAPI = {
  getAll: (params) => api.get('/orders', { params }),
  get: (id) => api.get(`/orders/${id}`),
  updateStatus: (id, data) => api.put(`/orders/${id}/status`, data),
};

export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getOrdersPerDay: (days) => api.get('/analytics/orders-per-day', { params: { days } }),
  getRevenue: (days) => api.get('/analytics/revenue', { params: { days } }),
  getStatusDistribution: () => api.get('/analytics/status-distribution'),
};

export default api;
