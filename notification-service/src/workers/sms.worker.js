const amqp = require('amqplib');
const { RABBITMQ_QUEUES, RABBITMQ_EXCHANGE, NOTIFICATION_CHANNELS } = require('../../../shared/src/utils/constants');

require('dotenv').config();

let connection = null;
let channel = null;

// Mock SMS sending function
const sendSMS = async (to, message) => {
  // In production, use Twilio, AWS SNS, or similar
  console.log(`[SMS] Sending SMS to ${to}`);
  console.log(`[SMS] Message: ${message}`);
  
  // Simulate async SMS sending
  await new Promise(resolve => setTimeout(resolve, 150));
  
  // Simulate occasional failures (10% failure rate for testing)
  if (Math.random() < 0.1) {
    throw new Error('SMS service temporarily unavailable');
  }
  
  return { success: true, messageId: `sms-${Date.now()}` };
};

const processMessage = async (msg) => {
  try {
    const notification = JSON.parse(msg.content.toString());
    const { orderId, status, userId } = notification;

    // Get user phone (in production, fetch from user service)
    const userPhone = `+1234567890${userId}`;

    const message = `Order #${orderId} status: ${status}`;

    await sendSMS(userPhone, message);

    // Acknowledge message
    channel.ack(msg);
    console.log(`[SMS] Processed notification for order ${orderId}`);
  } catch (error) {
    console.error('[SMS] Error processing message:', error);
    
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
              'x-original-queue': RABBITMQ_QUEUES.SMS_NOTIFICATIONS
            }
          }
        );
        channel.ack(msg);
      }, delay);
      
      console.log(`[SMS] Retrying message (attempt ${retryCount}/${maxRetries})`);
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
      console.log(`[SMS] Message sent to DLQ after ${maxRetries} retries`);
    }
  }
};

const startWorker = async () => {
  try {
    const url = process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672';
    connection = await amqp.connect(url);
    channel = await connection.createChannel();

    // Ensure queue exists
    await channel.assertQueue(RABBITMQ_QUEUES.SMS_NOTIFICATIONS, { durable: true });

    // Set prefetch to process one message at a time
    channel.prefetch(1);

    console.log('[SMS] Worker started, waiting for messages...');

    channel.consume(RABBITMQ_QUEUES.SMS_NOTIFICATIONS, processMessage, {
      noAck: false
    });
  } catch (error) {
    console.error('[SMS] Error starting worker:', error);
    throw error;
  }
};

const stopWorker = async () => {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    console.log('[SMS] Worker stopped');
  } catch (error) {
    console.error('[SMS] Error stopping worker:', error);
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
