import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

interface ExpenseTrackerProps {
  vendorId: Id<"vendors">;
}

const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({ vendorId }) => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const financialRecords = useQuery(api.financialAnalytics.getFinancialRecords, {
    vendorId,
    startDate: new Date(dateRange.startDate).getTime(),
    endDate: new Date(dateRange.endDate).getTime(),
    category: selectedCategory || undefined,
  });

  const spendingByCategory = useQuery(api.financialAnalytics.getSpendingByCategory, {
    vendorId,
    startDate: new Date(dateRange.startDate).getTime(),
    endDate: new Date(dateRange.endDate).getTime(),
  });

  const categories = ['Vegetables', 'Fruits', 'Spices', 'Grains', 'Dairy', 'Meat', 'Oil', 'Other'];

  const totalSpending = financialRecords?.reduce((sum: number, record: any) => sum + record.amount, 0) || 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-IN');
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Expense Tracker</h2>
        <div className="text-right">
          <p className="text-sm text-gray-600">Total Spending</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalSpending)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Date
          </label>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            End Date
          </label>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Category Summary */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Spending by Category</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {spendingByCategory?.map(({ category, amount }: any) => (
            <div key={category} className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-600">{category}</p>
              <p className="text-lg font-bold text-gray-800">{formatCurrency(amount)}</p>
              <p className="text-xs text-gray-500">
                {totalSpending > 0 ? Math.round((amount / totalSpending) * 100) : 0}% of total
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Transactions</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {financialRecords?.slice(0, 10).map((record: any) => (
                <tr key={record._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(record.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.itemName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {record.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(record.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {financialRecords && financialRecords.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No transactions found for the selected period.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseTracker;