const { v4: uuidv4 } = require('uuid');
const { validationResult } = require('express-validator');
const pool = require('../db/connection');
const { publishOrderCreated, publishOrderStatusChange } = require('../kafka/producer');
const { cacheOrderStatus, invalidateOrderCache } = require('../redis/client');
const { emitOrderUpdate, emitOrderStatusChange: emitWSStatusChange } = require('../websocket/server');
const { ORDER_EVENTS, ORDER_STATUS } = require('../../../shared/src/events/schemas');

const createOrder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.headers['x-user-id'] || req.user?.userId;
    const { items, shippingAddress, totalAmount } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create order
      const orderResult = await client.query(
        `INSERT INTO orders (user_id, status, total_amount, shipping_address)
         VALUES ($1, $2, $3, $4)
         RETURNING id, user_id, status, total_amount, shipping_address, created_at`,
        [userId, ORDER_STATUS.CREATED, totalAmount, shippingAddress]
      );

      const order = orderResult.rows[0];
      const orderId = order.id;

      // Create order items
      for (const item of items) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, product_name, quantity, price)
           VALUES ($1, $2, $3, $4, $5)`,
          [orderId, item.productId, item.productName, item.quantity, item.price]
        );
      }

      // Create status history entry
      await client.query(
        `INSERT INTO order_status_history (order_id, status, notes)
         VALUES ($1, $2, $3)`,
        [orderId, ORDER_STATUS.CREATED, 'Order created']
      );

      await client.query('COMMIT');

      // Cache order status
      await cacheOrderStatus(orderId, ORDER_STATUS.CREATED);

      // Publish to Kafka
      await publishOrderCreated(orderId, userId, {
        items,
        totalAmount,
        shippingAddress
      });

      // Emit WebSocket event
      emitOrderUpdate(orderId, {
        status: ORDER_STATUS.CREATED,
        totalAmount,
        items
      });

      res.status(201).json({
        message: 'Order created successfully',
        order: {
          id: order.id,
          userId: order.user_id,
          status: order.status,
          totalAmount: order.total_amount,
          shippingAddress: order.shipping_address,
          createdAt: order.created_at
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] || req.user?.userId;
    const userRole = req.headers['x-user-role'] || req.user?.role;

    // Get order
    const orderResult = await pool.query(
      `SELECT id, user_id, status, total_amount, shipping_address, created_at, updated_at
       FROM orders WHERE id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Check authorization (user can only see their own orders, admin can see all)
    if (userRole !== 'ADMIN' && order.user_id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get order items
    const itemsResult = await pool.query(
      `SELECT id, product_id, product_name, quantity, price
       FROM order_items WHERE order_id = $1`,
      [id]
    );

    // Get status history
    const historyResult = await pool.query(
      `SELECT status, changed_at, notes
       FROM order_status_history
       WHERE order_id = $1
       ORDER BY changed_at ASC`,
      [id]
    );

    res.json({
      order: {
        id: order.id,
        userId: order.user_id,
        status: order.status,
        totalAmount: order.total_amount,
        shippingAddress: order.shipping_address,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        items: itemsResult.rows,
        history: historyResult.rows
      }
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const userRole = req.headers['x-user-role'] || req.user?.role;

    // Only admin can update order status
    if (userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const validStatuses = Object.values(ORDER_STATUS);
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update order
      const updateResult = await client.query(
        `UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id, status`,
        [status, id]
      );

      if (updateResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Order not found' });
      }

      // Add status history
      await client.query(
        `INSERT INTO order_status_history (order_id, status, notes)
         VALUES ($1, $2, $3)`,
        [id, status, notes || `Status changed to ${status}`]
      );

      await client.query('COMMIT');

      // Invalidate cache
      await invalidateOrderCache(id);
      await cacheOrderStatus(id, status);

      // Determine Kafka event type
      let eventType = ORDER_EVENTS.CONFIRMED;
      if (status === ORDER_STATUS.SHIPPED) eventType = ORDER_EVENTS.SHIPPED;
      else if (status === ORDER_STATUS.DELIVERED) eventType = ORDER_EVENTS.DELIVERED;
      else if (status === ORDER_STATUS.FAILED) eventType = ORDER_EVENTS.FAILED;

      // Publish to Kafka
      await publishOrderStatusChange(eventType, id, status, { notes });

      // Emit WebSocket event
      emitWSStatusChange(id, status, { notes });

      res.json({
        message: 'Order status updated',
        order: {
          id: parseInt(id),
          status
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getUserOrders = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.user?.userId;
    const userRole = req.headers['x-user-role'] || req.user?.role;
    const { status, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT id, user_id, status, total_amount, shipping_address, created_at, updated_at
      FROM orders
    `;
    const params = [];
    let paramCount = 0;

    // Filter by user if not admin
    if (userRole !== 'ADMIN') {
      paramCount++;
      query += ` WHERE user_id = $${paramCount}`;
      params.push(userId);
    }

    // Filter by status if provided
    if (status) {
      paramCount++;
      query += userRole !== 'ADMIN' ? ` AND status = $${paramCount}` : ` WHERE status = $${paramCount}`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    res.json({
      orders: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  createOrder,
  getOrder,
  updateOrderStatus,
  getUserOrders
};
