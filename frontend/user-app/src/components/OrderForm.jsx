import { useState, useEffect } from 'react';
import { inventoryAPI, orderAPI } from '../services/api';

const OrderForm = ({ onOrderCreated }) => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [shippingAddress, setShippingAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await inventoryAPI.getProducts();
      setProducts(response.data.products);
    } catch (err) {
      console.error('Error loading products:', err);
    }
  };

  const addToCart = (product) => {
    if (product.available_quantity <= 0) {
      alert('Product out of stock');
      return;
    }
    
    const existingItem = cart.find(item => item.productId === product.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        price: parseFloat(product.price)
      }]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(cart.map(item =>
      item.productId === productId
        ? { ...item, quantity }
        : item
    ));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      setError('Please add items to cart');
      return;
    }
    if (!shippingAddress.trim()) {
      setError('Please enter shipping address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await orderAPI.create({
        items: cart,
        shippingAddress,
        totalAmount: calculateTotal()
      });

      setCart([]);
      setShippingAddress('');
      onOrderCreated(response.data.order);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Create Order</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Products</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {products.map(product => (
              <div key={product.id} className="border rounded p-3 flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{product.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">${product.price}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Available: {product.available_quantity}
                  </p>
                </div>
                <button
                  onClick={() => addToCart(product)}
                  disabled={product.available_quantity <= 0}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded disabled:bg-gray-400"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Cart</h3>
          {cart.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">Cart is empty</p>
          ) : (
            <div className="space-y-2 mb-4">
              {cart.map(item => (
                <div key={item.productId} className="border rounded p-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{item.productName}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      ${item.price} x {item.quantity} = ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
                    >
                      -
                    </button>
                    <span className="text-gray-900 dark:text-white">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded ml-2"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
              Shipping Address
            </label>
            <textarea
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              className="w-full border rounded p-2 text-gray-900 dark:text-white dark:bg-gray-700"
              rows="3"
              placeholder="Enter shipping address"
            />
          </div>

          <div className="mb-4">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              Total: ${calculateTotal().toFixed(2)}
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || cart.length === 0}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400"
          >
            {loading ? 'Creating Order...' : 'Place Order'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderForm;
