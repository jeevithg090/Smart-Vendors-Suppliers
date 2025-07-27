import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

interface BudgetManagerProps {
  vendorId: Id<"vendors">;
}

interface BudgetItem {
  category: string;
  monthlyLimit: number;
  alertThreshold: number;
  currentSpending: number;
}

const BudgetManager: React.FC<BudgetManagerProps> = ({ vendorId }) => {
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [newBudget, setNewBudget] = useState({
    category: '',
    monthlyLimit: 0,
    alertThreshold: 80,
  });

  const budgetAlerts = useQuery(api.financialAnalytics.checkBudgetAlerts, {
    vendorId,
  });

  const currentMonthSpending = useQuery(api.financialAnalytics.getSpendingByCategory, {
    vendorId,
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime(),
    endDate: Date.now(),
  });

  // Mock budget data - in a real app, this would come from a budgets table
  const [budgets, setBudgets] = useState<BudgetItem[]>([
    { category: 'Vegetables', monthlyLimit: 10000, alertThreshold: 80, currentSpending: 0 },
    { category: 'Spices', monthlyLimit: 5000, alertThreshold: 75, currentSpending: 0 },
    { category: 'Grains', monthlyLimit: 8000, alertThreshold: 85, currentSpending: 0 },
    { category: 'Dairy', monthlyLimit: 6000, alertThreshold: 80, currentSpending: 0 },
  ]);

  // Update current spending from actual data
  const budgetsWithCurrentSpending = budgets.map(budget => {
    const spending = currentMonthSpending?.find((s: any) => s.category === budget.category);
    return {
      ...budget,
      currentSpending: spending?.amount || 0,
    };
  });

  const categories = ['Vegetables', 'Fruits', 'Spices', 'Grains', 'Dairy', 'Meat', 'Oil', 'Other'];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const getProgressColor = (percentage: number, alertThreshold: number) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= alertThreshold) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 border-red-400 text-red-800';
      case 'warning': return 'bg-yellow-100 border-yellow-400 text-yellow-800';
      default: return 'bg-blue-100 border-blue-400 text-blue-800';
    }
  };

  const handleAddBudget = () => {
    if (newBudget.category && newBudget.monthlyLimit > 0) {
      setBudgets([...budgets, {
        ...newBudget,
        currentSpending: 0,
      }]);
      setNewBudget({ category: '', monthlyLimit: 0, alertThreshold: 80 });
      setShowAddBudget(false);
    }
  };

  const handleDeleteBudget = (category: string) => {
    setBudgets(budgets.filter(b => b.category !== category));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Budget Manager</h2>
          <button
            onClick={() => setShowAddBudget(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Add Budget
          </button>
        </div>
      </div>

      {/* Budget Alerts */}
      {budgetAlerts && budgetAlerts.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Budget Alerts</h3>
          <div className="space-y-3">
            {budgetAlerts.map((alert: any, index: number) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-l-4 ${getAlertSeverityColor(alert.severity)}`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{alert.category}</p>
                    <p className="text-sm">
                      {alert.severity === 'critical' 
                        ? 'Budget exceeded!' 
                        : 'Approaching budget limit'
                      }
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{alert.percentage}%</p>
                    <p className="text-sm">
                      {formatCurrency(alert.spent)} / {formatCurrency(alert.limit)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Budget Overview */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Budget Overview</h3>
        <div className="space-y-4">
          {budgetsWithCurrentSpending.map((budget) => {
            const percentage = (budget.currentSpending / budget.monthlyLimit) * 100;
            const remaining = budget.monthlyLimit - budget.currentSpending;
            
            return (
              <div key={budget.category} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-gray-800">{budget.category}</h4>
                  <button
                    onClick={() => handleDeleteBudget(budget.category)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>
                
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">
                    {formatCurrency(budget.currentSpending)} / {formatCurrency(budget.monthlyLimit)}
                  </span>
                  <span className={`text-sm font-semibold ${
                    percentage >= 100 ? 'text-red-600' : 
                    percentage >= budget.alertThreshold ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {percentage.toFixed(1)}%
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      getProgressColor(percentage, budget.alertThreshold)
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  ></div>
                </div>
                
                <div className="flex justify-between text-sm text-gray-600">
                  <span>
                    Remaining: {formatCurrency(Math.max(remaining, 0))}
                  </span>
                  <span>
                    Alert at: {budget.alertThreshold}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Budget Modal */}
      {showAddBudget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Add New Budget</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={newBudget.category}
                  onChange={(e) => setNewBudget({ ...newBudget, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Category</option>
                  {categories.filter(cat => !budgets.some(b => b.category === cat)).map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Limit (₹)
                </label>
                <input
                  type="number"
                  value={newBudget.monthlyLimit || ''}
                  onChange={(e) => setNewBudget({ ...newBudget, monthlyLimit: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter amount"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alert Threshold (%)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newBudget.alertThreshold}
                  onChange={(e) => setNewBudget({ ...newBudget, alertThreshold: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddBudget(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddBudget}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Budget
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetManager;