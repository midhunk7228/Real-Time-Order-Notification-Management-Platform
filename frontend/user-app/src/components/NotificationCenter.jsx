import { useState, useEffect } from 'react';
import { connectSocket, onOrderStatusChange, offOrderStatusChange } from '../services/socket';

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const handleStatusChange = (data) => {
      setNotifications(prev => [{
        id: Date.now(),
        type: 'order-update',
        message: `Order #${data.orderId} status changed to ${data.status}`,
        timestamp: new Date().toISOString(),
        orderId: data.orderId,
        status: data.status
      }, ...prev]);
    };

    const socket = connectSocket();
    onOrderStatusChange(handleStatusChange);

    return () => {
      offOrderStatusChange();
    };
  }, []);

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Notifications
          {notifications.length > 0 && (
            <span className="ml-2 bg-red-500 text-white text-sm px-2 py-1 rounded-full">
              {notifications.length}
            </span>
          )}
        </h2>
        {notifications.length > 0 && (
          <button
            onClick={clearNotifications}
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            Clear All
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No notifications</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {notifications.map(notif => (
            <div
              key={notif.id}
              className="border rounded p-3 bg-blue-50 dark:bg-gray-700"
            >
              <p className="text-gray-900 dark:text-white">{notif.message}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {new Date(notif.timestamp).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
