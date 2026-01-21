const pool = require('../db/connection');

const processEvent = async (event) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Store raw event
    await client.query(
      `INSERT INTO analytics_events (event_id, event_type, order_id, user_id, event_data, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (event_id) DO NOTHING`,
      [
        event.eventId,
        event.eventType,
        event.orderId,
        event.userId,
        JSON.stringify(event.data),
        new Date(event.timestamp || Date.now())
      ]
    );

    // Update metrics based on event type
    const eventDate = new Date(event.timestamp || Date.now());
    const dateStr = eventDate.toISOString().split('T')[0];
    const hour = eventDate.getHours();

    if (event.eventType === 'order.created') {
      // Increment orders created count
      await client.query(
        `INSERT INTO metrics (metric_type, metric_date, metric_hour, value, metadata)
         VALUES ('orders_created', $1, $2, 1, '{}')
         ON CONFLICT (metric_type, metric_date, metric_hour)
         DO UPDATE SET value = metrics.value + 1, updated_at = CURRENT_TIMESTAMP`,
        [dateStr, hour]
      );

      // Track revenue if total amount is available
      if (event.data?.totalAmount) {
        await client.query(
          `INSERT INTO metrics (metric_type, metric_date, metric_hour, value, metadata)
           VALUES ('revenue', $1, $2, $3, '{}')
           ON CONFLICT (metric_type, metric_date, metric_hour)
           DO UPDATE SET value = metrics.value + $3, updated_at = CURRENT_TIMESTAMP`,
          [dateStr, hour, parseFloat(event.data.totalAmount)]
        );
      }
    } else if (event.eventType === 'order.delivered') {
      // Increment orders delivered count
      await client.query(
        `INSERT INTO metrics (metric_type, metric_date, metric_hour, value, metadata)
         VALUES ('orders_delivered', $1, $2, 1, '{}')
         ON CONFLICT (metric_type, metric_date, metric_hour)
         DO UPDATE SET value = metrics.value + 1, updated_at = CURRENT_TIMESTAMP`,
        [dateStr, hour]
      );
    } else if (event.eventType === 'order.failed') {
      // Increment orders failed count
      await client.query(
        `INSERT INTO metrics (metric_type, metric_date, metric_hour, value, metadata)
         VALUES ('orders_failed', $1, $2, 1, '{}')
         ON CONFLICT (metric_type, metric_date, metric_hour)
         DO UPDATE SET value = metrics.value + 1, updated_at = CURRENT_TIMESTAMP`,
        [dateStr, hour]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing analytics event:', error);
    throw error;
  } finally {
    client.release();
  }
};

const getOrdersPerDay = async (days = 7) => {
  const result = await pool.query(
    `SELECT metric_date, SUM(value) as total
     FROM metrics
     WHERE metric_type = 'orders_created'
       AND metric_date >= CURRENT_DATE - INTERVAL '${days} days'
     GROUP BY metric_date
     ORDER BY metric_date ASC`
  );
  return result.rows;
};

const getOrdersPerHour = async (date = null) => {
  const targetDate = date || new Date().toISOString().split('T')[0];
  const result = await pool.query(
    `SELECT metric_hour, SUM(value) as total
     FROM metrics
     WHERE metric_type = 'orders_created'
       AND metric_date = $1
     GROUP BY metric_hour
     ORDER BY metric_hour ASC`,
    [targetDate]
  );
  return result.rows;
};

const getRevenueMetrics = async (days = 7) => {
  const result = await pool.query(
    `SELECT metric_date, SUM(value) as total_revenue
     FROM metrics
     WHERE metric_type = 'revenue'
       AND metric_date >= CURRENT_DATE - INTERVAL '${days} days'
     GROUP BY metric_date
     ORDER BY metric_date ASC`
  );
  return result.rows;
};

const getOrderStatusDistribution = async () => {
  const result = await pool.query(
    `SELECT 
       COUNT(CASE WHEN event_type = 'order.created' THEN 1 END) as created,
       COUNT(CASE WHEN event_type = 'order.confirmed' THEN 1 END) as confirmed,
       COUNT(CASE WHEN event_type = 'order.shipped' THEN 1 END) as shipped,
       COUNT(CASE WHEN event_type = 'order.delivered' THEN 1 END) as delivered,
       COUNT(CASE WHEN event_type = 'order.failed' THEN 1 END) as failed
     FROM analytics_events
     WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'`
  );
  return result.rows[0] || {};
};

const getAverageDeliveryTime = async () => {
  const result = await pool.query(
    `WITH order_times AS (
       SELECT 
         order_id,
         MIN(CASE WHEN event_type = 'order.created' THEN timestamp END) as created_at,
         MIN(CASE WHEN event_type = 'order.delivered' THEN timestamp END) as delivered_at
       FROM analytics_events
       WHERE event_type IN ('order.created', 'order.delivered')
         AND timestamp >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY order_id
       HAVING MIN(CASE WHEN event_type = 'order.created' THEN timestamp END) IS NOT NULL
         AND MIN(CASE WHEN event_type = 'order.delivered' THEN timestamp END) IS NOT NULL
     )
     SELECT AVG(EXTRACT(EPOCH FROM (delivered_at - created_at)) / 3600) as avg_hours
     FROM order_times`
  );
  return result.rows[0]?.avg_hours || 0;
};

module.exports = {
  processEvent,
  getOrdersPerDay,
  getOrdersPerHour,
  getRevenueMetrics,
  getOrderStatusDistribution,
  getAverageDeliveryTime
};
