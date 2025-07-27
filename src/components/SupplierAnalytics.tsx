import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts';

interface SupplierAnalyticsProps {
  supplierId: Id<'suppliers'>;
}

const SupplierAnalytics: React.FC<SupplierAnalyticsProps> = ({ supplierId }) => {
  const [timeRange, setTimeRange] = useState<number>(6); // months

  const revenueByCategory = useQuery(api.financialAnalytics.getSupplierRevenueByCategory, {
    supplierId,
    startDate: Date.now() - (timeRange * 30 * 24 * 60 * 60 * 1000),
    endDate: Date.now(),
  });

  const monthlyRevenue = useQuery(api.financialAnalytics.getSupplierMonthlyRevenue, {
    supplierId,
    months: timeRange,
  });

  const topProducts = useQuery(api.financialAnalytics.getSupplierTopProducts, {
    supplierId,
    limit: 5,
    startDate: Date.now() - (timeRange * 30 * 24 * 60 * 60 * 1000),
    endDate: Date.now(),
  });

  const costOptimizationRecommendations = useQuery(
    api.financialAnalytics.getSupplierCostOptimizationRecommendations,
    { supplierId }
  );

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-IN', {
      month: 'short',
      year: '2-digit',
    });
  };

  const totalRevenue = revenueByCategory?.reduce((sum: number, item: any) => sum + item.amount, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Supplier Analytics</h2>
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Time Range:</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={3}>Last 3 months</option>
              <option value={6}>Last 6 months</option>
              <option value={12}>Last 12 months</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-blue-600">Total Revenue</p>
            <p className="text-2xl font-bold text-blue-800">{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-green-600">Average Monthly</p>
            <p className="text-2xl font-bold text-green-800">
              {formatCurrency(totalRevenue / timeRange)}
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-purple-600">Top Product</p>
            <p className="text-2xl font-bold text-purple-800">
              {topProducts?.[0]?.itemName || 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Monthly Revenue Trend */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Revenue Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyRevenue?.map((item: any) => ({
            ...item,
            monthFormatted: formatMonth(item.month)
          }))}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="monthFormatted" />
            <YAxis tickFormatter={(value) => `₹${value / 1000}k`} />
            <Tooltip formatter={(value) => [formatCurrency(value as number), 'Revenue']} />
            <Line 
              type="monotone" 
              dataKey="amount" 
              stroke="#2563eb" 
              strokeWidth={2}
              dot={{ fill: '#2563eb' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={revenueByCategory}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ category, percent }: any) => `${category} ${(percent ? percent * 100 : 0).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="amount"
              >
                {revenueByCategory?.map((_entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [formatCurrency(value as number), 'Revenue']} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Products</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProducts?.map((item: any) => ({
              name: item.itemName,
              amount: item.amount
            }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tickFormatter={(value) => `₹${value / 1000}k`} />
              <Tooltip formatter={(value) => [formatCurrency(value as number), 'Revenue']} />
              <Bar dataKey="amount" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cost Optimization Recommendations */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Cost Optimization Recommendations</h3>
        {costOptimizationRecommendations && costOptimizationRecommendations.length > 0 ? (
          <div className="space-y-4">
            {costOptimizationRecommendations.map((recommendation: any, index: number) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  recommendation.priority === 'high'
                    ? 'bg-red-50 border-red-400'
                    : recommendation.priority === 'medium'
                    ? 'bg-yellow-50 border-yellow-400'
                    : 'bg-blue-50 border-blue-400'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          recommendation.priority === 'high'
                            ? 'bg-red-100 text-red-800'
                            : recommendation.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {recommendation.priority.toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-gray-600">
                        {recommendation.itemName || recommendation.category}
                      </span>
                    </div>
                    <p className="text-gray-800">{recommendation.message}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Potential Revenue</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(recommendation.potentialRevenue || 0)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No optimization recommendations available at this time.</p>
            <p className="text-sm text-gray-400 mt-2">
              Continue using the platform to get personalized suggestions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplierAnalytics; 