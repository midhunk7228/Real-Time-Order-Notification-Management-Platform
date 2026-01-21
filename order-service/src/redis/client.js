const redis = require('redis');
require('dotenv').config();

const client = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

client.on('error', (err) => {
  console.error('Redis Client Error', err);
});

client.on('connect', () => {
  console.log('Redis client connected');
});

const connect = async () => {
  try {
    await client.connect();
  } catch (error) {
    console.error('Redis connection error:', error);
  }
};

const disconnect = async () => {
  try {
    await client.quit();
  } catch (error) {
    console.error('Redis disconnect error:', error);
  }
};

// Cache order status
const cacheOrderStatus = async (orderId, status, ttl = 3600) => {
  try {
    await client.setEx(`order:${orderId}:status`, ttl, status);
  } catch (error) {
    console.error('Error caching order status:', error);
  }
};

// Get cached order status
const getCachedOrderStatus = async (orderId) => {
  try {
    return await client.get(`order:${orderId}:status`);
  } catch (error) {
    console.error('Error getting cached order status:', error);
    return null;
  }
};

// Invalidate order cache
const invalidateOrderCache = async (orderId) => {
  try {
    await client.del(`order:${orderId}:status`);
  } catch (error) {
    console.error('Error invalidating order cache:', error);
  }
};

module.exports = {
  client,
  connect,
  disconnect,
  cacheOrderStatus,
  getCachedOrderStatus,
  invalidateOrderCache
};
