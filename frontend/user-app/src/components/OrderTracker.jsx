import { useState, useEffect } from 'react';
import { orderAPI } from '../services/api';
import { connectSocket, joinOrderRoom, onOrderStatusChange, offOrderStatusChange } from '../services/socket';

const OrderTracker = ({ orderId }) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadOrder();
    const socket = connectSocket();
    joinOrderRoom(orderId);

    const handleStatusChange = (data) => {
      if (data.orderId === orderId) {
        setOrder(prev => prev ? { ...prev, status: data.status } : null);
      }
    };

    onOrderStatusChange(handleStatusChange);

    return () => {
      offOrderStatusChange();
    };
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const response = await orderAPI.get(orderId);
      setOrder(response.data.order);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      CREATED: 'bg-yellow-500',
      CONFIRMED: 'bg-blue-500',
      SHIPPED: 'bg-purple-500',
      DELIVERED: 'bg-green-500',
      FAILED: 'bg-red-500',
      CANCELLED: 'bg-gray-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (!order) {
    return <div className="text-gray-500">Order not found</div>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Order #{order.id}</h2>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className={`px-4 py-2 rounded-full text-white font-semibold ${getStatusColor(order.status)}`}>
            {order.status}
          </span>
          <span className="text-gray-600 dark:text-gray-400">
            Total: ${parseFloat(order.totalAmount).toFixed(2)}
          </span>
        </div>

        <div className="mb-4">
          <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Shipping Address</h3>
          <p className="text-gray-600 dark:text-gray-400">{order.shippingAddress}</p>
        </div>

        <div className="mb-4">
          <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Items</h3>
          <div className="space-y-2">
            {order.items.map(item => (
              <div key={item.id} className="flex justify-between border-b pb-2">
                <span className="text-gray-900 dark:text-white">{item.product_name}</span>
                <span className="text-gray-600 dark:text-gray-400">
                  {item.quantity} x ${parseFloat(item.price).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {order.history && order.history.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Status History</h3>
            <div className="space-y-2">
              {order.history.map((entry, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{entry.status}</span>
                  <span className="text-gray-500 dark:text-gray-500">
                    {new Date(entry.changed_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderTracker;
