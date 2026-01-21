const { Kafka } = require('kafkajs');
const { createOrderEvent, createOrderStatusEvent, ORDER_EVENTS } = require('../../../shared/src/events/schemas');

require('dotenv').config();

const kafka = new Kafka({
  clientId: 'order-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const producer = kafka.producer();

let isConnected = false;

const connect = async () => {
  if (!isConnected) {
    await producer.connect();
    isConnected = true;
    console.log('Kafka producer connected');
  }
};

const disconnect = async () => {
  if (isConnected) {
    await producer.disconnect();
    isConnected = false;
    console.log('Kafka producer disconnected');
  }
};

const publishOrderCreated = async (orderId, userId, orderData) => {
  try {
    await connect();
    const event = createOrderEvent(orderId, userId, orderData);
    await producer.send({
      topic: ORDER_EVENTS.CREATED,
      messages: [{
        key: orderId.toString(),
        value: JSON.stringify(event)
      }]
    });
    console.log(`Published order.created event for order ${orderId}`);
  } catch (error) {
    console.error('Error publishing order.created event:', error);
    throw error;
  }
};

const publishOrderStatusChange = async (eventType, orderId, status, metadata = {}) => {
  try {
    await connect();
    const event = createOrderStatusEvent(eventType, orderId, status, metadata);
    await producer.send({
      topic: eventType,
      messages: [{
        key: orderId.toString(),
        value: JSON.stringify(event)
      }]
    });
    console.log(`Published ${eventType} event for order ${orderId}`);
  } catch (error) {
    console.error(`Error publishing ${eventType} event:`, error);
    throw error;
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  await disconnect();
});

process.on('SIGINT', async () => {
  await disconnect();
});

module.exports = {
  connect,
  disconnect,
  publishOrderCreated,
  publishOrderStatusChange
};
