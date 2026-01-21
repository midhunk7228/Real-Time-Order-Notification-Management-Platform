const { Kafka } = require('kafkajs');
const { processOrderCreated } = require('../services/inventoryService');
const { ORDER_EVENTS } = require('../../../shared/src/events/schemas');

require('dotenv').config();

const kafka = new Kafka({
  clientId: 'inventory-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'inventory-service-group' });

let isConnected = false;

const connect = async () => {
  if (!isConnected) {
    await consumer.connect();
    await consumer.subscribe({ topic: ORDER_EVENTS.CREATED, fromBeginning: false });
    isConnected = true;
    console.log('Kafka consumer connected and subscribed to order.created');
  }
};

const startConsuming = async () => {
  try {
    await connect();
    
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          console.log(`Received event: ${event.eventType} for order ${event.orderId}`);
          
          if (event.eventType === ORDER_EVENTS.CREATED) {
            await processOrderCreated(event);
          }
        } catch (error) {
          console.error('Error processing message:', error);
          // In production, you might want to send to DLQ
        }
      }
    });
  } catch (error) {
    console.error('Error starting consumer:', error);
    throw error;
  }
};

const disconnect = async () => {
  if (isConnected) {
    await consumer.disconnect();
    isConnected = false;
    console.log('Kafka consumer disconnected');
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
  startConsuming,
  disconnect
};
