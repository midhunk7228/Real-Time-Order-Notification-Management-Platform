const express = require('express');
const router = express.Router();
const {
  getOrdersPerDayMetrics,
  getOrdersPerHourMetrics,
  getRevenueMetricsData,
  getOrderStatusDistributionData,
  getAverageDeliveryTimeData,
  getDashboardData
} = require('../controllers/analyticsController');

router.get('/orders-per-day', getOrdersPerDayMetrics);
router.get('/orders-per-hour', getOrdersPerHourMetrics);
router.get('/revenue', getRevenueMetricsData);
router.get('/status-distribution', getOrderStatusDistributionData);
router.get('/average-delivery-time', getAverageDeliveryTimeData);
router.get('/dashboard', getDashboardData);

module.exports = router;
