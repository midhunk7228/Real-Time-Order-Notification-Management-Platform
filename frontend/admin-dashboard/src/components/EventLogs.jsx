import { useState, useEffect } from 'react';
import { connectSocket, onOrderUpdate, offOrderUpdate } from '../services/socket';

const EventLogs = () => {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const socket = connectSocket();
    
    const handleUpdate = (data) => {
      setEvents(prev => [{
        id: Date.now(),
        type: data.status ? 'order-status-change' : 'order-update',
        orderId: data.orderId,
        status: data.status,
        timestamp: data.timestamp || new Date().toISOString(),
        data
      }, ...prev].slice(0, 100)); // Keep last 100 events
    };

    onOrderUpdate(handleUpdate);

    return () => {
      offOrderUpdate();
    };
  }, []);

  const filteredEvents = filter
    ? events.filter(e => e.type.includes(filter) || e.status === filter)
    : events;

  const getEventColor = (type) => {
    if (type.includes('status-change')) return 'bg-blue-100 dark:bg-blue-900';
    return 'bg-green-100 dark:bg-green-900';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Event Logs</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border rounded px-3 py-2 text-gray-900 dark:text-white dark:bg-gray-700"
        >
          <option value="">All Events</option>
          <option value="order-update">Order Update</option>
          <option value="order-status-change">Status Change</option>
        </select>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredEvents.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No events yet</p>
        ) : (
          filteredEvents.map(event => (
            <div
              key={event.id}
              className={`border rounded p-3 ${getEventColor(event.type)}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {event.type} - Order #{event.orderId}
                  </p>
                  {event.status && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Status: {event.status}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(event.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EventLogs;
