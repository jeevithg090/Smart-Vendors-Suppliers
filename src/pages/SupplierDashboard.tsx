import { useAuth } from '../contexts/AuthContext'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState, useEffect } from 'react'
import type { Id } from '../../convex/_generated/dataModel';
import InventoryForecast from '../components/InventoryForecast'
import FSSAIVerification from '../components/FSSAIVerification'
import VoiceQuery from '../components/VoiceQuery'
import { NotificationBell, NotificationCenter } from '../components/NotificationCenter';
import SupplierAnalytics from '../components/SupplierAnalytics';
import SmartPricingEngine from '../components/SmartPricingEngine';
import InventoryAutomation from '../components/InventoryAutomation';
import QualityAssurance from '../components/QualityAssurance';
import SupplierLoyalty from '../components/SupplierLoyalty';
import OrderTracking from '../components/OrderTracking';

interface InventoryItem {
  _id: string;
  itemName: string;
  category: string;
  currentStock: number;
  unit: string;
  pricePerUnit: number;
  minimumOrder: number;
  quality: string;
  isAvailable: boolean;
  supplierId: string;
  lastUpdated: number;
  expiryDate?: number;
}

interface Order {
  _id: string;
  status: string;
  totalAmount: number;
  items: any[];
  vendorId: string;
  createdAt: number;
}

interface SupplierProfile {
  _id: string;
  businessName: string;
  trustScore: number;
  categories: string[];
  isVerified: boolean;
  deliveryRadius: number;
  minimumOrder: number;
}

export default function SupplierDashboard() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'analytics' | 'profile' | 'pricing' | 'automation' | 'quality' | 'loyalty'>('dashboard')
  const [isProfileSetup, setIsProfileSetup] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<Id<'orders'> | null>(null);
  const [showOrderTracking, setShowOrderTracking] = useState<Id<'orders'> | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryItem | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({
    businessName: '',
    deliveryRadius: 0,
    minimumOrder: 0,
    categories: [] as string[]
  });

  // Get supplier profile by user ID
  const supplierProfile = useQuery(api.suppliers.getByUserId, { userId: user?.id || '' })
  
  // Get supplier inventory if profile exists
  const inventory = useQuery(api.inventory.getInventoryBySupplier, 
    supplierProfile?._id ? { supplierId: supplierProfile._id } : 'skip'
  )
  
  // Get orders for this supplier
  const orders = useQuery(api.orders.getOrdersBySupplier,
    supplierProfile?._id ? { supplierId: supplierProfile._id } : 'skip'
  )

  // Get supplier forecasts
  const forecasts = useQuery(api.suppliers.getSupplierForecasts, 
    supplierProfile?._id ? { supplierId: supplierProfile._id } : 'skip'
  )

  // Create supplier profile mutation
  const createSupplier = useMutation(api.suppliers.create)
  const addInventoryItem = useMutation(api.inventory.addInventoryItem)
  const updateInventoryItem = useMutation(api.inventory.updateInventoryItem)
  const updateOrderStatus = useMutation(api.orders.updateOrderStatus);
  const updateSupplierProfile = useMutation(api.suppliers.update);
  const [updatingOrderId, setUpdatingOrderId] = useState<Id<'orders'> | null>(null);

  // Check if supplier profile exists, if not show setup
  useEffect(() => {
    if (supplierProfile === null) {
      setIsProfileSetup(true)
    } else if (supplierProfile) {
      setIsProfileSetup(false)
      // Initialize edit form with current profile data
      setEditProfileForm({
        businessName: supplierProfile.businessName || '',
        deliveryRadius: supplierProfile.deliveryRadius || 10,
        minimumOrder: supplierProfile.minimumOrder || 500,
        categories: supplierProfile.categories || []
      })
    }
  }, [supplierProfile])

  // Calculate stats
  const stats = {
    activeOrders: orders?.filter((order: Order) => order.status === 'confirmed' || order.status === 'processing').length || 0,
    totalOrders: orders?.length || 0,
    availableProducts: inventory?.filter((item: InventoryItem) => item.isAvailable).length || 0,
    totalProducts: inventory?.length || 0,
    lowStockItems: inventory?.filter((item: InventoryItem) => item.currentStock < 10).length || 0,
    totalRevenue: orders?.reduce((sum: number, order: Order) => sum + order.totalAmount, 0) || 0
  }

  // Onboarding effect for first-time users
  useEffect(() => {
    if (supplierProfile && stats.totalOrders === 0) {
      setShowOnboarding(true);
    }
  }, [supplierProfile, stats.totalOrders]);

  // Profile setup form state
  const [profileForm, setProfileForm] = useState({
    businessName: '',
    ownerName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    categories: [] as string[],
    fssaiCertified: false,
    fssaiLicense: '',
    deliveryRadius: 10,
    minimumOrder: 500
  })

  // Product form state
  const [productForm, setProductForm] = useState({
    itemName: '',
    category: '',
    currentStock: 0,
    unit: '',
    pricePerUnit: 0,
    minimumOrder: 1,
    quality: 'good',
    description: '',
    expiryDate: ''
  })

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return

    try {
      await createSupplier({
        userId: user.id,
        businessName: profileForm.businessName,
        ownerName: profileForm.ownerName,
        email: user.email,
        phone: profileForm.phone,
        location: {
          address: profileForm.address,
          city: profileForm.city,
          state: profileForm.state,
          pincode: profileForm.pincode,
          coordinates: { lat: 0, lng: 0 } // Would use geocoding in real app
        },
        categories: profileForm.categories,
        fssaiCertified: profileForm.fssaiCertified,
        fssaiLicense: profileForm.fssaiLicense,
        businessHours: {
          open: "09:00",
          close: "18:00",
          days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        },
        deliveryRadius: profileForm.deliveryRadius,
        minimumOrder: profileForm.minimumOrder
      })
      setIsProfileSetup(false)
    } catch (error) {
      console.error('Error creating supplier profile:', error)
    }
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supplierProfile?._id) return

    try {
      await addInventoryItem({
        supplierId: supplierProfile._id,
        itemName: productForm.itemName,
        category: productForm.category,
        currentStock: productForm.currentStock,
        unit: productForm.unit,
        pricePerUnit: productForm.pricePerUnit,
        minimumOrder: productForm.minimumOrder,
        quality: productForm.quality,
        expiryDate: productForm.expiryDate ? new Date(productForm.expiryDate).getTime() : undefined
      })
      setProductForm({
        itemName: '',
        category: '',
        currentStock: 0,
        unit: '',
        pricePerUnit: 0,
        minimumOrder: 1,
        quality: 'good',
        description: '',
        expiryDate: ''
      })
      setShowAddProduct(false)
    } catch (error) {
      console.error('Error adding product:', error)
    }
  }

  const handleToggleAvailability = async (itemId: string, isAvailable: boolean) => {
    try {
      await updateInventoryItem({ id: itemId as Id<'inventory'>, isAvailable })
    } catch (error) {
      console.error('Error updating product availability:', error)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supplierProfile?._id) return

    try {
      await updateSupplierProfile({
        id: supplierProfile._id,
        businessName: editProfileForm.businessName,
        deliveryRadius: editProfileForm.deliveryRadius,
        minimumOrder: editProfileForm.minimumOrder,
        categories: editProfileForm.categories
      })
      setEditingProfile(false)
    } catch (error) {
      console.error('Error updating supplier profile:', error)
    }
  }

  const handleCategoryToggle = (category: string) => {
    setEditProfileForm(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }))
  }

  if (isProfileSetup) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-gradient-to-r from-green-600 to-green-700 shadow-lg">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-2xl mr-3">🏪</span>
                <h1 className="text-xl font-semibold text-white">Smart Suppliers - Setup Your Store</h1>
              </div>
              <div className="flex items-center space-x-4">
                <VoiceQuery userRole="supplier" className="mr-4" />
                <button
                  onClick={logout}
                  className="text-sm bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-md transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Complete Your Supplier Profile</h2>
            
            <form onSubmit={handleCreateProfile} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business Name *</label>
                  <input
                    type="text"
                    required
                    value={profileForm.businessName}
                    onChange={(e) => setProfileForm({...profileForm, businessName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Owner Name *</label>
                  <input
                    type="text"
                    required
                    value={profileForm.ownerName}
                    onChange={(e) => setProfileForm({...profileForm, ownerName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                  <input
                    type="text"
                    required
                    value={profileForm.city}
                    onChange={(e) => setProfileForm({...profileForm, city: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                <textarea
                  required
                  value={profileForm.address}
                  onChange={(e) => setProfileForm({...profileForm, address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
                  <input
                    type="text"
                    required
                    value={profileForm.state}
                    onChange={(e) => setProfileForm({...profileForm, state: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pincode *</label>
                  <input
                    type="text"
                    required
                    value={profileForm.pincode}
                    onChange={(e) => setProfileForm({...profileForm, pincode: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Radius (km)</label>
                  <input
                    type="number"
                    value={profileForm.deliveryRadius}
                    onChange={(e) => setProfileForm({...profileForm, deliveryRadius: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={profileForm.fssaiCertified}
                  onChange={(e) => setProfileForm({...profileForm, fssaiCertified: e.target.checked})}
                  className="mr-2"
                />
                <label className="text-sm text-gray-700">FSSAI Certified</label>
              </div>

              <button
                type="submit"
                className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Create Supplier Profile
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-600 to-green-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-2xl mr-3">🏪</span>
              <div>
                <h1 className="text-xl font-semibold text-white">Smart Suppliers</h1>
                <p className="text-green-100 text-sm">{supplierProfile?.businessName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-white/90">
                <div className="flex items-center">
                  <span className="text-yellow-300">★</span>
                  <span className="ml-1">{supplierProfile?.trustScore?.toFixed(1)}</span>
                  {supplierProfile?.isVerified && (
                    <span className="ml-2 bg-white/20 text-white px-2 py-0.5 rounded-full text-xs">Verified</span>
                  )}
                </div>
              </div>
              <VoiceQuery userRole="supplier" className="mr-4" />
              <NotificationBell onClick={() => setNotificationOpen(true)} />
              <button
                onClick={logout}
                className="text-sm bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-md transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <NotificationCenter isOpen={notificationOpen} onClose={() => setNotificationOpen(false)} />

      <div className="max-w-7xl mx-auto p-6">
        {/* Onboarding Banner */}
        {showOnboarding && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 animate-fade-in">
            <div className="flex items-center">
              <div className="text-blue-500 mr-3 text-2xl">👋</div>
              <div>
                <h3 className="text-blue-800 font-medium">Welcome to Smart Suppliers!</h3>
                <p className="text-blue-700 text-sm">
                  Get started by adding your first product, managing orders, or viewing analytics. Your products will be visible to vendors in your area.
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

        {/* Navigation Tabs - Supplier focused */}
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Supplier dashboard navigation">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
                { id: 'products', label: 'My Products', icon: '📦' },
                { id: 'orders', label: 'Order Management', icon: '📋' },
                { id: 'pricing', label: 'Smart Pricing', icon: '🤖' },
                { id: 'automation', label: 'Automation', icon: '⚙️' },
                { id: 'quality', label: 'Quality Control', icon: '🛡️' },
                { id: 'loyalty', label: 'Loyalty Program', icon: '🏆' },
                { id: 'analytics', label: 'Business Analytics', icon: '📈' },
                { id: 'profile', label: 'Store Profile', icon: '🏪' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-6 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <button 
                onClick={() => setShowAddProduct(true)}
                className="p-6 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-105 shadow-lg"
              >
                <div className="text-3xl mb-3">��</div>
                <div className="font-semibold text-lg">Add New Product</div>
                <div className="text-sm opacity-90">Upload items to your catalog</div>
              </button>
              
              <button 
                onClick={() => setActiveTab('orders')}
                className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg"
              >
                <div className="text-3xl mb-3">📋</div>
                <div className="font-semibold text-lg">Manage Orders</div>
                <div className="text-sm opacity-90">Process vendor orders</div>
              </button>
              
              <button 
                onClick={() => setActiveTab('analytics')}
                className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
              >
                <div className="text-3xl mb-3">📈</div>
                <div className="font-semibold text-lg">View Analytics</div>
                <div className="text-sm opacity-90">Track your performance</div>
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-gray-800">{stats.activeOrders}</div>
                    <div className="text-sm text-gray-600">Active Orders</div>
                  </div>
                  <div className="text-3xl text-blue-500">📋</div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-gray-800">{stats.availableProducts}</div>
                    <div className="text-sm text-gray-600">Available Products</div>
                  </div>
                  <div className="text-3xl text-green-500">📦</div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-yellow-500">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">{stats.lowStockItems}</div>
                    <div className="text-sm text-gray-600">Low Stock Alerts</div>
                  </div>
                  <div className="text-3xl text-yellow-500">⚠️</div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-green-600">₹{stats.totalRevenue.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Total Earnings</div>
                  </div>
                  <div className="text-3xl text-purple-500">����</div>
                </div>
              </div>
            </div>

            {/* AI Forecast Summary */}
            {forecasts && forecasts.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-800">AI Forecast Summary</h3>
                  <span className="text-sm text-gray-500">Next 7 days</span>
                </div>
                <div className="space-y-3">
                  {forecasts.slice(0, 3).map((forecast: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                      <div>
                        <div className="font-medium text-gray-900">{forecast.item}</div>
                        <div className="text-sm text-gray-600">
                          Predicted: {forecast.predictedQty.toFixed(1)} units
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm px-2 py-1 rounded-full font-medium ${
                          forecast.confidence >= 0.8 ? 'bg-green-100 text-green-800' :
                          forecast.confidence >= 0.6 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {Math.round(forecast.confidence * 100)}% confidence
                        </div>
                      </div>
                    </div>
                  ))}
                  {forecasts.length > 3 && (
                    <div className="text-center pt-2">
                      <button
                        onClick={() => setActiveTab('analytics')}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View all {forecasts.length} forecasts →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recent Orders */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Recent Orders</h3>
              {orders && orders.length > 0 ? (
                <div className="space-y-3">
                  {orders.slice(0, 5).map((order: Order) => (
                    <div key={order._id} className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                      <div>
                        <div className="font-semibold text-gray-800">Order #{order._id.slice(-6)}</div>
                        <div className="text-sm text-gray-600">{order.items.length} items ordered</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-green-600">₹{order.totalAmount}</div>
                        <div className={`text-xs px-2 py-1 rounded-full font-medium ${
                          order.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'delivered' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📋</div>
                  <h3 className="text-xl font-medium text-gray-700 mb-2">No Orders Yet</h3>
                  <p className="text-gray-500">Orders from vendors will appear here once you add products to your catalog</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            {/* Product Management Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">My Product Catalog</h2>
              <button
                onClick={() => setShowAddProduct(true)}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center shadow-lg"
              >
                <span className="mr-2">➕</span>
                Add New Product
              </button>
            </div>

            {/* Product Grid */}
            {inventory && inventory.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {inventory.map((item: InventoryItem) => (
                  <div key={item._id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800">{item.itemName}</h3>
                          <p className="text-sm text-gray-600">{item.category}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          item.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {item.isAvailable ? 'Available' : 'Out of Stock'}
                        </span>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Stock:</span>
                          <span className={`font-medium ${
                            item.currentStock < 10 ? 'text-red-600' : 'text-gray-800'
                          }`}>
                            {item.currentStock} {item.unit}
                            {item.currentStock < 10 && (
                              <span className="ml-1 text-red-500">⚠️</span>
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Price:</span>
                          <span className="font-semibold text-green-600">₹{item.pricePerUnit}/{item.unit}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Min Order:</span>
                          <span className="text-gray-800">{item.minimumOrder} {item.unit}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Quality:</span>
                          <span className="text-gray-800 capitalize">{item.quality}</span>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingProduct(item)}
                          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md text-sm transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleAvailability(item._id, !item.isAvailable)}
                          className={`flex-1 px-3 py-2 rounded-md text-sm transition-colors ${
                            item.isAvailable 
                              ? 'bg-red-500 hover:bg-red-600 text-white' 
                              : 'bg-green-500 hover:bg-green-600 text-white'
                          }`}
                        >
                          {item.isAvailable ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-xl font-medium text-gray-700 mb-2">No Products Yet</h3>
                <p className="text-gray-500 mb-6">Start by adding your first product to your catalog</p>
                <button
                  onClick={() => setShowAddProduct(true)}
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Add Your First Product
                </button>
              </div>
            )}
          </div>
        )}

        {/* Order Management Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-2">Order Management</h2>
              <p className="opacity-90">Process and fulfill vendor orders efficiently</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-6">Vendor Orders</h3>
              {orders === undefined ? (
                <div className="flex justify-center items-center p-8 animate-fade-in">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : orders.length > 0 ? (
                <div className="space-y-4">
                  {orders.map((order: Order) => (
                    <div key={order._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium">Order #{order._id.slice(-8)}</h4>
                          <p className="text-sm text-gray-600">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                          {order.vendor && (
                            <p className="text-sm text-blue-600">
                              {order.vendor.businessName}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-medium">₹{order.totalAmount}</div>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              order.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                              order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              order.status === 'processing' ? 'bg-purple-100 text-purple-800' :
                              order.status === 'shipped' ? 'bg-orange-100 text-orange-800' :
                              order.status === 'delivered' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {order.status}
                            </span>
                            {order.status === 'shipped' && (
                              <span className="bg-green-100 text-green-800 px-2 py-1 text-xs rounded-full">
                                📦 Shipped
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 mb-3">
                        {order.items.length} items ordered
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {order.status === 'pending' && (
                          <button
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs disabled:opacity-50"
                            disabled={updatingOrderId === order._id}
                            onClick={async () => {
                              setUpdatingOrderId(order._id as Id<'orders'>);
                              await updateOrderStatus({ orderId: order._id as Id<'orders'>, status: 'confirmed' });
                              setUpdatingOrderId(null);
                            }}
                          >
                            {updatingOrderId === order._id ? 'Confirming...' : 'Confirm'}
                          </button>
                        )}
                        {order.status === 'confirmed' && (
                          <button
                            className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 text-xs disabled:opacity-50"
                            disabled={updatingOrderId === order._id}
                            onClick={async () => {
                              setUpdatingOrderId(order._id as Id<'orders'>);
                              await updateOrderStatus({ orderId: order._id as Id<'orders'>, status: 'processing' });
                              setUpdatingOrderId(null);
                            }}
                          >
                            {updatingOrderId === order._id ? 'Processing...' : 'Process'}
                          </button>
                        )}
                        {order.status === 'processing' && (
                          <button
                            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs disabled:opacity-50"
                            disabled={updatingOrderId === order._id}
                            onClick={async () => {
                              setUpdatingOrderId(order._id as Id<'orders'>);
                              await updateOrderStatus({ orderId: order._id as Id<'orders'>, status: 'shipped' });
                              setUpdatingOrderId(null);
                            }}
                          >
                            {updatingOrderId === order._id ? 'Shipping...' : 'Mark as Shipped'}
                          </button>
                        )}
                        {order.status === 'shipped' && (
                          <button
                            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs disabled:opacity-50"
                            disabled={updatingOrderId === order._id}
                            onClick={async () => {
                              setUpdatingOrderId(order._id as Id<'orders'>);
                              await updateOrderStatus({ orderId: order._id as Id<'orders'>, status: 'delivered' });
                              setUpdatingOrderId(null);
                            }}
                          >
                            {updatingOrderId === order._id ? 'Delivering...' : 'Mark as Delivered'}
                          </button>
                        )}
                        <button
                          className="px-3 py-1 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 text-xs"
                          onClick={() => setSelectedOrderId(order._id as Id<'orders'>)}
                        >
                          Details
                        </button>
                        {(order.status === 'confirmed' || order.status === 'processing' || order.status === 'shipped') && (
                          <button
                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 text-xs"
                            onClick={() => setShowOrderTracking(order._id as Id<'orders'>)}
                          >
                            Manage Tracking
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">📋</div>
                  <h3 className="text-xl font-medium text-gray-700 mb-2">No Orders Received</h3>
                  <p className="text-gray-500 mb-6">Vendor orders will appear here once you have products in your catalog</p>
                  <button
                    onClick={() => setActiveTab('products')}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Manage Products
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && supplierProfile && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-2">Business Analytics</h2>
              <p className="opacity-90">Track your performance and grow your business</p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <SupplierAnalytics supplierId={supplierProfile._id} />
            </div>
            
            {/* AI Forecast Section */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-800">AI Demand Forecast</h3>
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">AI-Powered</span>
              </div>
              <InventoryForecast supplierId={supplierProfile._id} />
            </div>
          </div>
        )}

        {/* Smart Pricing Tab */}
        {activeTab === 'pricing' && supplierProfile && (
          <div className="space-y-6">
            <SmartPricingEngine supplierId={supplierProfile._id} />
          </div>
        )}

        {/* Automation Tab */}
        {activeTab === 'automation' && supplierProfile && (
          <div className="space-y-6">
            <InventoryAutomation supplierId={supplierProfile._id} />
          </div>
        )}

        {/* Quality Control Tab */}
        {activeTab === 'quality' && supplierProfile && (
          <div className="space-y-6">
            <QualityAssurance supplierId={supplierProfile._id} />
          </div>
        )}

        {/* Loyalty Program Tab */}
        {activeTab === 'loyalty' && supplierProfile && (
          <div className="space-y-6">
            <SupplierLoyalty supplierId={supplierProfile._id} />
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && supplierProfile && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-2">Store Profile</h2>
              <p className="opacity-90">Manage your store information and verification status</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-800">Business Information</h3>
                <button
                  onClick={() => setEditingProfile(!editingProfile)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    editingProfile
                      ? 'bg-gray-500 hover:bg-gray-600 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  {editingProfile ? 'Cancel' : 'Edit Profile'}
                </button>
              </div>

              {editingProfile ? (
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Business Name *</label>
                      <input
                        type="text"
                        required
                        value={editProfileForm.businessName}
                        onChange={(e) => setEditProfileForm({...editProfileForm, businessName: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Radius (km) *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        max="100"
                        value={editProfileForm.deliveryRadius}
                        onChange={(e) => setEditProfileForm({...editProfileForm, deliveryRadius: Number(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Order Amount (₹) *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={editProfileForm.minimumOrder}
                        onChange={(e) => setEditProfileForm({...editProfileForm, minimumOrder: Number(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Business Categories</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {['Vegetables', 'Fruits', 'Grains', 'Dairy', 'Spices', 'Meat', 'Seafood', 'Oil', 'Pulses', 'Snacks'].map((category) => (
                        <label key={category} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editProfileForm.categories.includes(category)}
                            onChange={() => handleCategoryToggle(category)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{category}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => setEditingProfile(false)}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
                    <div className="text-lg font-semibold text-gray-900">{supplierProfile.businessName}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Trust Score</label>
                    <div className="flex items-center">
                      <span className="text-yellow-500 mr-2 text-xl">★</span>
                      <span className="text-lg font-semibold text-gray-900">{supplierProfile.trustScore.toFixed(1)}/5.0</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Business Categories</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {supplierProfile.categories.map((category: string) => (
                        <span key={category} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Verification Status</label>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      supplierProfile.isVerified
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {supplierProfile.isVerified ? '��� Verified Store' : '⏳ Pending Verification'}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Radius</label>
                    <div className="text-lg font-semibold text-gray-900">{supplierProfile.deliveryRadius} km</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Order</label>
                    <div className="text-lg font-semibold text-gray-900">₹{supplierProfile.minimumOrder}</div>
                  </div>
                </div>
              )}
            </div>

            {/* FSSAI Verification Component */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
                <h3 className="text-lg font-semibold">FSSAI Verification</h3>
                <p className="text-sm opacity-90">Verify your food license to increase customer trust</p>
              </div>
              <div className="p-6">
                <FSSAIVerification 
                  supplierId={supplierProfile._id as any}
                  onVerificationComplete={(status) => {
                    // Refresh the page to update verification status
                    window.location.reload();
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Add Product Modal */}
        {showAddProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Add New Product</h2>
                  <button
                    onClick={() => setShowAddProduct(false)}
                    className="text-gray-500 hover:text-gray-800 text-xl"
                  >
                    ✕
                  </button>
                </div>
                
                <form onSubmit={handleAddProduct} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
                      <input
                        type="text"
                        required
                        value={productForm.itemName}
                        onChange={(e) => setProductForm({...productForm, itemName: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="e.g., Fresh Tomatoes"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                      <select
                        required
                        value={productForm.category}
                        onChange={(e) => setProductForm({...productForm, category: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="">Select Category</option>
                        <option value="Vegetables">Vegetables</option>
                        <option value="Fruits">Fruits</option>
                        <option value="Grains">Grains & Cereals</option>
                        <option value="Dairy">Dairy Products</option>
                        <option value="Spices">Spices & Herbs</option>
                        <option value="Meat">Meat & Poultry</option>
                        <option value="Seafood">Seafood</option>
                        <option value="Oil">Oil & Ghee</option>
                        <option value="Pulses">Pulses & Lentils</option>
                        <option value="Snacks">Snacks & Beverages</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Current Stock *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={productForm.currentStock}
                        onChange={(e) => setProductForm({...productForm, currentStock: Number(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Unit *</label>
                      <select
                        required
                        value={productForm.unit}
                        onChange={(e) => setProductForm({...productForm, unit: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="">Select Unit</option>
                        <option value="kg">Kilogram (kg)</option>
                        <option value="g">Gram (g)</option>
                        <option value="pieces">Pieces</option>
                        <option value="dozen">Dozen</option>
                        <option value="liter">Liter</option>
                        <option value="ml">Milliliter (ml)</option>
                        <option value="pack">Pack</option>
                        <option value="box">Box</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Price per Unit *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={productForm.pricePerUnit}
                        onChange={(e) => setProductForm({...productForm, pricePerUnit: Number(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="₹"
                      />
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Order *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={productForm.minimumOrder}
                        onChange={(e) => setProductForm({...productForm, minimumOrder: Number(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Quality Grade *</label>
                      <select
                        required
                        value={productForm.quality}
                        onChange={(e) => setProductForm({...productForm, quality: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="premium">Premium</option>
                        <option value="good">Good</option>
                        <option value="standard">Standard</option>
                        <option value="economy">Economy</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date (Optional)</label>
                      <input
                        type="date"
                        value={productForm.expiryDate}
                        onChange={(e) => setProductForm({...productForm, expiryDate: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => setShowAddProduct(false)}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors"
                    >
                      Add Product
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Order Details Modal */}
      {selectedOrderId && (
        <OrderDetailsModal orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
      )}

      {/* Order Tracking Modal */}
      {showOrderTracking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <OrderTracking
              orderId={showOrderTracking}
              userRole="supplier"
              onClose={() => setShowOrderTracking(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function OrderDetailsModal({ orderId, onClose }: { orderId: Id<'orders'>, onClose: () => void }) {
  const order = useQuery(api.orders.getOrderDetails, { orderId });
  if (!order) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-lg w-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Order Details</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-800">✕</button>
          </div>
          <div className="flex justify-center items-center h-32 animate-fade-in">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-lg w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Order Details</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">✕</button>
        </div>
        <div className="mb-4">
          <div className="font-medium mb-1">Order #{order._id?.slice ? order._id.slice(-8) : ''}</div>
          <div className="text-sm text-gray-600 mb-1">Status: <span className="font-semibold">{order.status}</span></div>
          <div className="text-sm text-gray-600 mb-1">Placed: {order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}</div>
          <div className="text-sm text-gray-600 mb-1">Total: ₹{(order as any).totalAmount ?? (order as any).totalCost ?? ''}</div>
        </div>
        <div className="mb-4">
          <div className="font-semibold mb-1">Items:</div>
          <ul className="list-disc pl-5 text-sm">
            {order.items?.map((item: any, idx: number) => (
              <li key={idx}>{(item as any).itemName} × {(item as any).quantity} @ ₹{(item as any).priceAtOrder ?? (item as any).pricePerUnit ?? ''}</li>
            ))}
          </ul>
        </div>
        <div className="mb-4">
          <div className="font-semibold mb-1">Vendor:</div>
          <div className="text-sm text-gray-700">{order.vendor?.businessName || 'N/A'}</div>
          <div className="text-sm text-gray-500">{order.vendor && 'email' in order.vendor ? order.vendor.email : ''}</div>
        </div>
        <div className="flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Close</button>
        </div>
      </div>
    </div>
  );
}
