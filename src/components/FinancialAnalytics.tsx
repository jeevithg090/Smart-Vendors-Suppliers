import React, { useState, useMemo } from 'react';
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

interface FinancialAnalyticsProps {
  vendorId: Id<"vendors">;
}

// Move utility functions outside component to prevent re-creation on each render
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

const FinancialAnalytics: React.FC<FinancialAnalyticsProps> = ({ vendorId }) => {
  const [timeRange, setTimeRange] = useState<number>(6); // months

  // Memoize date calculations to prevent re-renders
  const dateRange = useMemo(() => {
    const endDate = Date.now();
    const startDate = endDate - (timeRange * 30 * 24 * 60 * 60 * 1000);
    return { startDate, endDate };
  }, [timeRange]);

  const monthlySpending = useQuery(api.financialAnalytics.getMonthlySpending, {
    vendorId,
    months: timeRange,
  });

  const spendingByCategory = useQuery(api.financialAnalytics.getSpendingByCategory, {
    vendorId,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const topSuppliers = useQuery(api.financialAnalytics.getTopSuppliers, {
    vendorId,
    limit: 5,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const costOptimizationRecommendations = useQuery(
    api.financialAnalytics.getCostOptimizationRecommendations,
    { vendorId }
  );

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  const totalSpending = spendingByCategory?.reduce((sum: number, item: any) => sum + item.amount, 0) || 0;

  // Memoize transformed data to prevent infinite re-renders
  const chartData = useMemo(() => ({
    monthlySpending: monthlySpending?.map((item: any) => ({
      ...item,
      monthFormatted: formatMonth(item.month)
    })) || [],
    topSuppliers: topSuppliers?.map((item: any) => ({
      name: item.supplier?.businessName || 'Unknown',
      amount: item.totalSpent
    })) || []
  }), [monthlySpending, topSuppliers]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Financial Analytics</h2>
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
            <p className="text-sm font-medium text-blue-600">Total Spending</p>
            <p className="text-2xl font-bold text-blue-800">{formatCurrency(totalSpending)}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-green-600">Average Monthly</p>
            <p className="text-2xl font-bold text-green-800">
              {formatCurrency(totalSpending / timeRange)}
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-purple-600">Top Category</p>
            <p className="text-2xl font-bold text-purple-800">
              {spendingByCategory?.[0]?.category || 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Monthly Spending Trend */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Spending Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData.monthlySpending}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="monthFormatted" />
            <YAxis tickFormatter={(value) => `₹${value / 1000}k`} />
            <Tooltip formatter={(value) => [formatCurrency(value as number), 'Amount']} />
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
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Spending by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={spendingByCategory}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ category, percent }: any) => `${category} ${(percent ? percent * 100 : 0).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="amount"
              >
                {spendingByCategory?.map((_entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [formatCurrency(value as number), 'Amount']} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Suppliers */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Suppliers</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.topSuppliers}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tickFormatter={(value) => `₹${value / 1000}k`} />
              <Tooltip formatter={(value) => [formatCurrency(value as number), 'Total Spent']} />
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
                        {recommendation.category}
                      </span>
                    </div>
                    <p className="text-gray-800">{recommendation.message}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Potential Savings</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(recommendation.potentialSavings)}
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
              Continue using the platform to get personalized cost-saving suggestions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialAnalytics;
