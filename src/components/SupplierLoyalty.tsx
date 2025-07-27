import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

interface LoyaltyTier {
  name: string;
  minOrders: number;
  benefits: string[];
  color: string;
  icon: string;
  commissionRate: number;
  prioritySupport: boolean;
}

interface VendorLoyalty {
  vendorId: string;
  vendorName: string;
  businessName: string;
  currentTier: string;
  totalOrders: number;
  totalSpent: number;
  loyaltyPoints: number;
  joinDate: Date;
  lastOrder: Date;
  avgOrderValue: number;
  growthRate: number;
}

interface LoyaltyReward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  type: 'discount' | 'priority' | 'feature' | 'cashback';
  available: boolean;
  popularity: number;
}

interface Props {
  supplierId: Id<'suppliers'>;
}

export default function SupplierLoyalty({ supplierId }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'vendors' | 'rewards' | 'analytics'>('overview');
  const [selectedTier, setSelectedTier] = useState<string>('all');

  // Loyalty tier definitions
  const loyaltyTiers: LoyaltyTier[] = [
    {
      name: 'Bronze',
      minOrders: 0,
      benefits: ['Basic support', 'Standard delivery'],
      color: 'text-amber-600 bg-amber-100',
      icon: '🥉',
      commissionRate: 2.5,
      prioritySupport: false
    },
    {
      name: 'Silver',
      minOrders: 10,
      benefits: ['Priority support', '5% bulk discount', 'Extended payment terms'],
      color: 'text-gray-600 bg-gray-100',
      icon: '🥈',
      commissionRate: 2.0,
      prioritySupport: false
    },
    {
      name: 'Gold',
      minOrders: 25,
      benefits: ['Dedicated account manager', '10% bulk discount', 'Free quality certificates', 'Priority delivery'],
      color: 'text-yellow-600 bg-yellow-100',
      icon: '🥇',
      commissionRate: 1.5,
      prioritySupport: true
    },
    {
      name: 'Platinum',
      minOrders: 50,
      benefits: ['Personal relationship manager', '15% bulk discount', 'Custom pricing', 'Zero commission fees', 'Premium features'],
      color: 'text-purple-600 bg-purple-100',
      icon: '💎',
      commissionRate: 0,
      prioritySupport: true
    }
  ];

  // Mock vendor loyalty data
  const loyalVendors: VendorLoyalty[] = [
    {
      vendorId: '1',
      vendorName: 'Raj Kumar',
      businessName: 'Raj\'s Street Kitchen',
      currentTier: 'Gold',
      totalOrders: 28,
      totalSpent: 145000,
      loyaltyPoints: 2850,
      joinDate: new Date('2024-01-15'),
      lastOrder: new Date('2024-12-20'),
      avgOrderValue: 5178,
      growthRate: 15
    },
    {
      vendorId: '2',
      vendorName: 'Priya Sharma',
      businessName: 'Sharma Snacks',
      currentTier: 'Silver',
      totalOrders: 15,
      totalSpent: 78000,
      loyaltyPoints: 1560,
      joinDate: new Date('2024-03-10'),
      lastOrder: new Date('2024-12-18'),
      avgOrderValue: 5200,
      growthRate: 22
    },
    {
      vendorId: '3',
      vendorName: 'Mohammed Ali',
      businessName: 'Ali\'s Biryani Corner',
      currentTier: 'Platinum',
      totalOrders: 67,
      totalSpent: 320000,
      loyaltyPoints: 6400,
      joinDate: new Date('2023-11-20'),
      lastOrder: new Date('2024-12-21'),
      avgOrderValue: 4776,
      growthRate: 8
    }
  ];

  const availableRewards: LoyaltyReward[] = [
    {
      id: '1',
      name: '5% Order Discount',
      description: 'Apply 5% discount on next vendor order',
      pointsCost: 500,
      type: 'discount',
      available: true,
      popularity: 85
    },
    {
      id: '2',
      name: 'Priority Listing',
      description: 'Feature your products at top of search results for 7 days',
      pointsCost: 1000,
      type: 'feature',
      available: true,
      popularity: 70
    },
    {
      id: '3',
      name: 'Express Delivery',
      description: 'Upgrade vendor orders to express delivery for free',
      pointsCost: 300,
      type: 'priority',
      available: true,
      popularity: 92
    },
    {
      id: '4',
      name: 'Cashback Bonus',
      description: '₹500 cashback for vendor on their next order',
      pointsCost: 2000,
      type: 'cashback',
      available: true,
      popularity: 95
    }
  ];

  const getTierForOrders = (orders: number): LoyaltyTier => {
    return [...loyaltyTiers].reverse().find(tier => orders >= tier.minOrders) || loyaltyTiers[0];
  };

  const getNextTier = (currentOrders: number): LoyaltyTier | null => {
    return loyaltyTiers.find(tier => tier.minOrders > currentOrders) || null;
  };

  const redeemReward = (rewardId: string, vendorId: string) => {
    // In real app, this would call a Convex mutation
    console.log(`Redeeming reward ${rewardId} for vendor ${vendorId}`);
  };

  const loyaltyStats = {
    totalLoyalVendors: loyalVendors.length,
    totalPointsAwarded: loyalVendors.reduce((sum, vendor) => sum + vendor.loyaltyPoints, 0),
    avgRetentionRate: 87,
    topTierVendors: loyalVendors.filter(v => v.currentTier === 'Gold' || v.currentTier === 'Platinum').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">🏆 Vendor Loyalty Program</h2>
            <p className="opacity-90">Reward your best vendors and build lasting relationships</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{loyaltyStats.totalLoyalVendors}</div>
            <div className="text-sm opacity-90">Active Members</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Program Overview', icon: '📊' },
              { id: 'vendors', label: 'Loyal Vendors', icon: '👥' },
              { id: 'rewards', label: 'Rewards Catalog', icon: '🎁' },
              { id: 'analytics', label: 'Analytics', icon: '📈' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="p-6">
            {/* Loyalty Tiers */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Loyalty Tiers</h3>
              <div className="grid md:grid-cols-4 gap-4">
                {loyaltyTiers.map(tier => (
                  <div key={tier.name} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="text-center mb-4">
                      <div className="text-3xl mb-2">{tier.icon}</div>
                      <h4 className={`font-semibold text-lg px-3 py-1 rounded-full ${tier.color}`}>
                        {tier.name}
                      </h4>
                    </div>
                    
                    <div className="text-center mb-4">
                      <div className="text-sm text-gray-600 mb-2">
                        {tier.minOrders === 0 ? 'Starting tier' : `${tier.minOrders}+ orders`}
                      </div>
                      <div className="text-xs text-gray-500">
                        Commission: {tier.commissionRate}%
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {tier.benefits.map((benefit, idx) => (
                        <div key={idx} className="flex items-start text-xs">
                          <span className="text-green-500 mr-1">✓</span>
                          <span className="text-gray-600">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Program Stats */}
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{loyaltyStats.totalLoyalVendors}</div>
                    <div className="text-blue-700 text-sm">Total Members</div>
                  </div>
                  <div className="text-3xl text-blue-500">👥</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-green-600">{loyaltyStats.avgRetentionRate}%</div>
                    <div className="text-green-700 text-sm">Retention Rate</div>
                  </div>
                  <div className="text-3xl text-green-500">📈</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{loyaltyStats.totalPointsAwarded.toLocaleString()}</div>
                    <div className="text-purple-700 text-sm">Points Awarded</div>
                  </div>
                  <div className="text-3xl text-purple-500">🏆</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-orange-600">{loyaltyStats.topTierVendors}</div>
                    <div className="text-orange-700 text-sm">Premium Members</div>
                  </div>
                  <div className="text-3xl text-orange-500">⭐</div>
                </div>
              </div>
            </div>

            {/* How It Works */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">How the Loyalty Program Works</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl text-white">📦</span>
                  </div>
                  <h4 className="font-medium text-gray-900 mb-2">Vendors Place Orders</h4>
                  <p className="text-sm text-gray-600">Every order earns loyalty points and contributes to tier progression</p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl text-white">🏆</span>
                  </div>
                  <h4 className="font-medium text-gray-900 mb-2">Tier Progression</h4>
                  <p className="text-sm text-gray-600">Vendors automatically advance tiers based on order frequency and value</p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl text-white">🎁</span>
                  </div>
                  <h4 className="font-medium text-gray-900 mb-2">Unlock Rewards</h4>
                  <p className="text-sm text-gray-600">Higher tiers unlock better benefits, lower commissions, and exclusive perks</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Vendors Tab */}
        {activeTab === 'vendors' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Loyal Vendors</h3>
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="all">All Tiers</option>
                {loyaltyTiers.map(tier => (
                  <option key={tier.name} value={tier.name}>{tier.name}</option>
                ))}
              </select>
            </div>

            <div className="overflow-hidden bg-white border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Tier</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loyalty Points</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Growth</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loyalVendors
                    .filter(vendor => selectedTier === 'all' || vendor.currentTier === selectedTier)
                    .map(vendor => {
                      const currentTier = loyaltyTiers.find(t => t.name === vendor.currentTier)!;
                      const nextTier = getNextTier(vendor.totalOrders);
                      
                      return (
                        <tr key={vendor.vendorId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="font-medium text-gray-900">{vendor.vendorName}</div>
                              <div className="text-sm text-gray-500">{vendor.businessName}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${currentTier.color}`}>
                              {currentTier.icon} {vendor.currentTier}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{vendor.totalOrders}</div>
                            {nextTier && (
                              <div className="text-xs text-gray-500">
                                {nextTier.minOrders - vendor.totalOrders} to {nextTier.name}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">₹{vendor.totalSpent.toLocaleString()}</div>
                            <div className="text-xs text-gray-500">Avg: ₹{vendor.avgOrderValue.toLocaleString()}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-purple-600">{vendor.loyaltyPoints.toLocaleString()}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm font-medium ${vendor.growthRate > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {vendor.growthRate > 0 ? '+' : ''}{vendor.growthRate}%
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button className="text-purple-600 hover:text-purple-900 font-medium">
                              Send Reward
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Rewards Tab */}
        {activeTab === 'rewards' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Rewards Catalog</h3>
              <button className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-md font-medium transition-colors">
                + Create New Reward
              </button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableRewards.map(reward => (
                <div key={reward.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">{reward.name}</h4>
                      <p className="text-sm text-gray-600">{reward.description}</p>
                    </div>
                    <span className="text-2xl">
                      {reward.type === 'discount' ? '💰' :
                       reward.type === 'priority' ? '⚡' :
                       reward.type === 'feature' ? '⭐' : '🎁'}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Cost:</span>
                      <span className="font-semibold text-purple-600">{reward.pointsCost} points</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Popularity:</span>
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-purple-500 h-2 rounded-full" 
                            style={{ width: `${reward.popularity}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500">{reward.popularity}%</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Status:</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        reward.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {reward.available ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                  </div>
                  
                  <button 
                    className="w-full mt-4 bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50"
                    disabled={!reward.available}
                  >
                    Edit Reward
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Loyalty Program Analytics</h3>
            
            {/* Key Metrics */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-4">Member Distribution</h4>
                <div className="space-y-3">
                  {loyaltyTiers.map(tier => {
                    const count = loyalVendors.filter(v => v.currentTier === tier.name).length;
                    const percentage = (count / loyalVendors.length) * 100;
                    
                    return (
                      <div key={tier.name} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-lg mr-2">{tier.icon}</span>
                          <span className="text-sm font-medium">{tier.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">{count}</div>
                          <div className="text-xs text-gray-500">{percentage.toFixed(0)}%</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-4">Program Impact</h4>
                <div className="space-y-4">
                  <div>
                    <div className="text-2xl font-bold text-green-600">87%</div>
                    <div className="text-sm text-gray-600">Retention Rate</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">+32%</div>
                    <div className="text-sm text-gray-600">Avg Order Value</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">2.3x</div>
                    <div className="text-sm text-gray-600">Order Frequency</div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-4">Top Performing Rewards</h4>
                <div className="space-y-3">
                  {availableRewards.slice(0, 3).map(reward => (
                    <div key={reward.id} className="flex justify-between items-center">
                      <div className="text-sm font-medium truncate">{reward.name}</div>
                      <div className="text-sm text-purple-600">{reward.popularity}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Revenue Impact */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-800 mb-4">Revenue Impact</h4>
              <div className="h-64 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-4">📊</div>
                  <p className="text-gray-600">Revenue impact chart would appear here</p>
                  <p className="text-sm text-gray-500 mt-2">Showing 23% increase in revenue from loyalty members</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
