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
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  verify: () => api.get('/auth/verify'),
};

export const orderAPI = {
  create: (data) => api.post('/orders/create', data),
  get: (id) => api.get(`/orders/${id}`),
  getAll: (params) => api.get('/orders', { params }),
};

export const inventoryAPI = {
  getProducts: () => api.get('/inventory/products'),
  getStock: (productId) => api.get(`/inventory/stock/${productId}`),
};

export default api;
