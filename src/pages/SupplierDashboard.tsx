import { useAuth } from '../contexts/AuthContext'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState, useEffect } from 'react'
import InventoryForecast from '../components/InventoryForecast'
import FSSAIVerification from '../components/FSSAIVerification'

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
}

export default function SupplierDashboard() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'orders' | 'forecast' | 'profile'>('overview')
  const [isProfileSetup, setIsProfileSetup] = useState(false)

  // Get supplier profile by user ID
  const supplierProfile = useQuery(api.suppliers.getByUserId, { userId: user?.id || '' })
  
  // Get supplier inventory if profile exists
  const inventory = useQuery(api.inventory.getInventoryBySupplier, 
    supplierProfile?._id ? { supplierId: supplierProfile._id } : 'skip'
  )
  
  // Get orders for this supplier - temporarily disabled until backend function is deployed
  // const orders = useQuery(api.orders.getOrdersBySupplier,
  //   supplierProfile?._id ? { supplierId: supplierProfile._id } : 'skip'
  // )
  const orders = [] // Temporary placeholder

  // Get supplier forecasts
  const forecasts = useQuery(api.suppliers.getSupplierForecasts, 
    supplierProfile?._id ? { supplierId: supplierProfile._id } : 'skip'
  )

  // Create supplier profile mutation
  const createSupplier = useMutation(api.suppliers.create)
  const addInventoryItem = useMutation(api.inventory.addInventoryItem)

  // Check if supplier profile exists, if not show setup
  useEffect(() => {
    if (supplierProfile === null) {
      setIsProfileSetup(true)
    } else if (supplierProfile) {
      setIsProfileSetup(false)
    }
  }, [supplierProfile])

  // Calculate stats
  const stats = {
    activeOrders: orders?.filter(order => order.status === 'confirmed' || order.status === 'processing').length || 0,
    totalOrders: orders?.length || 0,
    availableProducts: inventory?.filter(item => item.isAvailable).length || 0,
    totalProducts: inventory?.length || 0,
    lowStockItems: inventory?.filter(item => item.currentStock < 10).length || 0,
    totalRevenue: orders?.reduce((sum, order) => sum + order.totalAmount, 0) || 0
  }

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

  // Inventory form state
  const [inventoryForm, setInventoryForm] = useState({
    itemName: '',
    category: '',
    currentStock: 0,
    unit: '',
    pricePerUnit: 0,
    minimumOrder: 1,
    quality: 'good'
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

  const handleAddInventory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supplierProfile?._id) return

    try {
      await addInventoryItem({
        supplierId: supplierProfile._id,
        itemName: inventoryForm.itemName,
        category: inventoryForm.category,
        currentStock: inventoryForm.currentStock,
        unit: inventoryForm.unit,
        pricePerUnit: inventoryForm.pricePerUnit,
        minimumOrder: inventoryForm.minimumOrder,
        quality: inventoryForm.quality
      })
      setInventoryForm({
        itemName: '',
        category: '',
        currentStock: 0,
        unit: '',
        pricePerUnit: 0,
        minimumOrder: 1,
        quality: 'good'
      })
    } catch (error) {
      console.error('Error adding inventory:', error)
    }
  }

  if (isProfileSetup) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-2xl mr-3">🚚</span>
                <h1 className="text-xl font-semibold text-gray-800">Smart Street - Supplier Setup</h1>
              </div>
              <button
                onClick={logout}
                className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-md transition-colors"
              >
                Logout
              </button>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Owner Name *</label>
                  <input
                    type="text"
                    required
                    value={profileForm.ownerName}
                    onChange={(e) => setProfileForm({...profileForm, ownerName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                  <input
                    type="text"
                    required
                    value={profileForm.city}
                    onChange={(e) => setProfileForm({...profileForm, city: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                <textarea
                  required
                  value={profileForm.address}
                  onChange={(e) => setProfileForm({...profileForm, address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pincode *</label>
                  <input
                    type="text"
                    required
                    value={profileForm.pincode}
                    onChange={(e) => setProfileForm({...profileForm, pincode: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Radius (km)</label>
                  <input
                    type="number"
                    value={profileForm.deliveryRadius}
                    onChange={(e) => setProfileForm({...profileForm, deliveryRadius: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
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
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-2xl mr-3">🚚</span>
              <h1 className="text-xl font-semibold text-gray-800">Smart Street - Supplier</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{supplierProfile?.businessName}</span>
                <div className="flex items-center mt-1">
                  <span className="text-yellow-500">★</span>
                  <span className="ml-1">{supplierProfile?.trustScore?.toFixed(1)}</span>
                  {supplierProfile?.isVerified && (
                    <span className="ml-2 bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs">Verified</span>
                  )}
                </div>
              </div>
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

      <div className="max-w-7xl mx-auto p-6">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'inventory', label: 'Inventory', icon: '📦' },
                { id: 'orders', label: 'Orders', icon: '🛒' },
                { id: 'forecast', label: 'AI Forecast', icon: '🤖' },
                { id: 'profile', label: 'Profile', icon: '👤' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-6 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-orange-500 text-orange-600'
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

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">🛒</div>
                  <div>
                    <div className="text-2xl font-bold text-gray-800">{stats.activeOrders}</div>
                    <div className="text-sm text-gray-600">Active Orders</div>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">📦</div>
                  <div>
                    <div className="text-2xl font-bold text-gray-800">{stats.availableProducts}</div>
                    <div className="text-sm text-gray-600">Available Products</div>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">⚠️</div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">{stats.lowStockItems}</div>
                    <div className="text-sm text-gray-600">Low Stock Items</div>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">💰</div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">₹{stats.totalRevenue.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Total Revenue</div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Forecast Summary */}
            {forecasts && forecasts.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-800">AI Forecast Summary</h3>
                  <span className="text-sm text-gray-500">Next 7 days</span>
                </div>
                <div className="space-y-3">
                  {forecasts.slice(0, 3).map((forecast, index) => (
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
                        onClick={() => setActiveTab('forecast')}
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
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Recent Orders</h3>
              {orders && orders.length > 0 ? (
                <div className="space-y-3">
                  {orders.slice(0, 5).map(order => (
                    <div key={order._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">Order #{order._id.slice(-6)}</div>
                        <div className="text-sm text-gray-600">{order.items.length} items</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">₹{order.totalAmount}</div>
                        <div className={`text-sm px-2 py-1 rounded-full ${
                          order.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No orders yet. Start by adding products to your inventory!
                </div>
              )}
            </div>
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            {/* Add New Item Form */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Add New Item</h3>
              <form onSubmit={handleAddInventory} className="grid md:grid-cols-6 gap-4">
                <input
                  type="text"
                  placeholder="Item Name"
                  required
                  value={inventoryForm.itemName}
                  onChange={(e) => setInventoryForm({...inventoryForm, itemName: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
                <select
                  required
                  value={inventoryForm.category}
                  onChange={(e) => setInventoryForm({...inventoryForm, category: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Category</option>
                  <option value="Vegetables">Vegetables</option>
                  <option value="Fruits">Fruits</option>
                  <option value="Grains">Grains</option>
                  <option value="Dairy">Dairy</option>
                  <option value="Spices">Spices</option>
                </select>
                <input
                  type="number"
                  placeholder="Stock"
                  required
                  value={inventoryForm.currentStock}
                  onChange={(e) => setInventoryForm({...inventoryForm, currentStock: Number(e.target.value)})}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
                <input
                  type="text"
                  placeholder="Unit (kg/pieces)"
                  required
                  value={inventoryForm.unit}
                  onChange={(e) => setInventoryForm({...inventoryForm, unit: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
                <input
                  type="number"
                  placeholder="Price/Unit"
                  required
                  step="0.01"
                  value={inventoryForm.pricePerUnit}
                  onChange={(e) => setInventoryForm({...inventoryForm, pricePerUnit: Number(e.target.value)})}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min Order"
                    required
                    value={inventoryForm.minimumOrder}
                    onChange={(e) => setInventoryForm({...inventoryForm, minimumOrder: Number(e.target.value)})}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                  <button
                    type="submit"
                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md transition-colors"
                  >
                    Add
                  </button>
                </div>
              </form>
            </div>

            {/* Inventory List */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Your Inventory</h3>
              {inventory && inventory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price/Unit</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {inventory.map(item => (
                        <tr key={item._id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.itemName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.category}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.currentStock} {item.unit}
                            {item.currentStock < 10 && (
                              <span className="ml-2 text-red-500 text-xs">⚠️ Low Stock</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{item.pricePerUnit}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              item.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {item.isAvailable ? 'Available' : 'Unavailable'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No inventory items yet. Add your first product above!
                </div>
              )}
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">All Orders</h3>
            {orders && orders.length > 0 ? (
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium">Order #{order._id.slice(-8)}</h4>
                        <p className="text-sm text-gray-600">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">₹{order.totalAmount}</div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          order.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'delivered' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {order.items.length} items ordered
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No orders received yet. Make sure your inventory is well-stocked!
              </div>
            )}
          </div>
        )}

        {/* AI Forecast Tab */}
        {activeTab === 'forecast' && supplierProfile && (
          <InventoryForecast supplierId={supplierProfile._id} />
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && supplierProfile && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Supplier Profile</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                  <div className="text-gray-900">{supplierProfile.businessName}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trust Score</label>
                  <div className="flex items-center">
                    <span className="text-yellow-500 mr-1">★</span>
                    <span className="text-gray-900">{supplierProfile.trustScore.toFixed(1)}/5.0</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categories</label>
                  <div className="flex flex-wrap gap-2">
                    {supplierProfile.categories.map(category => (
                      <span key={category} className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-sm">
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Verification Status</label>
                  <span className={`px-2 py-1 rounded-full text-sm ${
                    supplierProfile.isVerified 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {supplierProfile.isVerified ? 'Verified' : 'Pending Verification'}
                  </span>
                </div>
              </div>
            </div>

            {/* FSSAI Verification Component */}
            <FSSAIVerification 
              supplierId={supplierProfile._id as any}
              onVerificationComplete={(status) => {
                // Refresh the page to update verification status
                window.location.reload();
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
