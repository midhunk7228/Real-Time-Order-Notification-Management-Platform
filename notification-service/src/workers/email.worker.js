const amqp = require('amqplib');
const { RABBITMQ_QUEUES, RABBITMQ_EXCHANGE, NOTIFICATION_CHANNELS } = require('../../../shared/src/utils/constants');

require('dotenv').config();

let connection = null;
let channel = null;

// Mock email sending function
const sendEmail = async (to, subject, body) => {
  // In production, use SendGrid, AWS SES, or similar
  console.log(`[EMAIL] Sending email to ${to}`);
  console.log(`[EMAIL] Subject: ${subject}`);
  console.log(`[EMAIL] Body: ${body}`);
  
  // Simulate async email sending
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Simulate occasional failures (10% failure rate for testing)
  if (Math.random() < 0.1) {
    throw new Error('Email service temporarily unavailable');
  }
  
  return { success: true, messageId: `email-${Date.now()}` };
};

const processMessage = async (msg) => {
  try {
    const notification = JSON.parse(msg.content.toString());
    const { orderId, status, userId } = notification;

    // Get user email (in production, fetch from user service)
    const userEmail = `user${userId}@example.com`;

    const subject = `Order ${orderId} - Status Update`;
    const body = `Your order #${orderId} status has been updated to: ${status}`;

    await sendEmail(userEmail, subject, body);

    // Acknowledge message
    channel.ack(msg);
    console.log(`[EMAIL] Processed notification for order ${orderId}`);
  } catch (error) {
    console.error('[EMAIL] Error processing message:', error);
    
    // Check retry count
    const retryCount = (msg.properties.headers?.['x-retry-count'] || 0) + 1;
    const maxRetries = 3;

    if (retryCount < maxRetries) {
      // Retry with exponential backoff
      const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
      
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
              'x-original-queue': RABBITMQ_QUEUES.EMAIL_NOTIFICATIONS
            }
          }
        );
        channel.ack(msg);
      }, delay);
      
      console.log(`[EMAIL] Retrying message (attempt ${retryCount}/${maxRetries})`);
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
      console.log(`[EMAIL] Message sent to DLQ after ${maxRetries} retries`);
    }
  }
};

const startWorker = async () => {
  try {
    const url = process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672';
    connection = await amqp.connect(url);
    channel = await connection.createChannel();

    // Ensure queue exists
    await channel.assertQueue(RABBITMQ_QUEUES.EMAIL_NOTIFICATIONS, { durable: true });

    // Set prefetch to process one message at a time
    channel.prefetch(1);

    console.log('[EMAIL] Worker started, waiting for messages...');

    channel.consume(RABBITMQ_QUEUES.EMAIL_NOTIFICATIONS, processMessage, {
      noAck: false
    });
  } catch (error) {
    console.error('[EMAIL] Error starting worker:', error);
    throw error;
  }
};

const stopWorker = async () => {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    console.log('[EMAIL] Worker stopped');
  } catch (error) {
    console.error('[EMAIL] Error stopping worker:', error);
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
