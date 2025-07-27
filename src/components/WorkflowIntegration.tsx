import React, { useState, useMemo, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
// import type { Id } from '../../convex/_generated/dataModel'

// Import all major components for workflow integration
import SupplierSearch from './SupplierSearch'
import RecommendationPanel from './RecommendationPanel'
import GroupOrderManager from './GroupOrderManager'
import { OrderManager } from './OrderManager'
import InventoryTracker from './InventoryTracker'
import PriceAlerts from './PriceAlerts'
import FinancialAnalytics from './FinancialAnalytics'
import { MessagingInterface } from './MessagingInterface'
import { NotificationCenter } from './NotificationCenter'
import { OrderPlacement } from './OrderPlacement';

interface WorkflowStep {
  id: string
  title: string
  description: string
  component: React.ComponentType<any>
  isCompleted: boolean
  isActive: boolean
  dependencies?: string[]
}

interface WorkflowIntegrationProps {
  initialStep?: string
}

const WorkflowIntegration: React.FC<WorkflowIntegrationProps> = ({ initialStep = 'discover' }) => {
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(initialStep)
  const [workflowData, setWorkflowData] = useState<any>({})
  
  // Add state for search, category, and supplier filter
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [supplier, setSupplier] = useState('');
  const [orderModal, setOrderModal] = useState<{ open: boolean, supplierId?: string } | null>(null);

  // Fetch all available inventory and all suppliers
  const allInventory = useQuery(api.inventory.getAvailableInventory, {});
  const allSuppliers = useQuery(api.suppliers.listAllSuppliers, {});

  // Compute filtered inventory for catalog
  const filteredInventory = useMemo(() => {
    if (!allInventory) return [];
    return allInventory.filter(item => {
      const matchesSearch = search === '' || item.itemName.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === '' || item.category === category;
      const matchesSupplier = supplier === '' || item.supplierId === supplier;
      return matchesSearch && matchesCategory && matchesSupplier;
    });
  }, [allInventory, search, category, supplier]);
  
  // Get vendor data
  const vendor = useQuery(api.vendors.getByUserId, 
    user ? { userId: user.id } : "skip"
  );
  
  const workflowState = useQuery(api.vendors.getWorkflowState,
    vendor ? { vendorId: vendor._id } : "skip"
  );

  const updateWorkflowState = useMutation(api.vendors.updateWorkflowState);

  const workflowSteps = [
    {
      id: 'discover',
      title: 'Discover Suppliers',
      description: 'Find trusted suppliers in your area',
      icon: '🔍',
      completed: workflowState?.discoveryCompleted || false,
      action: 'Search Suppliers',
      details: 'Use our smart search to find suppliers based on location, categories, and trust scores.'
    },
    {
      id: 'recommendations',
      title: 'View AI Recommendations',
      description: 'Get personalized supplier suggestions',
      icon: '🤖',
      completed: workflowState?.recommendationsViewed || false,
      action: 'View Recommendations',
      details: 'Our AI analyzes your preferences and suggests the best suppliers for your needs.'
    },
    {
      id: 'groupOrders',
      title: 'Join Group Orders',
      description: 'Save money with bulk purchasing',
      icon: '👥',
      completed: workflowState?.groupOrderParticipated || false,
      action: 'Browse Group Orders',
      details: 'Join other vendors to get wholesale prices and reduce costs.'
    },
    {
      id: 'firstOrder',
      title: 'Place Your First Order',
      description: 'Start sourcing with confidence',
      icon: '🛒',
      completed: workflowState?.firstOrderPlaced || false,
      action: 'Place Order',
      details: 'Place your first order with a verified supplier and track its progress.'
    },
    {
      id: 'inventory',
      title: 'Track Inventory',
      description: 'Monitor your stock levels',
      icon: '📦',
      completed: workflowState?.inventoryTracked || false,
      action: 'Setup Tracking',
      details: 'Keep track of your inventory and get alerts when items are running low.'
    },
    {
      id: 'priceAlerts',
      title: 'Set Price Alerts',
      description: 'Never miss a good deal',
      icon: '💰',
      completed: workflowState?.priceAlertsSet || false,
      action: 'Create Alerts',
      details: 'Get notified when prices drop for items you frequently purchase.'
    },
    {
      id: 'analytics',
      title: 'View Analytics',
      description: 'Understand your spending patterns',
      icon: '📊',
      completed: workflowState?.financialAnalyticsViewed || false,
      action: 'View Analytics',
      details: 'Analyze your spending patterns and optimize your purchasing decisions.'
    },
    {
      id: 'communication',
      title: 'Connect with Suppliers',
      description: 'Build lasting relationships',
      icon: '💬',
      completed: workflowState?.communicationUsed || false,
      action: 'Send Message',
      details: 'Communicate directly with suppliers to build trust and negotiate better deals.'
    }
  ];

  useEffect(() => {
    if (workflowState) {
      const completedSteps = workflowSteps.filter(step => step.completed).length;
      setCurrentStep(completedSteps);
    }
  }, [workflowState]);

  const handleStepAction = async (stepId: string) => {
    if (!vendor) return;

    // Update workflow state
    await updateWorkflowState({
      vendorId: vendor._id,
      currentStep: stepId,
      lastActivity: Date.now()
    });

    // Navigate to appropriate section based on step
    switch (stepId) {
      case 'discover':
        // Navigate to supplier search
        window.location.hash = '#suppliers';
        break;
      case 'recommendations':
        // Show recommendations
        break;
      case 'groupOrders':
        // Navigate to group orders
        window.location.hash = '#group-orders';
        break;
      case 'firstOrder':
        // Navigate to order placement
        break;
      case 'inventory':
        // Navigate to inventory tracking
        break;
      case 'priceAlerts':
        // Navigate to price alerts
        break;
      case 'analytics':
        // Navigate to analytics
        break;
      case 'communication':
        // Navigate to messaging
        break;
    }
  };

  if (!workflowState) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const completedSteps = workflowSteps.filter(step => step.completed).length;
  const progressPercentage = (completedSteps / workflowSteps.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner */}
      <div className="bg-gradient-to-r from-orange-100 to-orange-50 border-b border-orange-200 py-6 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-orange-800 mb-1">Smart Sourcing Workflow</h1>
            <p className="text-orange-700 text-sm">Follow this guided workflow to optimize your sourcing process.</p>
          </div>
          
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{completedSteps} of {workflowSteps.length} completed</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-orange-500 to-green-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>

          {progressPercentage === 100 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-green-800 font-medium">
                  Congratulations! You've completed the smart sourcing workflow.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Main Content Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
          {/* Main Content Area: Marketplace Catalog */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex flex-col md:flex-row md:items-end md:space-x-4 mb-4">
                <div className="flex-1 mb-2 md:mb-0">
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div className="mb-2 md:mb-0">
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">All Categories</option>
                    {[...new Set((allInventory||[]).map(i => i.category))].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <select
                    value={supplier}
                    onChange={e => setSupplier(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">All Suppliers</option>
                    {(allSuppliers||[]).map((sup: any) => (
                      <option key={sup._id} value={sup._id}>{sup.businessName}</option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Product Catalog Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quality</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredInventory.map(item => {
                      const supplierObj = (allSuppliers||[]).find((s: any) => s._id === item.supplierId);
                      return (
                        <tr key={item._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{item.itemName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{item.category}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{supplierObj?.businessName || '—'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{item.currentStock} {item.unit}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">₹{item.pricePerUnit.toFixed(2)}</div>
                            <div className="text-xs text-gray-500">per {item.unit}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{item.quality}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap space-x-2">
                            {/* Actions: Order, Group Order, Price Alert */}
                            <button
                              className="bg-orange-500 text-white px-3 py-1 rounded text-xs hover:bg-orange-600"
                              onClick={() => setOrderModal({ open: true, supplierId: item.supplierId })}
                            >Order</button>
                            <button className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600">Group Order</button>
                            <button className="bg-yellow-400 text-white px-3 py-1 rounded text-xs hover:bg-yellow-500">Price Alert</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {filteredInventory.length === 0 && (
                  <div className="text-center py-12 text-gray-500">No products found.</div>
                )}
              </div>
            </div>
            {/* Optionally, show workflow step content below the catalog if needed */}
            {/* {getCurrentStepComponent()} */}
          </div>
        </div>
      </div>

      {/* Floating Notification Center */}
      <div className="fixed bottom-4 right-4 z-50">
        <NotificationCenter isOpen={false} onClose={() => {}} />
      </div>
      {/* Order Modal */}
      {orderModal?.open && vendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <OrderPlacement
              supplierId={orderModal.supplierId as any}
              vendorId={vendor._id}
              onOrderPlaced={() => {
                setOrderModal(null);
                // Optionally show a toast or feedback
              }}
              onCancel={() => setOrderModal(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkflowIntegration;
