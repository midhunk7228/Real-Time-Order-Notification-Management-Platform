const express = require('express');
const http = require('http');
const cors = require('cors');
const pool = require('./db/connection');
const fs = require('fs');
const path = require('path');
const orderRoutes = require('./routes/orderRoutes');
const { initialize: initWebSocket } = require('./websocket/server');
const { connect: connectRedis } = require('./redis/client');
const { connect: connectKafka } = require('./kafka/producer');

require('dotenv').config();

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 3002;

// Initialize WebSocket
initWebSocket(httpServer);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'order-service' });
});

// Routes
app.use('/orders', orderRoutes);

// Initialize database schema
const initializeDatabase = async () => {
  try {
    const schemaPath = path.join(__dirname, 'db', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('Database schema initialized');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

// Start server
const startServer = async () => {
  try {
    await initializeDatabase();
    await connectRedis();
    await connectKafka();
    
    httpServer.listen(PORT, () => {
      console.log(`Order service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
