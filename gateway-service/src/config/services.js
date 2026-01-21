// Service URLs configuration
module.exports = {
  AUTH_SERVICE: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  ORDER_SERVICE: process.env.ORDER_SERVICE_URL || 'http://localhost:3002',
  INVENTORY_SERVICE: process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003',
  NOTIFICATION_SERVICE: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004',
  ANALYTICS_SERVICE: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3005'
};
