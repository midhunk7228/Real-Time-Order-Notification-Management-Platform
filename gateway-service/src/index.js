const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { authenticateToken } = require('./middleware/auth');
const proxyRoutes = require('./routes/proxyRoutes');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

app.use(limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'gateway-service',
    timestamp: new Date().toISOString()
  });
});

// Authentication middleware (applied to all routes except public ones)
app.use(authenticateToken);

// Proxy routes
app.use(proxyRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Gateway error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Gateway service running on port ${PORT}`);
  console.log(`Proxying requests to microservices`);
});

module.exports = app;
