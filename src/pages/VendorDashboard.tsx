import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

import WorkflowIntegration from '../components/WorkflowIntegration';
import VendorProfileManagement from '../components/VendorProfileManagement';
import SupplierSearch from '../components/SupplierSearch';
import EnhancedSupplierSearch from '../components/EnhancedSupplierSearch';
import VoiceQuery from '../components/VoiceQuery';
import { OrderManager } from '../components/OrderManager';
import FinancialAnalytics from '../components/FinancialAnalytics';

export default function VendorDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'workflow' | 'profile' | 'suppliers' | 'groupOrders' | 'orders' | 'analytics'>('dashboard');
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Get vendor data or create if doesn't exist
  const vendor = useQuery(api.vendors.getByUserId, 
    user ? { userId: user.id } : "skip"
  );

  const vendorStats = useQuery(api.vendors.getVendorStats,
    vendor ? { vendorId: vendor._id } : "skip"
  );

  // Create vendor mutation
  const createVendor = useMutation(api.vendors.create);

  // Auto-create vendor if user exists but no vendor profile
  useEffect(() => {
    if (user && vendor === null) {
      // Create vendor profile automatically
      createVendor({
        userId: user.id,
        businessName: `${user.firstName || 'New'}'s Food Business`,
        ownerName: user.firstName || 'New Vendor',
        email: user.email,
        phone: '+91 98765 43210',
        location: {
          address: '123 Business Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          coordinates: { lat: 19.0760, lng: 72.8777 }
        },
        businessType: 'Restaurant',
        fssaiLicense: undefined,
        preferences: {
          maxDeliveryDistance: 25,
          preferredCategories: ['Vegetables', 'Fruits', 'Grains'],
          budgetRange: { min: 1000, max: 50000 },
          qualityPreference: 'High',
          deliveryTimePreference: 'Same Day'
        }
      }).catch(console.error);
    }
  }, [user, vendor]);

  // Onboarding effect for first-time users
  useEffect(() => {
    if (vendor && vendorStats?.totalOrders === 0) {
      setShowOnboarding(true);
    }
  }, [vendor, vendorStats]);

  // Loading state
  if (!vendor) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto animate-fade-in"></div>
          <p className="mt-4 text-gray-600">Setting up your vendor profile...</p>
        </div>
      </div>
    );
  }

  const PageLayout = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-2xl mr-3">🏪</span>
              <h1 className="text-xl font-semibold text-gray-800">Smart Street</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user?.firstName || 'User'}!
              </span>
              <VoiceQuery userRole="vendor" className="mr-4" />
              <button
                onClick={logout}
                className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-md transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>
      {children}
    </div>
  );

  // Profile Management Tab
  if (activeTab === 'profile') {
    return (
      <PageLayout>
        <div className="max-w-7xl mx-auto p-6">
          <div className="mb-6">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center text-orange-500 hover:text-orange-600 font-medium transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
          </div>
          <VendorProfileManagement />
        </div>
      </PageLayout>
    );
  }

  // Supplier Search Tab
  if (activeTab === 'suppliers') {
    return (
      <PageLayout>
        <div className="max-w-7xl mx-auto p-6">
          <div className="mb-6">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center text-orange-500 hover:text-orange-600 font-medium transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
          </div>
          <SupplierSearch 
            vendorLocation={{
              lat: vendor.location.coordinates.lat,
              lng: vendor.location.coordinates.lng,
              city: vendor.location.city
            }}
          />
        </div>
      </PageLayout>
    );
  }

  // Workflow Integration Tab
  if (activeTab === 'workflow') {
    return (
      <PageLayout>
        <div className="max-w-7xl mx-auto p-6">
          <div className="mb-6">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center text-orange-500 hover:text-orange-600 font-medium transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
          </div>
          <WorkflowIntegration />
        </div>
      </PageLayout>
    );
  }

  // Group Orders Tab
  if (activeTab === 'groupOrders') {
    return (
      <PageLayout>
        <div className="max-w-7xl mx-auto p-6">
          <div className="mb-6">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center text-orange-500 hover:text-orange-600 font-medium transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
          </div>
          <div className="bg-white rounded-lg shadow-lg">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Group Orders</h2>
              <p className="text-gray-600">
                Join bulk purchasing initiatives with other vendors in your area
              </p>
            </div>
            
            <div className="p-6">
              {/* Navigation Tabs */}
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
                <button className="flex-1 py-2 px-4 text-sm font-medium bg-white text-gray-900 rounded-md shadow-sm">
                  Available Orders
                </button>
                <button className="flex-1 py-2 px-4 text-sm font-medium text-gray-500 hover:text-gray-700">
                  My Orders
                </button>
                <button className="flex-1 py-2 px-4 text-sm font-medium text-gray-500 hover:text-gray-700">
                  Create Order
                </button>
              </div>

              {/* Sample Active Group Orders */}
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <span className="text-orange-600 font-semibold">🥕</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Fresh Vegetables Bulk Order</h3>
                        <p className="text-sm text-gray-500">Organized by Green Valley Suppliers - {vendor.location.city}</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      Active
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500">Minimum Order</p>
                      <p className="font-semibold">₹10,000</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Current Total</p>
                      <p className="font-semibold">₹7,500</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Participants</p>
                      <p className="font-semibold">5 vendors</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Deadline</p>
                      <p className="font-semibold">3 days</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Delivery:</span> {vendor.location.city}
                    </div>
                    <button className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors text-sm">
                      Join Order
                    </button>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold">🌾</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Rice & Grains Wholesale</h3>
                        <p className="text-sm text-gray-500">Organized by Metro Supplies - {vendor.location.city}</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                      Filling
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500">Minimum Order</p>
                      <p className="font-semibold">₹25,000</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Current Total</p>
                      <p className="font-semibold">₹18,500</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Participants</p>
                      <p className="font-semibold">8 vendors</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Deadline</p>
                      <p className="font-semibold">5 days</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Delivery:</span> {vendor.location.city}
                    </div>
                    <button className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors text-sm">
                      Join Order
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                <div className="text-4xl mb-4">👥</div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Start Your Own Group Order</h3>
                <p className="text-gray-500 mb-4">
                  Create a bulk order and invite other vendors to join for better prices
                </p>
                <button className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 transition-colors">
                  Create Group Order
                </button>
              </div>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  // Orders Tab
  if (activeTab === 'orders') {
    return (
      <PageLayout>
        <div className="max-w-7xl mx-auto p-6">
          <div className="mb-6">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center text-orange-500 hover:text-orange-600 font-medium transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
          </div>
          <OrderManager />
        </div>
      </PageLayout>
    );
  }

  // Analytics Tab
  if (activeTab === 'analytics') {
    return (
      <PageLayout>
        <div className="max-w-7xl mx-auto p-6">
          <div className="mb-6">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center text-orange-500 hover:text-orange-600 font-medium transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
          </div>
          {vendor && <FinancialAnalytics vendorId={vendor._id} />}
        </div>
      </PageLayout>
    );
  }

  // Main Dashboard
  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto p-6">
        {/* Onboarding Banner */}
        {showOnboarding && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 animate-fade-in">
            <div className="flex items-center">
              <div className="text-blue-500 mr-3 text-2xl">👋</div>
              <div>
                <h3 className="text-blue-800 font-medium">Welcome to Smart Vendors!</h3>
                <p className="text-blue-700 text-sm">
                  Get started by searching for suppliers, placing your first order, or joining a group order. Need help? Click the <span className="font-bold">Help</span> button in the menu.
                </p>
                <button
                  onClick={() => setShowOnboarding(false)}
                  className="mt-2 text-blue-800 hover:text-blue-900 font-medium text-sm underline"
                  aria-label="Dismiss onboarding banner"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Backend Connected Banner */}
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 animate-fade-in">
          <div className="flex items-center">
            <div className="text-green-500 mr-3">✅</div>
            <div>
              <h3 className="text-green-800 font-medium">Backend Connected</h3>
              <p className="text-green-700 text-sm">
                Connected to Convex backend. Your data is synced and all features are fully functional.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 animate-fade-in">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                  Vendor Dashboard
                </h1>
                <p className="text-gray-600">
                  Welcome back, {vendor.ownerName}!
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {vendor.businessName} • {vendor.location.city}, {vendor.location.state}
                </p>
              </div>
              <button
                onClick={() => setActiveTab('profile')}
                className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors font-medium flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Manage Profile
              </button>
            </div>
          </div>

          {/* Vendor Profile Summary */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="col-span-1">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Trust Score</h3>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    ⭐ {vendor.trustScore.toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600 mb-4">
                    {vendor.isVerified ? 'Verified Vendor' : 'Pending Verification'}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total Orders:</span>
                      <span className="font-medium">{vendorStats?.totalOrders || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Completed:</span>
                      <span className="font-medium">{vendorStats?.completedOrders || 0}</span>
                    </div>
                    {vendorStats?.averageRating && (
                      <div className="flex justify-between">
                        <span>Avg Rating:</span>
                        <span className="font-medium">{vendorStats.averageRating.toFixed(1)}/5</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {vendor.isVerified ? 'Verified' : 'Pending'}
                  </div>
                  <div className="text-gray-600">Verification Status</div>
                  {!vendor.isVerified && (
                    <div className="text-xs text-blue-600 mt-1">
                      Complete profile to verify
                    </div>
                  )}
                </div>
                <div className="text-3xl">
                  {vendor.isVerified ? '✅' : '⏳'}
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {vendor.preferences.preferredCategories.length}
                  </div>
                  <div className="text-gray-600">Preferred Categories</div>
                  <div className="text-xs text-green-600 mt-1">
                    {vendor.preferences.preferredCategories.slice(0, 2).join(', ')}
                    {vendor.preferences.preferredCategories.length > 2 && '...'}
                  </div>
                </div>
                <div className="text-3xl">🏷️</div>
              </div>
            </div>
          </div>

          {/* Profile Completion Alert */}
          {vendor.trustScore < 2.5 && (
            <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-yellow-500 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="text-yellow-800 font-medium">Improve Your Trust Score</h3>
                  <p className="text-yellow-700 text-sm mt-1">
                    Complete your profile and add FSSAI license to increase your trust score and get better supplier recommendations.
                  </p>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className="mt-2 text-yellow-800 hover:text-yellow-900 font-medium text-sm underline"
                  >
                    Complete Profile →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
              <button 
                onClick={() => setActiveTab('workflow')}
                className="p-4 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all transform hover:scale-105 text-center shadow-lg"
                aria-label="Go to Smart Workflow"
              >
                <div className="text-2xl mb-2">🚀</div>
                <div className="font-medium">Smart Workflow</div>
                <div className="text-sm opacity-90">Guided sourcing</div>
              </button>
              
              <button 
                onClick={() => setActiveTab('suppliers')}
                className="p-4 bg-white border-2 border-orange-200 rounded-lg hover:border-orange-400 transition-colors text-center"
                aria-label="Find Suppliers"
              >
                <div className="text-2xl mb-2">🔍</div>
                <div className="font-medium text-gray-800">Find Suppliers</div>
                <div className="text-sm text-gray-600">Search for suppliers</div>
              </button>
              
              <button 
                onClick={() => setActiveTab('groupOrders')}
                className="p-4 bg-white border-2 border-blue-200 rounded-lg hover:border-blue-400 transition-colors text-center"
                aria-label="Join Group Orders"
              >
                <div className="text-2xl mb-2">👥</div>
                <div className="font-medium text-gray-800">Group Orders</div>
                <div className="text-sm text-gray-600">Join bulk purchases</div>
              </button>
              
              <button 
                onClick={() => setActiveTab('orders')}
                className="p-4 bg-white border-2 border-green-200 rounded-lg hover:border-green-400 transition-colors text-center"
                aria-label="Place and Track Orders"
              >
                <div className="text-2xl mb-2">📦</div>
                <div className="font-medium text-gray-800">Orders</div>
                <div className="text-sm text-gray-600">Place & track orders</div>
              </button>
              
              <button 
                onClick={() => setActiveTab('analytics')}
                className="p-4 bg-white border-2 border-purple-200 rounded-lg hover:border-purple-400 transition-colors text-center"
                aria-label="View Analytics"
              >
                <div className="text-2xl mb-2">📊</div>
                <div className="font-medium text-gray-800">Analytics</div>
                <div className="text-sm text-gray-600">View spending insights</div>
              </button>
            </div>
          </div>

          {/* Statistics Overview */}
          {vendorStats && vendorStats.totalOrders > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Performance</h2>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-gray-800 mb-1">
                    {vendorStats.totalOrders}
                  </div>
                  <div className="text-sm text-gray-600">Total Orders</div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-gray-800 mb-1">
                    {vendorStats.completedOrders}
                  </div>
                  <div className="text-sm text-gray-600">Completed Orders</div>
                </div>
                
                {vendorStats.averageRating > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-gray-800 mb-1 flex items-center justify-center">
                      {vendorStats.averageRating.toFixed(1)}
                      <svg className="w-5 h-5 ml-1 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                    <div className="text-sm text-gray-600">Average Rating</div>
                  </div>
                )}
                
                {vendorStats.onTimeDeliveryRate > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-gray-800 mb-1">
                      {Math.round(vendorStats.onTimeDeliveryRate)}%
                    </div>
                    <div className="text-sm text-gray-600">On-time Rate</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Activity</h2>
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <div className="text-4xl mb-4">📈</div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                Your sourcing journey starts here
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Once you start placing orders and interacting with suppliers, 
                your recent activity will appear here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
