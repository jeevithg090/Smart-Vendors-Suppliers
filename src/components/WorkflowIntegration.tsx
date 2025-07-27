import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../contexts/AuthContext';

export default function WorkflowIntegration() {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  
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
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Smart Sourcing Workflow</h2>
          <p className="text-gray-600 mb-4">
            Follow this guided workflow to optimize your sourcing process and save money
          </p>
          
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

        {/* Workflow Steps */}
        <div className="p-6">
          <div className="space-y-4">
            {workflowSteps.map((step, index) => (
              <div 
                key={step.id}
                className={`border rounded-lg p-4 transition-all duration-200 ${
                  step.completed 
                    ? 'border-green-200 bg-green-50' 
                    : index === currentStep
                    ? 'border-orange-200 bg-orange-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                      step.completed 
                        ? 'bg-green-500 text-white' 
                        : index === currentStep
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {step.completed ? '✓' : step.icon}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className={`font-semibold ${
                        step.completed ? 'text-green-800' : 'text-gray-800'
                      }`}>
                        {step.title}
                      </h3>
                      <p className={`text-sm ${
                        step.completed ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {step.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {step.details}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {step.completed ? (
                      <span className="text-green-600 font-medium text-sm">Completed</span>
                    ) : (
                      <button
                        onClick={() => handleStepAction(step.id)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          index === currentStep
                            ? 'bg-orange-500 text-white hover:bg-orange-600'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {step.action}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tips Section */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-800 mb-3">💡 Pro Tips</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start space-x-2">
              <span className="text-orange-500">•</span>
              <span className="text-gray-600">
                Complete your profile to get better supplier recommendations
              </span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-orange-500">•</span>
              <span className="text-gray-600">
                Join group orders to save up to 30% on bulk purchases
              </span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-orange-500">•</span>
              <span className="text-gray-600">
                Set price alerts for frequently purchased items
              </span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-orange-500">•</span>
              <span className="text-gray-600">
                Build relationships with suppliers for better deals
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}