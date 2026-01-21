// Event schemas for Kafka events

const ORDER_EVENTS = {
  CREATED: 'order.created',
  CONFIRMED: 'order.confirmed',
  SHIPPED: 'order.shipped',
  DELIVERED: 'order.delivered',
  FAILED: 'order.failed'
};

const PAYMENT_EVENTS = {
  SUCCESS: 'payment.success',
  FAILED: 'payment.failed'
};

// Event schema validators
const createOrderEvent = (orderId, userId, orderData, timestamp = new Date().toISOString()) => {
  return {
    eventId: `${orderId}-${Date.now()}`,
    eventType: ORDER_EVENTS.CREATED,
    orderId,
    userId,
    timestamp,
    data: {
      status: 'CREATED',
      items: orderData.items,
      totalAmount: orderData.totalAmount,
      shippingAddress: orderData.shippingAddress
    }
  };
};

const createOrderStatusEvent = (eventType, orderId, status, metadata = {}) => {
  return {
    eventId: `${orderId}-${Date.now()}`,
    eventType,
    orderId,
    timestamp: new Date().toISOString(),
    data: {
      status,
      ...metadata
    }
  };
};

const createPaymentEvent = (eventType, orderId, paymentData) => {
  return {
    eventId: `payment-${orderId}-${Date.now()}`,
    eventType,
    orderId,
    timestamp: new Date().toISOString(),
    data: paymentData
  };
};

// Notification event schema
const createNotificationEvent = (type, userId, orderId, message, channel) => {
  return {
    notificationId: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    userId,
    orderId,
    message,
    channel, // 'email', 'sms', 'push'
    timestamp: new Date().toISOString(),
    status: 'pending'
  };
};

module.exports = {
  ORDER_EVENTS,
  PAYMENT_EVENTS,
  createOrderEvent,
  createOrderStatusEvent,
  createPaymentEvent,
  createNotificationEvent
};
