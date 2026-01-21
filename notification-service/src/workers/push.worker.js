const amqp = require('amqplib');
const { RABBITMQ_QUEUES, RABBITMQ_EXCHANGE, NOTIFICATION_CHANNELS } = require('../../../shared/src/utils/constants');

require('dotenv').config();

let connection = null;
let channel = null;

// Mock push notification sending function
const sendPushNotification = async (userId, title, body, data) => {
  // In production, use Firebase Cloud Messaging, Apple Push Notification, etc.
  console.log(`[PUSH] Sending push notification to user ${userId}`);
  console.log(`[PUSH] Title: ${title}`);
  console.log(`[PUSH] Body: ${body}`);
  console.log(`[PUSH] Data:`, data);
  
  // Simulate async push notification sending
  await new Promise(resolve => setTimeout(resolve, 80));
  
  // Simulate occasional failures (10% failure rate for testing)
  if (Math.random() < 0.1) {
    throw new Error('Push notification service temporarily unavailable');
  }
  
  return { success: true, notificationId: `push-${Date.now()}` };
};

const processMessage = async (msg) => {
  try {
    const notification = JSON.parse(msg.content.toString());
    const { orderId, status, userId } = notification;

    const title = `Order ${orderId} Update`;
    const body = `Your order status has been updated to: ${status}`;
    const data = { orderId, status, type: 'order-update' };

    await sendPushNotification(userId, title, body, data);

    // Acknowledge message
    channel.ack(msg);
    console.log(`[PUSH] Processed notification for order ${orderId}`);
  } catch (error) {
    console.error('[PUSH] Error processing message:', error);
    
    // Check retry count
    const retryCount = (msg.properties.headers?.['x-retry-count'] || 0) + 1;
    const maxRetries = 3;

    if (retryCount < maxRetries) {
      // Retry with exponential backoff
      const delay = Math.pow(2, retryCount) * 1000;
      
      setTimeout(() => {
        channel.publish(
          RABBITMQ_EXCHANGE,
          'order.retry',
          msg.content,
          {
            persistent: true,
            headers: {
              ...msg.properties.headers,
              'x-retry-count': retryCount,
              'x-original-queue': RABBITMQ_QUEUES.PUSH_NOTIFICATIONS
            }
          }
        );
        channel.ack(msg);
      }, delay);
      
      console.log(`[PUSH] Retrying message (attempt ${retryCount}/${maxRetries})`);
    } else {
      // Send to DLQ
      channel.sendToQueue(RABBITMQ_QUEUES.DLQ, msg.content, {
        persistent: true,
        headers: {
          ...msg.properties.headers,
          'x-failed-reason': error.message,
          'x-failed-at': new Date().toISOString()
        }
      });
      channel.ack(msg);
      console.log(`[PUSH] Message sent to DLQ after ${maxRetries} retries`);
    }
  }
};

const startWorker = async () => {
  try {
    const url = process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672';
    connection = await amqp.connect(url);
    channel = await connection.createChannel();

    // Ensure queue exists
    await channel.assertQueue(RABBITMQ_QUEUES.PUSH_NOTIFICATIONS, { durable: true });

    // Set prefetch to process one message at a time
    channel.prefetch(1);

    console.log('[PUSH] Worker started, waiting for messages...');

    channel.consume(RABBITMQ_QUEUES.PUSH_NOTIFICATIONS, processMessage, {
      noAck: false
    });
  } catch (error) {
    console.error('[PUSH] Error starting worker:', error);
    throw error;
  }
};

const stopWorker = async () => {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    console.log('[PUSH] Worker stopped');
  } catch (error) {
    console.error('[PUSH] Error stopping worker:', error);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  await stopWorker();
});

process.on('SIGINT', async () => {
  await stopWorker();
});

module.exports = { startWorker, stopWorker };
