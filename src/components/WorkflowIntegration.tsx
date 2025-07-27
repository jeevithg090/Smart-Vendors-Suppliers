import React, { useState } from 'react'
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
      {/* Workflow Progress Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900">
                Vendor Sourcing Workflow
              </h1>
              <div className="text-sm text-gray-600">
                Progress: {completedSteps}/{workflowSteps.length} steps completed
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
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

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm">
              {getCurrentStepComponent()}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Notification Center */}
      <div className="fixed bottom-4 right-4 z-50">
        <NotificationCenter isOpen={false} onClose={() => {}} />
      </div>
    </div>
  )
}

export default WorkflowIntegration
