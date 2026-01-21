const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { createOrder, getOrder, updateOrderStatus, getUserOrders } = require('../controllers/orderController');

// Validation rules
const createOrderValidation = [
  body('items').isArray({ min: 1 }).withMessage('At least one item required'),
  body('items.*.productId').isInt().withMessage('Valid product ID required'),
  body('items.*.productName').notEmpty().withMessage('Product name required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Valid quantity required'),
  body('items.*.price').isFloat({ min: 0 }).withMessage('Valid price required'),
  body('shippingAddress').notEmpty().withMessage('Shipping address required'),
  body('totalAmount').isFloat({ min: 0 }).withMessage('Valid total amount required')
];

const updateStatusValidation = [
  body('status').isIn(['CREATED', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'FAILED', 'CANCELLED']).withMessage('Valid status required')
];

router.post('/create', createOrderValidation, createOrder);
router.get('/:id', getOrder);
router.put('/:id/status', updateStatusValidation, updateOrderStatus);
router.get('/', getUserOrders);

module.exports = router;
