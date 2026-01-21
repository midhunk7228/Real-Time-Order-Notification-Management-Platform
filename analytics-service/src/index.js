const express = require('express');
const cors = require('cors');
const pool = require('./db/connection');
const fs = require('fs');
const path = require('path');
const analyticsRoutes = require('./routes/analyticsRoutes');
const { startConsuming } = require('./kafka/consumer');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'analytics-service' });
});

// Routes
app.use('/analytics', analyticsRoutes);

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
    await startConsuming();
    
    app.listen(PORT, () => {
      console.log(`Analytics service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
