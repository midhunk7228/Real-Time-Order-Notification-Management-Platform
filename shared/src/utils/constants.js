// Common constants across services

const ORDER_STATUS = {
  CREATED: 'CREATED',
  CONFIRMED: 'CONFIRMED',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
};

const USER_ROLES = {
  USER: 'USER',
  ADMIN: 'ADMIN'
};

const NOTIFICATION_CHANNELS = {
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push'
};

const KAFKA_TOPICS = {
  ORDER_CREATED: 'order.created',
  ORDER_CONFIRMED: 'order.confirmed',
  ORDER_SHIPPED: 'order.shipped',
  ORDER_DELIVERED: 'order.delivered',
  ORDER_FAILED: 'order.failed',
  PAYMENT_SUCCESS: 'payment.success',
  PAYMENT_FAILED: 'payment.failed'
};

const RABBITMQ_QUEUES = {
  EMAIL_NOTIFICATIONS: 'email.notifications',
  SMS_NOTIFICATIONS: 'sms.notifications',
  PUSH_NOTIFICATIONS: 'push.notifications',
  DLQ: 'notifications.dlq'
};

const RABBITMQ_EXCHANGE = {
  NOTIFICATIONS: 'notifications.topic'
};

module.exports = {
  ORDER_STATUS,
  USER_ROLES,
  NOTIFICATION_CHANNELS,
  KAFKA_TOPICS,
  RABBITMQ_QUEUES,
  RABBITMQ_EXCHANGE
};
