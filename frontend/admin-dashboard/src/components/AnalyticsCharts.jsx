import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { analyticsAPI } from '../services/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const AnalyticsCharts = () => {
  const [ordersPerDay, setOrdersPerDay] = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [statusDistribution, setStatusDistribution] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashboardData] = await Promise.all([
        analyticsAPI.getDashboard()
      ]);
      
      setOrdersPerDay(dashboardData.data.ordersPerDay || []);
      setRevenue(dashboardData.data.revenue || []);
      setStatusDistribution(dashboardData.data.statusDistribution || {});
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const statusData = [
    { name: 'Created', value: statusDistribution.created || 0 },
    { name: 'Confirmed', value: statusDistribution.confirmed || 0 },
    { name: 'Shipped', value: statusDistribution.shipped || 0 },
    { name: 'Delivered', value: statusDistribution.delivered || 0 },
    { name: 'Failed', value: statusDistribution.failed || 0 },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Analytics</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Orders Per Day</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={ordersPerDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="metric_date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Revenue</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="metric_date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="total_revenue" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsCharts;
