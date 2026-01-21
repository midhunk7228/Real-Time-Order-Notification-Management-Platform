const amqp = require('amqplib');
const { RABBITMQ_EXCHANGE, RABBITMQ_QUEUES, NOTIFICATION_CHANNELS } = require('../../../shared/src/utils/constants');

require('dotenv').config();

let connection = null;
let channel = null;

const connect = async () => {
  try {
    const url = process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672';
    connection = await amqp.connect(url);
    channel = await connection.createChannel();

    // Declare topic exchange
    await channel.assertExchange(RABBITMQ_EXCHANGE, 'topic', { durable: true });

    // Declare queues
    await channel.assertQueue(RABBITMQ_QUEUES.EMAIL_NOTIFICATIONS, { durable: true });
    await channel.assertQueue(RABBITMQ_QUEUES.SMS_NOTIFICATIONS, { durable: true });
    await channel.assertQueue(RABBITMQ_QUEUES.PUSH_NOTIFICATIONS, { durable: true });
    await channel.assertQueue(RABBITMQ_QUEUES.DLQ, { durable: true });

    // Bind queues to exchange
    await channel.bindQueue(RABBITMQ_QUEUES.EMAIL_NOTIFICATIONS, RABBITMQ_EXCHANGE, 'order.*');
    await channel.bindQueue(RABBITMQ_QUEUES.SMS_NOTIFICATIONS, RABBITMQ_EXCHANGE, 'order.*');
    await channel.bindQueue(RABBITMQ_QUEUES.PUSH_NOTIFICATIONS, RABBITMQ_EXCHANGE, 'order.*');

    console.log('RabbitMQ publisher connected');
  } catch (error) {
    console.error('Error connecting to RabbitMQ:', error);
    throw error;
  }
};

const publishToRabbitMQ = async (event) => {
  try {
    if (!channel) {
      await connect();
    }

    const { eventType, orderId, data } = event;
    const routingKey = eventType.replace('order.', 'order.');

    // Create notification messages for each channel
    const notification = {
      eventType,
      orderId,
      userId: data.userId || null,
      status: data.status,
      timestamp: event.timestamp || new Date().toISOString(),
      metadata: data
    };

    // Publish to all notification channels
    const message = JSON.stringify(notification);
    const options = { persistent: true };

    // Email notification
    channel.publish(
      RABBITMQ_EXCHANGE,
      routingKey,
      Buffer.from(message),
      { ...options, headers: { channel: NOTIFICATION_CHANNELS.EMAIL } }
    );

    // SMS notification
    channel.publish(
      RABBITMQ_EXCHANGE,
      routingKey,
      Buffer.from(message),
      { ...options, headers: { channel: NOTIFICATION_CHANNELS.SMS } }
    );

    // Push notification
    channel.publish(
      RABBITMQ_EXCHANGE,
      routingKey,
      Buffer.from(message),
      { ...options, headers: { channel: NOTIFICATION_CHANNELS.PUSH } }
    );

    console.log(`Published notification for order ${orderId} to RabbitMQ`);
  } catch (error) {
    console.error('Error publishing to RabbitMQ:', error);
    throw error;
  }
};

const close = async () => {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    console.log('RabbitMQ connection closed');
  } catch (error) {
    console.error('Error closing RabbitMQ connection:', error);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  await close();
});

process.on('SIGINT', async () => {
  await close();
});

module.exports = {
  connect,
  publishToRabbitMQ,
  close
};
