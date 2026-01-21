const express = require('express');
const cors = require('cors');
const pool = require('./db/connection');
const fs = require('fs');
const path = require('path');
const inventoryRoutes = require('./routes/inventoryRoutes');
const { startConsuming } = require('./kafka/consumer');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'inventory-service' });
});

// Routes
app.use('/inventory', inventoryRoutes);

// Initialize database schema
const initializeDatabase = async () => {
  try {
    const schemaPath = path.join(__dirname, 'db', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('Database schema initialized');
    
    // Seed some sample products if they don't exist
    const productCheck = await pool.query('SELECT COUNT(*) FROM products');
    if (parseInt(productCheck.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO products (name, description, price) VALUES
        ('Product 1', 'Description for Product 1', 29.99),
        ('Product 2', 'Description for Product 2', 49.99),
        ('Product 3', 'Description for Product 3', 19.99),
        ('Product 4', 'Description for Product 4', 39.99),
        ('Product 5', 'Description for Product 5', 59.99)
        ON CONFLICT DO NOTHING
      `);
      
      // Initialize inventory
      await pool.query(`
        INSERT INTO inventory (product_id, quantity)
        SELECT id, 100 FROM products
        ON CONFLICT (product_id) DO NOTHING
      `);
      console.log('Sample products and inventory seeded');
    }
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
      console.log(`Inventory service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
