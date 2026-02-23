import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

interface AutomationRule {
  id: string;
  type: 'restock' | 'priceUpdate' | 'qualityAlert' | 'expiryAlert';
  condition: string;
  action: string;
  isActive: boolean;
  triggerThreshold: number;
  lastTriggered?: Date;
}

interface InventoryAlert {
  id: string;
  type: 'lowStock' | 'expiringSoon' | 'qualityIssue' | 'priceOpportunity';
  itemName: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
  timestamp: Date;
  action?: string;
}

interface Props {
  supplierId: Id<'suppliers'>;
}

export default function InventoryAutomation({ supplierId }: Props) {
  const [activeTab, setActiveTab] = useState<'rules' | 'alerts' | 'insights'>('alerts');
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([
    {
      id: '1',
      type: 'restock',
      condition: 'Stock falls below 10 units',
      action: 'Auto-reorder from preferred supplier',
      isActive: true,
      triggerThreshold: 10,
      lastTriggered: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    },
    {
      id: '2',
      type: 'priceUpdate',
      condition: 'Market price changes by >15%',
      action: 'Update pricing automatically',
      isActive: false,
      triggerThreshold: 15
    },
    {
      id: '3',
      type: 'expiryAlert',
      condition: 'Items expire within 3 days',
      action: 'Apply 20% discount automatically',
      isActive: true,
      triggerThreshold: 3
    },
    {
      id: '4',
      type: 'qualityAlert',
      condition: 'Quality rating drops below 3.5',
      action: 'Remove from catalog temporarily',
      isActive: true,
      triggerThreshold: 3.5
    }
  ]);

  const inventory = useQuery(api.inventory.getInventoryBySupplier, { supplierId });
  const updateInventoryItem = useMutation(api.inventory.updateInventoryItem);

  // Generate dynamic alerts based on current inventory
  const generateAlerts = (): InventoryAlert[] => {
    if (!inventory) return [];

    const alerts: InventoryAlert[] = [];

    inventory.forEach(item => {
      // Low stock alerts
      if (item.currentStock < 15) {
        alerts.push({
          id: `low-${item._id}`,
          type: 'lowStock',
          itemName: item.itemName,
          message: `Only ${item.currentStock} ${item.unit} remaining`,
          severity: item.currentStock < 5 ? 'high' : 'medium',
          timestamp: new Date(),
          action: 'Reorder now'
        });
      }

      // Expiry alerts
      if (item.expiryDate) {
        const daysToExpiry = Math.ceil((item.expiryDate - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysToExpiry <= 5 && daysToExpiry > 0) {
          alerts.push({
            id: `expiry-${item._id}`,
            type: 'expiringSoon',
            itemName: item.itemName,
            message: `Expires in ${daysToExpiry} days`,
            severity: daysToExpiry <= 2 ? 'high' : 'medium',
            timestamp: new Date(),
            action: 'Apply discount'
          });
        }
      }

      // Price opportunity alerts
      const randomMarketChange = Math.random() * 30 - 15; // -15% to +15%
      if (Math.abs(randomMarketChange) > 10) {
        alerts.push({
          id: `price-${item._id}`,
          type: 'priceOpportunity',
          itemName: item.itemName,
          message: `Market price ${randomMarketChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(randomMarketChange).toFixed(1)}%`,
          severity: 'low',
          timestamp: new Date(),
          action: 'Adjust pricing'
        });
      }
    });

    return alerts.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  };

  const alerts = generateAlerts();

  const toggleRule = (ruleId: string) => {
    setAutomationRules(prev =>
      prev.map(rule =>
        rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
      )
    );
  };

  const handleAlertAction = async (alert: InventoryAlert) => {
    const item = inventory?.find(inv => alert.itemName === inv.itemName);
    if (!item) return;

    try {
      switch (alert.type) {
        case 'expiringSoon':
          // Apply discount
          const discountedPrice = item.pricePerUnit * 0.8;
          await updateInventoryItem({
            id: item._id as Id<'inventory'>,
            pricePerUnit: discountedPrice
          });
          break;
        case 'lowStock':
          // In a real app, this would trigger reorder process
          console.log(`Reordering ${item.itemName}`);
          break;
        case 'priceOpportunity':
          // This would update pricing based on market conditions
          console.log(`Updating price for ${item.itemName}`);
          break;
      }
    } catch (error) {
      console.error('Error handling alert action:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">⚙️ Inventory Automation</h2>
            <p className="opacity-90">Intelligent automation to manage your inventory efficiently</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{automationRules.filter(r => r.isActive).length}</div>
            <div className="text-sm opacity-90">Active Rules</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'alerts', label: 'Active Alerts', icon: '🚨', count: alerts.length },
              { id: 'rules', label: 'Automation Rules', icon: '⚙️', count: automationRules.filter(r => r.isActive).length },
              { id: 'insights', label: 'Smart Insights', icon: '💡' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors relative ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                    activeTab === tab.id
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Active Alerts</h3>
              <div className="flex space-x-2">
                <span className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">
                  {alerts.filter(a => a.severity === 'high').length} High
                </span>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
                  {alerts.filter(a => a.severity === 'medium').length} Medium
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {alerts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">✅</div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">No Active Alerts</h3>
                  <p className="text-gray-500">Your inventory is running smoothly!</p>
                </div>
              ) : (
                alerts.map(alert => (
                  <div
                    key={alert.id}
                    className={`border rounded-lg p-4 ${
                      alert.severity === 'high' ? 'border-red-200 bg-red-50' :
                      alert.severity === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                      'border-blue-200 bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="text-lg">
                            {alert.type === 'lowStock' ? '📦' :
                             alert.type === 'expiringSoon' ? '⏰' :
                             alert.type === 'qualityIssue' ? '⚠️' : '💰'}
                          </span>
                          <div>
                            <h4 className="font-medium text-gray-900">{alert.itemName}</h4>
                            <p className={`text-sm ${
                              alert.severity === 'high' ? 'text-red-700' :
                              alert.severity === 'medium' ? 'text-yellow-700' :
                              'text-blue-700'
                            }`}>
                              {alert.message}
                            </p>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {alert.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                      
                      {alert.action && (
                        <button
                          onClick={() => handleAlertAction(alert)}
                          className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                            alert.severity === 'high' ? 'bg-red-500 hover:bg-red-600 text-white' :
                            alert.severity === 'medium' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' :
                            'bg-blue-500 hover:bg-blue-600 text-white'
                          }`}
                        >
                          {alert.action}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Rules Tab */}
        {activeTab === 'rules' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Automation Rules</h3>
              <button className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-md font-medium transition-colors">
                + Add New Rule
              </button>
            </div>

            <div className="space-y-4">
              {automationRules.map(rule => (
                <div key={rule.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">
                        {rule.type === 'restock' ? '📦' :
                         rule.type === 'priceUpdate' ? '💰' :
                         rule.type === 'expiryAlert' ? '⏰' : '⚠️'}
                      </span>
                      <div>
                        <h4 className="font-medium text-gray-900 capitalize">{rule.type.replace(/([A-Z])/g, ' $1')}</h4>
                        <p className="text-sm text-gray-600">{rule.condition}</p>
                      </div>
                    </div>
                    
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rule.isActive}
                        onChange={() => toggleRule(rule.id)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    <strong>Action:</strong> {rule.action}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div>Threshold: {rule.triggerThreshold}{rule.type === 'priceUpdate' ? '%' : rule.type === 'expiryAlert' ? ' days' : ' units'}</div>
                    {rule.lastTriggered && (
                      <div>Last triggered: {rule.lastTriggered.toLocaleDateString()}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Insights Tab */}
        {activeTab === 'insights' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Smart Insights</h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-3">📈</span>
                  <h4 className="font-semibold text-green-800">Optimization Opportunity</h4>
                </div>
                <p className="text-green-700 text-sm mb-3">
                  By enabling auto-restock rules, you could reduce stockouts by 85% and increase revenue by ₹15,000/month.
                </p>
                <button className="text-green-800 hover:text-green-900 font-medium text-sm underline">
                  Enable auto-restock →
                </button>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-3">🎯</span>
                  <h4 className="font-semibold text-blue-800">Demand Pattern</h4>
                </div>
                <p className="text-blue-700 text-sm mb-3">
                  Vegetables show 40% higher demand on weekends. Consider adjusting your restocking schedule accordingly.
                </p>
                <button className="text-blue-800 hover:text-blue-900 font-medium text-sm underline">
                  Adjust schedule →
                </button>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-3">💡</span>
                  <h4 className="font-semibold text-purple-800">Waste Reduction</h4>
                </div>
                <p className="text-purple-700 text-sm mb-3">
                  Implementing expiry alerts could reduce waste by 30% and save ₹8,000/month on spoiled inventory.
                </p>
                <button className="text-purple-800 hover:text-purple-900 font-medium text-sm underline">
                  Set up alerts →
                </button>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-3">⚡</span>
                  <h4 className="font-semibold text-orange-800">Quick Wins</h4>
                </div>
                <p className="text-orange-700 text-sm mb-3">
                  3 items are currently priced 20% below market rate. Adjusting prices could increase profit by ₹5,000/week.
                </p>
                <button className="text-orange-800 hover:text-orange-900 font-medium text-sm underline">
                  Review pricing →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
