const pool = require('../db/connection');
const { publishOrderConfirmed, publishOrderFailed } = require('../kafka/producer');
const { ORDER_STATUS } = require('../../../shared/src/utils/constants');

const processOrderCreated = async (event) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { orderId, data } = event;
    const { items } = data;

    // Check inventory for all items
    const insufficientStock = [];
    const reservations = [];

    for (const item of items) {
      // Get current inventory
      const inventoryResult = await client.query(
        `SELECT quantity, reserved_quantity 
         FROM inventory 
         WHERE product_id = $1 FOR UPDATE`,
        [item.productId]
      );

      if (inventoryResult.rows.length === 0) {
        insufficientStock.push({ productId: item.productId, reason: 'Product not found' });
        continue;
      }

      const inventory = inventoryResult.rows[0];
      const availableQuantity = inventory.quantity - inventory.reserved_quantity;

      if (availableQuantity < item.quantity) {
        insufficientStock.push({
          productId: item.productId,
          requested: item.quantity,
          available: availableQuantity,
          reason: 'Insufficient stock'
        });
        continue;
      }

      // Reserve inventory
      await client.query(
        `UPDATE inventory 
         SET reserved_quantity = reserved_quantity + $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE product_id = $2`,
        [item.quantity, item.productId]
      );

      // Create reservation record
      const reservationResult = await client.query(
        `INSERT INTO reservations (order_id, product_id, quantity, status)
         VALUES ($1, $2, $3, 'PENDING')
         RETURNING id`,
        [orderId, item.productId, item.quantity]
      );

      reservations.push({
        reservationId: reservationResult.rows[0].id,
        productId: item.productId,
        quantity: item.quantity
      });
    }

    if (insufficientStock.length > 0) {
      // Rollback all reservations
      for (const reservation of reservations) {
        await client.query(
          `UPDATE inventory 
           SET reserved_quantity = reserved_quantity - $1
           WHERE product_id = $2`,
          [reservation.quantity, reservation.productId]
        );
        await client.query(
          `UPDATE reservations SET status = 'RELEASED' WHERE id = $1`,
          [reservation.reservationId]
        );
      }

      await client.query('COMMIT');

      // Publish order failed event
      await publishOrderFailed(
        orderId,
        'Insufficient inventory',
        { insufficientStock }
      );
      return;
    }

    // Confirm all reservations
    for (const reservation of reservations) {
      await client.query(
        `UPDATE reservations SET status = 'CONFIRMED' WHERE id = $1`,
        [reservation.reservationId]
      );

      // Reduce actual inventory
      await client.query(
        `UPDATE inventory 
         SET quantity = quantity - $1,
             reserved_quantity = reserved_quantity - $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE product_id = $2`,
        [reservation.quantity, reservation.productId]
      );
    }

    await client.query('COMMIT');

    // Publish order confirmed event
    await publishOrderConfirmed(orderId, {
      reservations: reservations.map(r => r.reservationId)
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing order created:', error);
    // Publish failed event on error
    await publishOrderFailed(orderId, 'Processing error', { error: error.message });
  } finally {
    client.release();
  }
};

const getProductStock = async (productId) => {
  const result = await pool.query(
    `SELECT i.product_id, p.name, i.quantity, i.reserved_quantity,
            (i.quantity - i.reserved_quantity) as available_quantity
     FROM inventory i
     JOIN products p ON i.product_id = p.id
     WHERE i.product_id = $1`,
    [productId]
  );

  return result.rows[0] || null;
};

const getAllProducts = async () => {
  const result = await pool.query(
    `SELECT p.id, p.name, p.description, p.price,
            COALESCE(i.quantity, 0) as quantity,
            COALESCE(i.reserved_quantity, 0) as reserved_quantity,
            COALESCE(i.quantity - i.reserved_quantity, 0) as available_quantity
     FROM products p
     LEFT JOIN inventory i ON p.id = i.product_id
     ORDER BY p.id`
  );

  return result.rows;
};

module.exports = {
  processOrderCreated,
  getProductStock,
  getAllProducts
};
