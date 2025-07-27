import React, { useState, useMemo } from 'react'
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
  )
  
  // Get workflow state
  const workflowState = useQuery(api.vendors.getWorkflowState,
    vendor ? { vendorId: vendor._id } : "skip"
  )
  
  // Update workflow state mutation
  const updateWorkflowState = useMutation(api.vendors.updateWorkflowState)

  // Define the complete user workflow
  const workflowSteps: WorkflowStep[] = [
    {
      id: 'discover',
      title: 'Discover Suppliers',
      description: 'Find and explore suppliers based on your needs and location',
      component: SupplierSearch,
      isCompleted: workflowState?.discoveryCompleted || false,
      isActive: currentStep === 'discover'
    },
    {
      id: 'recommendations',
      title: 'AI Recommendations',
      description: 'Get personalized supplier recommendations based on your preferences',
      component: RecommendationPanel,
      isCompleted: workflowState?.recommendationsViewed || false,
      isActive: currentStep === 'recommendations',
      dependencies: ['discover']
    },
    {
      id: 'group-orders',
      title: 'Group Orders',
      description: 'Join or create group orders to get better prices',
      component: GroupOrderManager,
      isCompleted: workflowState?.groupOrderParticipated || false,
      isActive: currentStep === 'group-orders'
    },
    {
      id: 'place-order',
      title: 'Place Orders',
      description: 'Place individual or group orders with selected suppliers',
      component: OrderManager,
      isCompleted: workflowState?.firstOrderPlaced || false,
      isActive: currentStep === 'place-order',
      dependencies: ['discover']
    },
    {
      id: 'track-inventory',
      title: 'Track Inventory',
      description: 'Monitor supplier inventory and get real-time updates',
      component: InventoryTracker,
      isCompleted: workflowState?.inventoryTracked || false,
      isActive: currentStep === 'track-inventory',
      dependencies: ['place-order']
    },
    {
      id: 'price-alerts',
      title: 'Price Monitoring',
      description: 'Set up price alerts and monitor market trends',
      component: PriceAlerts,
      isCompleted: workflowState?.priceAlertsSet || false,
      isActive: currentStep === 'price-alerts'
    },
    {
      id: 'financial-tracking',
      title: 'Financial Analytics',
      description: 'Track expenses and analyze spending patterns',
      component: FinancialAnalytics,
      isCompleted: workflowState?.financialAnalyticsViewed || false,
      isActive: currentStep === 'financial-tracking',
      dependencies: ['place-order']
    },
    {
      id: 'communication',
      title: 'Communication Hub',
      description: 'Communicate with suppliers and manage notifications',
      component: MessagingInterface,
      isCompleted: workflowState?.communicationUsed || false,
      isActive: currentStep === 'communication'
    }
  ]

  // Handle step navigation
  const navigateToStep = async (stepId: string) => {
    const step = workflowSteps.find(s => s.id === stepId)
    if (!step) return

    // Check dependencies
    if (step.dependencies) {
      const unmetDependencies = step.dependencies.filter(depId => {
        const depStep = workflowSteps.find(s => s.id === depId)
        return !depStep?.isCompleted
      })

      if (unmetDependencies.length > 0) {
        alert(`Please complete the following steps first: ${unmetDependencies.join(', ')}`)
        return
      }
    }

    setCurrentStep(stepId)
    
    // Update workflow state in database
    if (vendor) {
      await updateWorkflowState({
        vendorId: vendor._id,
        currentStep: stepId,
        lastActivity: Date.now()
      })
    }
  }

  // Mark step as completed
  const markStepCompleted = async (stepId: string) => {
    if (!vendor) return

    const updateData: any = {
      vendorId: vendor._id,
      lastActivity: Date.now()
    }

    // Set specific completion flags
    switch (stepId) {
      case 'discover':
        updateData.discoveryCompleted = true
        break
      case 'recommendations':
        updateData.recommendationsViewed = true
        break
      case 'group-orders':
        updateData.groupOrderParticipated = true
        break
      case 'place-order':
        updateData.firstOrderPlaced = true
        break
      case 'track-inventory':
        updateData.inventoryTracked = true
        break
      case 'price-alerts':
        updateData.priceAlertsSet = true
        break
      case 'financial-tracking':
        updateData.financialAnalyticsViewed = true
        break
      case 'communication':
        updateData.communicationUsed = true
        break
    }

    await updateWorkflowState(updateData)
  }

  // Get current step component
  const getCurrentStepComponent = () => {
    const step = workflowSteps.find(s => s.id === currentStep)
    if (!step) return null

    const Component = step.component
    return (
      <Component
        onComplete={() => markStepCompleted(currentStep)}
        workflowData={workflowData}
        onDataUpdate={(data: any) => setWorkflowData((prev: any) => ({ ...prev, ...data }))}
        vendor={vendor}
      />
    )
  }

  // Calculate workflow progress
  const completedSteps = workflowSteps.filter(step => step.isCompleted).length
  const progressPercentage = (completedSteps / workflowSteps.length) * 100

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner */}
      <div className="bg-gradient-to-r from-orange-100 to-orange-50 border-b border-orange-200 py-6 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-orange-800 mb-1">Smart Sourcing Workflow</h1>
            <p className="text-orange-700 text-sm">Follow this guided workflow to optimize your sourcing process.</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Workflow Navigation Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Workflow Steps
              </h2>
              
              <nav className="space-y-2">
                {workflowSteps.map((step, index) => {
                  const isDisabled = step.dependencies?.some(depId => {
                    const depStep = workflowSteps.find(s => s.id === depId)
                    return !depStep?.isCompleted
                  })

                  return (
                    <button
                      key={step.id}
                      onClick={() => navigateToStep(step.id)}
                      disabled={isDisabled}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        step.isActive
                          ? 'bg-orange-100 text-orange-800 border-l-4 border-orange-500'
                          : step.isCompleted
                          ? 'bg-green-50 text-green-800 hover:bg-green-100'
                          : isDisabled
                          ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
                          step.isCompleted
                            ? 'bg-green-500 text-white'
                            : step.isActive
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-300 text-gray-600'
                        }`}>
                          {step.isCompleted ? '✓' : index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{step.title}</div>
                          <div className="text-xs opacity-75 mt-1">
                            {step.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </nav>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => navigateToStep('place-order')}
                  className="w-full bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Quick Order
                </button>
                <button
                  onClick={() => navigateToStep('group-orders')}
                  className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Join Group Order
                </button>
                <button
                  onClick={() => navigateToStep('communication')}
                  className="w-full bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                >
                  Messages
                </button>
              </div>
            </div>
          </div>

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
  )
}

export default WorkflowIntegration
