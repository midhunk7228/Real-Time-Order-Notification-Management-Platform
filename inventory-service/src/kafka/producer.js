const { Kafka } = require('kafkajs');
const { createOrderStatusEvent, ORDER_EVENTS } = require('../../../shared/src/events/schemas');

require('dotenv').config();

const kafka = new Kafka({
  clientId: 'inventory-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const producer = kafka.producer();

let isConnected = false;

const connect = async () => {
  if (!isConnected) {
    await producer.connect();
    isConnected = true;
    console.log('Kafka producer connected (inventory service)');
  }
};

const publishOrderConfirmed = async (orderId, metadata = {}) => {
  try {
    await connect();
    const event = createOrderStatusEvent(ORDER_EVENTS.CONFIRMED, orderId, 'CONFIRMED', metadata);
    await producer.send({
      topic: ORDER_EVENTS.CONFIRMED,
      messages: [{
        key: orderId.toString(),
        value: JSON.stringify(event)
      }]
    });
    console.log(`Published order.confirmed event for order ${orderId}`);
  } catch (error) {
    console.error('Error publishing order.confirmed event:', error);
    throw error;
  }
};

const publishOrderFailed = async (orderId, reason, metadata = {}) => {
  try {
    await connect();
    const event = createOrderStatusEvent(ORDER_EVENTS.FAILED, orderId, 'FAILED', { reason, ...metadata });
    await producer.send({
      topic: ORDER_EVENTS.FAILED,
      messages: [{
        key: orderId.toString(),
        value: JSON.stringify(event)
      }]
    });
    console.log(`Published order.failed event for order ${orderId}`);
  } catch (error) {
    console.error('Error publishing order.failed event:', error);
    throw error;
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (isConnected) {
    await producer.disconnect();
    isConnected = false;
  }
});

process.on('SIGINT', async () => {
  if (isConnected) {
    await producer.disconnect();
    isConnected = false;
  }
});

module.exports = {
  connect,
  publishOrderConfirmed,
  publishOrderFailed
};
