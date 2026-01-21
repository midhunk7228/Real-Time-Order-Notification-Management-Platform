const express = require('express');
const router = express.Router();
const { getProducts, getStock } = require('../controllers/inventoryController');

router.get('/products', getProducts);
router.get('/stock/:productId', getStock);

module.exports = router;
