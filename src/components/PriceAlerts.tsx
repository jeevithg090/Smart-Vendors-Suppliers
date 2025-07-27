import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

interface PriceAlertsProps {
  vendorId: Id<"vendors">;
}

interface PriceAlert {
  _id: Id<"priceAlerts">;
  vendorId: Id<"vendors">;
  itemName: string;
  targetPrice: number;
  currentPrice: number;
  supplierId?: Id<"suppliers">;
  isActive: boolean;
  lastTriggered?: number;
  createdAt: number;
}

const PriceAlerts: React.FC<PriceAlertsProps> = ({ vendorId }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAlert, setNewAlert] = useState({
    itemName: '',
    targetPrice: '',
    supplierId: '',
  });

  // Queries
  const priceAlerts = useQuery(api.priceAlerts.getVendorPriceAlerts, { vendorId });
  const triggeredAlerts = useQuery(api.priceAlerts.getTriggeredAlerts, { vendorId });
  const alertStats = useQuery(api.priceAlerts.getPriceAlertStats, { vendorId });

  // Mutations
  const createPriceAlert = useMutation(api.priceAlerts.createPriceAlert);
  const updatePriceAlert = useMutation(api.priceAlerts.updatePriceAlert);
  const deletePriceAlert = useMutation(api.priceAlerts.deletePriceAlert);

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newAlert.itemName || !newAlert.targetPrice) {
      return;
    }

    try {
      await createPriceAlert({
        vendorId,
        itemName: newAlert.itemName,
        targetPrice: parseFloat(newAlert.targetPrice),
        supplierId: newAlert.supplierId ? newAlert.supplierId as Id<"suppliers"> : undefined,
      });

      setNewAlert({ itemName: '', targetPrice: '', supplierId: '' });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create price alert:', error);
    }
  };

  const handleToggleAlert = async (alertId: Id<"priceAlerts">, isActive: boolean) => {
    try {
      await updatePriceAlert({
        alertId,
        isActive: !isActive,
      });
    } catch (error) {
      console.error('Failed to toggle price alert:', error);
    }
  };

  const handleDeleteAlert = async (alertId: Id<"priceAlerts">) => {
    if (confirm('Are you sure you want to delete this price alert?')) {
      try {
        await deletePriceAlert({ alertId });
      } catch (error) {
        console.error('Failed to delete price alert:', error);
      }
    }
  };

  const formatLastTriggered = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const isTriggered = (alert: PriceAlert) => {
    return alert.currentPrice > 0 && alert.currentPrice <= alert.targetPrice;
  };

  if (!priceAlerts || !alertStats) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Price Alerts</h2>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Create Alert
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{alertStats.totalAlerts}</div>
            <div className="text-sm text-blue-600">Total Alerts</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{alertStats.activeAlerts}</div>
            <div className="text-sm text-green-600">Active</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{alertStats.triggeredAlerts}</div>
            <div className="text-sm text-yellow-600">Triggered</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{alertStats.recentlyTriggered}</div>
            <div className="text-sm text-red-600">Last 24h</div>
          </div>
        </div>

        {/* Triggered Alerts Banner */}
        {triggeredAlerts && triggeredAlerts.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  {triggeredAlerts.length} price alert{triggeredAlerts.length > 1 ? 's' : ''} triggered!
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <ul className="list-disc list-inside space-y-1">
                    {triggeredAlerts.slice(0, 3).map((alert) => (
                      <li key={alert._id}>
                        {alert.itemName} is now ₹{alert.currentPrice.toFixed(2)} (target: ₹{alert.targetPrice.toFixed(2)})
                      </li>
                    ))}
                    {triggeredAlerts.length > 3 && (
                      <li>And {triggeredAlerts.length - 3} more...</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Alert Form */}
      {showCreateForm && (
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <form onSubmit={handleCreateAlert} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name
                </label>
                <input
                  type="text"
                  value={newAlert.itemName}
                  onChange={(e) => setNewAlert({ ...newAlert, itemName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Tomatoes"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Price (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newAlert.targetPrice}
                  onChange={(e) => setNewAlert({ ...newAlert, targetPrice: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Create Alert
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Alerts List */}
      <div className="divide-y divide-gray-200">
        {priceAlerts.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-500 text-lg mb-2">No price alerts yet</div>
            <div className="text-gray-400 text-sm">Create your first price alert to get notified when prices drop</div>
          </div>
        ) : (
          priceAlerts.map((alert) => (
            <div key={alert._id} className="p-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-medium text-gray-900">
                      {alert.itemName}
                    </h3>
                    {isTriggered(alert) && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Triggered
                      </span>
                    )}
                    {!alert.isActive && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Target Price:</span> ₹{alert.targetPrice.toFixed(2)}
                    </div>
                    <div>
                      <span className="font-medium">Current Price:</span> 
                      <span className={`ml-1 ${isTriggered(alert) ? 'text-green-600 font-medium' : ''}`}>
                        {alert.currentPrice > 0 ? `₹${alert.currentPrice.toFixed(2)}` : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Last Triggered:</span> {formatLastTriggered(alert.lastTriggered)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleToggleAlert(alert._id, alert.isActive)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      alert.isActive
                        ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                    }`}
                  >
                    {alert.isActive ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDeleteAlert(alert._id)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded-md hover:bg-red-200 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PriceAlerts;