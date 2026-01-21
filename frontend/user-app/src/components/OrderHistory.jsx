import { useState, useEffect } from 'react';
import { orderAPI } from '../services/api';
import { Link } from 'react-router-dom';

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadOrders();
  }, [filter]);

  const loadOrders = async () => {
    try {
      const params = filter ? { status: filter } : {};
      const response = await orderAPI.getAll(params);
      setOrders(response.data.orders);
    } catch (err) {
      console.error('Error loading orders:', err);
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Order History</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border rounded px-3 py-2 text-gray-900 dark:text-white dark:bg-gray-700"
        >
          <option value="">All Status</option>
          <option value="CREATED">Created</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="SHIPPED">Shipped</option>
          <option value="DELIVERED">Delivered</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      {orders.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No orders found</p>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="block border rounded p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Order #{order.id}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-gray-900 dark:text-white">
                    ${parseFloat(order.total_amount).toFixed(2)}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-white text-sm ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
