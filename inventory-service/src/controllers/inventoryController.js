const { getAllProducts, getProductStock } = require('../services/inventoryService');

const getProducts = async (req, res) => {
  try {
    const products = await getAllProducts();
    res.json({ products });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getStock = async (req, res) => {
  try {
    const { productId } = req.params;
    const stock = await getProductStock(parseInt(productId));
    
    if (!stock) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ stock });
  } catch (error) {
    console.error('Get stock error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getProducts,
  getStock
};
