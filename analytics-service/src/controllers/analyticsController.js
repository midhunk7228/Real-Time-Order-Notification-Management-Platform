const {
  getOrdersPerDay,
  getOrdersPerHour,
  getRevenueMetrics,
  getOrderStatusDistribution,
  getAverageDeliveryTime
} = require('../services/analyticsService');

const getOrdersPerDayMetrics = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const metrics = await getOrdersPerDay(days);
    res.json({ metrics });
  } catch (error) {
    console.error('Get orders per day error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getOrdersPerHourMetrics = async (req, res) => {
  try {
    const date = req.query.date || null;
    const metrics = await getOrdersPerHour(date);
    res.json({ metrics });
  } catch (error) {
    console.error('Get orders per hour error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getRevenueMetricsData = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const metrics = await getRevenueMetrics(days);
    res.json({ metrics });
  } catch (error) {
    console.error('Get revenue metrics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getOrderStatusDistributionData = async (req, res) => {
  try {
    const distribution = await getOrderStatusDistribution();
    res.json({ distribution });
  } catch (error) {
    console.error('Get order status distribution error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getAverageDeliveryTimeData = async (req, res) => {
  try {
    const avgHours = await getAverageDeliveryTime();
    res.json({ averageDeliveryTimeHours: parseFloat(avgHours).toFixed(2) });
  } catch (error) {
    console.error('Get average delivery time error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getDashboardData = async (req, res) => {
  try {
    const [ordersPerDay, revenue, statusDistribution, avgDeliveryTime] = await Promise.all([
      getOrdersPerDay(7),
      getRevenueMetrics(7),
      getOrderStatusDistribution(),
      getAverageDeliveryTime()
    ]);

    res.json({
      ordersPerDay,
      revenue,
      statusDistribution,
      averageDeliveryTimeHours: parseFloat(avgDeliveryTime).toFixed(2)
    });
  } catch (error) {
    console.error('Get dashboard data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getOrdersPerDayMetrics,
  getOrdersPerHourMetrics,
  getRevenueMetricsData,
  getOrderStatusDistributionData,
  getAverageDeliveryTimeData,
  getDashboardData
};
