const { Kafka } = require('kafkajs');
const { publishToRabbitMQ } = require('../rabbitmq/publisher');
const { ORDER_EVENTS } = require('../../../shared/src/events/schemas');

require('dotenv').config();

const kafka = new Kafka({
  clientId: 'notification-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'notification-service-group' });

let isConnected = false;

const connect = async () => {
  if (!isConnected) {
    await consumer.connect();
    // Subscribe to all order status change events
    await consumer.subscribe({ 
      topics: [
        ORDER_EVENTS.CONFIRMED,
        ORDER_EVENTS.SHIPPED,
        ORDER_EVENTS.DELIVERED,
        ORDER_EVENTS.FAILED
      ],
      fromBeginning: false 
    });
    isConnected = true;
    console.log('Kafka consumer connected (notification service)');
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
          
          // Publish to RabbitMQ for notification processing
          await publishToRabbitMQ(event);
        } catch (error) {
          console.error('Error processing notification event:', error);
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
    console.log('Kafka consumer disconnected (notification service)');
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
