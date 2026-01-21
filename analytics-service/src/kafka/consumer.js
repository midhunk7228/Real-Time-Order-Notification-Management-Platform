const { Kafka } = require('kafkajs');
const { processEvent } = require('../services/analyticsService');
const { ORDER_EVENTS } = require('../../../shared/src/events/schemas');

require('dotenv').config();

const kafka = new Kafka({
  clientId: 'analytics-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'analytics-service-group' });

let isConnected = false;

const connect = async () => {
  if (!isConnected) {
    await consumer.connect();
    // Subscribe to all order events
    await consumer.subscribe({ 
      topics: [
        ORDER_EVENTS.CREATED,
        ORDER_EVENTS.CONFIRMED,
        ORDER_EVENTS.SHIPPED,
        ORDER_EVENTS.DELIVERED,
        ORDER_EVENTS.FAILED
      ],
      fromBeginning: false 
    });
    isConnected = true;
    console.log('Kafka consumer connected (analytics service)');
  }
};

const startConsuming = async () => {
  try {
    await connect();
    
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          console.log(`Processing analytics event: ${event.eventType} for order ${event.orderId}`);
          
          await processEvent(event);
        } catch (error) {
          console.error('Error processing analytics event:', error);
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
    console.log('Kafka consumer disconnected (analytics service)');
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
