import { useState } from 'react';

interface TrackingFeatureDemoProps {
  onClose: () => void;
}

export default function TrackingFeatureDemo({ onClose }: TrackingFeatureDemoProps) {
  const [activeDemo, setActiveDemo] = useState<'overview' | 'supplier' | 'vendor' | 'thirdparty'>('overview');

  const demoFeatures = [
    {
      id: 'supplier',
      title: 'Supplier Features',
      icon: '🏪',
      color: 'bg-green-500',
      features: [
        'Add tracking information to orders',
        'Support for third-party logistics providers',
        'Real-time status updates',
        'Delivery estimation and management',
        'Multiple tracking numbers per order',
        'Automatic customer notifications'
      ]
    },
    {
      id: 'vendor',
      title: 'Vendor Features',
      icon: '📱',
      color: 'bg-blue-500',
      features: [
        'Real-time order tracking',
        'Detailed delivery timeline',
        'Third-party shipment visibility',
        'Delivery notifications',
        'Order history with tracking',
        'Supplier communication'
      ]
    },
    {
      id: 'thirdparty',
      title: 'Third-Party Logistics',
      icon: '🚛',
      color: 'bg-orange-500',
      features: [
        'Delegate to external logistics providers',
        'Support for major carriers (Blue Dart, DTDC, FedEx, etc.)',
        'Enter tracking numbers from any provider',
        'Maintain transparency with vendors',
        'Automated status synchronization',
        'Flexible delivery management'
      ]
    }
  ];

  const trackingStates = [
    { status: 'pending', label: 'Order Placed', color: 'bg-yellow-100 text-yellow-800' },
    { status: 'confirmed', label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
    { status: 'processing', label: 'Processing', color: 'bg-purple-100 text-purple-800' },
    { status: 'shipped', label: 'Shipped', color: 'bg-orange-100 text-orange-800' },
    { status: 'in_transit', label: 'In Transit', color: 'bg-indigo-100 text-indigo-800' },
    { status: 'out_for_delivery', label: 'Out for Delivery', color: 'bg-green-100 text-green-800' },
    { status: 'delivered', label: 'Delivered', color: 'bg-green-100 text-green-800' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">📦 Order Tracking Features</h2>
              <p className="text-gray-600 mt-1">Enhanced tracking capabilities for suppliers and vendors</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-800 text-xl"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Navigation */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
            <button
              onClick={() => setActiveDemo('overview')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                activeDemo === 'overview'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveDemo('supplier')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                activeDemo === 'supplier'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              For Suppliers
            </button>
            <button
              onClick={() => setActiveDemo('vendor')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                activeDemo === 'vendor'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              For Vendors
            </button>
            <button
              onClick={() => setActiveDemo('thirdparty')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                activeDemo === 'thirdparty'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Third-Party
            </button>
          </div>

          {/* Overview */}
          {activeDemo === 'overview' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                  Complete Order Tracking Solution
                </h3>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Our enhanced tracking system provides real-time visibility into order status, 
                  supports third-party logistics providers, and keeps all parties informed throughout 
                  the delivery process.
                </p>
              </div>

              {/* Feature Cards */}
              <div className="grid md:grid-cols-3 gap-6">
                {demoFeatures.map((feature) => (
                  <div key={feature.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className={`w-12 h-12 ${feature.color} rounded-lg flex items-center justify-center text-white text-2xl mb-4`}>
                      {feature.icon}
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-3">{feature.title}</h4>
                    <ul className="space-y-2">
                      {feature.features.slice(0, 3).map((item, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-start">
                          <span className="text-green-500 mr-2">✓</span>
                          {item}
                        </li>
                      ))}
                      {feature.features.length > 3 && (
                        <li className="text-sm text-gray-500">
                          +{feature.features.length - 3} more features
                        </li>
                      )}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Tracking Timeline Demo */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Tracking Timeline Example</h4>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                  <div className="space-y-4">
                    {trackingStates.map((state, index) => (
                      <div key={state.status} className="relative flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium z-10 ${
                          index < 5 ? 'bg-green-500' : 'bg-gray-300'
                        }`}>
                          {index < 5 ? '✓' : index + 1}
                        </div>
                        <div className="ml-4 flex-1">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-900">{state.label}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${state.color}`}>
                              {index < 5 ? 'Completed' : 'Pending'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Feature-specific demos */}
          {activeDemo !== 'overview' && (
            <div className="space-y-6">
              {demoFeatures
                .filter(feature => feature.id === activeDemo)
                .map(feature => (
                  <div key={feature.id}>
                    <div className="text-center mb-6">
                      <div className={`w-16 h-16 ${feature.color} rounded-lg flex items-center justify-center text-white text-3xl mx-auto mb-4`}>
                        {feature.icon}
                      </div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">{feature.title}</h3>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-3">Key Features</h4>
                        <ul className="space-y-3">
                          {feature.features.map((item, index) => (
                            <li key={index} className="text-gray-600 flex items-start">
                              <span className="text-green-500 mr-3 text-lg">✓</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold text-gray-800 mb-3">How It Works</h4>
                        <div className="space-y-3 text-sm text-gray-600">
                          {activeDemo === 'supplier' && (
                            <>
                              <p><strong>1.</strong> Navigate to your Order Management tab</p>
                              <p><strong>2.</strong> Click "Add Tracking" on confirmed orders</p>
                              <p><strong>3.</strong> Enter tracking details or delegate to third-party</p>
                              <p><strong>4.</strong> Update status as order progresses</p>
                              <p><strong>5.</strong> Vendors receive automatic notifications</p>
                            </>
                          )}
                          {activeDemo === 'vendor' && (
                            <>
                              <p><strong>1.</strong> Go to Orders tab to view your orders</p>
                              <p><strong>2.</strong> Click "Track Order" to see detailed status</p>
                              <p><strong>3.</strong> View real-time updates and timeline</p>
                              <p><strong>4.</strong> Receive notifications for major updates</p>
                              <p><strong>5.</strong> Contact supplier if needed</p>
                            </>
                          )}
                          {activeDemo === 'thirdparty' && (
                            <>
                              <p><strong>1.</strong> Supplier chooses third-party option</p>
                              <p><strong>2.</strong> Enter provider name and tracking number</p>
                              <p><strong>3.</strong> System maintains transparency for vendor</p>
                              <p><strong>4.</strong> All parties receive status updates</p>
                              <p><strong>5.</strong> Delivery confirmation is automated</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Call to Action */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
            <div className="flex items-center">
              <div className="text-blue-500 mr-3 text-2xl">🚀</div>
              <div>
                <h3 className="text-blue-800 font-medium">Ready to Get Started?</h3>
                <p className="text-blue-700 text-sm mt-1">
                  The tracking features are now available in both vendor and supplier dashboards. 
                  Start using them to provide better visibility and communication throughout your order fulfillment process.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
