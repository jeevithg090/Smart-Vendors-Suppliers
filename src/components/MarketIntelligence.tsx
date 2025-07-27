import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

interface PriceAlert {
  id: string;
  itemName: string;
  currentPrice: number;
  previousPrice: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  category: string;
  region: string;
  alertType: 'significant_increase' | 'significant_decrease' | 'opportunity';
  message: string;
  timestamp: Date;
}

interface MarketTrend {
  item: string;
  category: string;
  currentPrice: number;
  weeklyChange: number;
  monthlyChange: number;
  seasonalPattern: 'increasing' | 'decreasing' | 'stable' | 'seasonal_peak' | 'seasonal_low';
  forecast7Days: number;
  forecast30Days: number;
  confidence: number;
  suppliers: number;
}

interface CompetitorInsight {
  competitorName: string;
  businessType: string;
  location: string;
  popularItems: string[];
  priceStrategy: 'premium' | 'competitive' | 'budget';
  estimatedRevenue: string;
  uniqueSellingPoints: string[];
  strengths: string[];
  opportunities: string[];
}

interface SeasonalInsight {
  period: string;
  peakItems: string[];
  priceIncrease: number;
  demandIncrease: number;
  preparation: string[];
  opportunity: string;
}

interface Props {
  vendorId: Id<'vendors'>;
  location: {
    city: string;
    state: string;
  };
}

export default function MarketIntelligence({ vendorId, location }: Props) {
  const [activeTab, setActiveTab] = useState<'alerts' | 'trends' | 'competitors' | 'seasonal' | 'reports'>('alerts');
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d' | '90d'>('7d');

  // Mock market data - in real app, this would come from APIs/data sources
  const priceAlerts: PriceAlert[] = [
    {
      id: '1',
      itemName: 'Tomatoes',
      currentPrice: 35,
      previousPrice: 30,
      changePercent: 16.7,
      trend: 'up',
      category: 'Vegetables',
      region: location.city,
      alertType: 'significant_increase',
      message: 'Tomato prices increased due to monsoon affecting supply chains',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
    {
      id: '2',
      itemName: 'Rice',
      currentPrice: 55,
      previousPrice: 62,
      changePercent: -11.3,
      trend: 'down',
      category: 'Grains',
      region: location.city,
      alertType: 'opportunity',
      message: 'Great time to stock up on rice - prices dropped due to new harvest',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000)
    },
    {
      id: '3',
      itemName: 'Chicken',
      currentPrice: 280,
      previousPrice: 260,
      changePercent: 7.7,
      trend: 'up',
      category: 'Meat',
      region: location.city,
      alertType: 'significant_increase',
      message: 'Chicken prices rising ahead of festival season',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    }
  ];

  const marketTrends: MarketTrend[] = [
    {
      item: 'Tomatoes',
      category: 'Vegetables',
      currentPrice: 35,
      weeklyChange: 16.7,
      monthlyChange: 25.3,
      seasonalPattern: 'seasonal_peak',
      forecast7Days: 37,
      forecast30Days: 32,
      confidence: 85,
      suppliers: 12
    },
    {
      item: 'Onions',
      category: 'Vegetables',
      currentPrice: 28,
      weeklyChange: 5.2,
      monthlyChange: 12.8,
      seasonalPattern: 'increasing',
      forecast7Days: 30,
      forecast30Days: 33,
      confidence: 78,
      suppliers: 15
    },
    {
      item: 'Rice (Basmati)',
      category: 'Grains',
      currentPrice: 55,
      weeklyChange: -11.3,
      monthlyChange: -8.5,
      seasonalPattern: 'seasonal_low',
      forecast7Days: 53,
      forecast30Days: 58,
      confidence: 92,
      suppliers: 8
    },
    {
      item: 'Cooking Oil',
      category: 'Oil',
      currentPrice: 140,
      weeklyChange: 2.1,
      monthlyChange: 8.7,
      seasonalPattern: 'stable',
      forecast7Days: 142,
      forecast30Days: 145,
      confidence: 71,
      suppliers: 6
    }
  ];

  const competitorInsights: CompetitorInsight[] = [
    {
      competitorName: "Singh's Street Kitchen",
      businessType: 'Street Food Cart',
      location: '2.3 km away',
      popularItems: ['Chole Bhature', 'Aloo Paratha', 'Lassi'],
      priceStrategy: 'competitive',
      estimatedRevenue: '₹15-20K/month',
      uniqueSellingPoints: ['Authentic Punjab flavors', 'Family recipes', 'Fresh daily preparations'],
      strengths: ['High customer loyalty', 'Prime location', 'Consistent quality'],
      opportunities: ['Limited menu variety', 'No digital presence', 'Peak hour congestion']
    },
    {
      competitorName: 'Mumbai Munchies',
      businessType: 'Food Truck',
      location: '1.8 km away',
      popularItems: ['Vada Pav', 'Pav Bhaji', 'Bhel Puri'],
      priceStrategy: 'budget',
      estimatedRevenue: '₹25-30K/month',
      uniqueSellingPoints: ['Quick service', 'Multiple payment options', 'Social media presence'],
      strengths: ['Modern equipment', 'Digital ordering', 'Brand recognition'],
      opportunities: ['Higher prices', 'Quality inconsistency', 'Limited parking']
    }
  ];

  const seasonalInsights: SeasonalInsight[] = [
    {
      period: 'Winter (Dec-Feb)',
      peakItems: ['Root vegetables', 'Wheat products', 'Dairy items'],
      priceIncrease: 15,
      demandIncrease: 25,
      preparation: [
        'Stock up on seasonal vegetables',
        'Plan winter special menu',
        'Negotiate bulk rates for wheat',
        'Ensure cold storage for dairy'
      ],
      opportunity: 'Launch hot beverages and soup varieties'
    },
    {
      period: 'Summer (Mar-May)',
      peakItems: ['Cooling ingredients', 'Fresh fruits', 'Beverages'],
      priceIncrease: 20,
      demandIncrease: 40,
      preparation: [
        'Secure mango suppliers early',
        'Plan cooling menu items',
        'Invest in refrigeration',
        'Develop beverage offerings'
      ],
      opportunity: 'Focus on refreshing and cooling food items'
    },
    {
      period: 'Monsoon (Jun-Sep)',
      peakItems: ['Comfort foods', 'Hot snacks', 'Preserved items'],
      priceIncrease: 25,
      demandIncrease: 15,
      preparation: [
        'Ensure weatherproof setup',
        'Stock preserved ingredients',
        'Plan indoor-friendly menu',
        'Secure reliable supply chains'
      ],
      opportunity: 'Hot snacks and comfort food have high demand'
    }
  ];

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      case 'stable': return '➡️';
      default: return '➡️';
    }
  };

  const getAlertColor = (alertType: string) => {
    switch (alertType) {
      case 'significant_increase': return 'bg-red-50 border-red-200 text-red-800';
      case 'significant_decrease': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'opportunity': return 'bg-green-50 border-green-200 text-green-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">📊 Market Intelligence</h2>
            <p className="opacity-90">Stay ahead with real-time market insights and competitive analysis</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{priceAlerts.length}</div>
            <div className="text-sm opacity-90">Active Alerts</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'alerts', label: 'Price Alerts', icon: '🚨' },
              { id: 'trends', label: 'Market Trends', icon: '📈' },
              { id: 'competitors', label: 'Competitor Analysis', icon: '🔍' },
              { id: 'seasonal', label: 'Seasonal Insights', icon: '🗓️' },
              { id: 'reports', label: 'Custom Reports', icon: '📊' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Price Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Price Alerts - {location.city}</h3>
              <div className="flex space-x-3">
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                </select>
                <button className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-md font-medium transition-colors">
                  Set Alert Preferences
                </button>
              </div>
            </div>

            {/* Alert Summary */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="text-2xl font-bold text-red-600">
                  {priceAlerts.filter(a => a.alertType === 'significant_increase').length}
                </div>
                <div className="text-red-700 text-sm">Price Increases</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-600">
                  {priceAlerts.filter(a => a.alertType === 'opportunity').length}
                </div>
                <div className="text-green-700 text-sm">Opportunities</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">
                  {priceAlerts.filter(a => a.alertType === 'significant_decrease').length}
                </div>
                <div className="text-blue-700 text-sm">Price Drops</div>
              </div>
            </div>

            {/* Alerts List */}
            <div className="space-y-4">
              {priceAlerts.map(alert => (
                <div key={alert.id} className={`border rounded-lg p-4 ${getAlertColor(alert.alertType)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-lg">{getTrendIcon(alert.trend)}</span>
                        <h4 className="font-semibold">{alert.itemName}</h4>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-white bg-opacity-50">
                          {alert.category}
                        </span>
                      </div>
                      
                      <p className="text-sm mb-3">{alert.message}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Current Price:</span>
                          <div>₹{alert.currentPrice}/{alert.itemName === 'Cooking Oil' ? 'L' : 'kg'}</div>
                        </div>
                        <div>
                          <span className="font-medium">Previous Price:</span>
                          <div>₹{alert.previousPrice}/{alert.itemName === 'Cooking Oil' ? 'L' : 'kg'}</div>
                        </div>
                        <div>
                          <span className="font-medium">Change:</span>
                          <div className={alert.changePercent > 0 ? 'text-red-600' : 'text-green-600'}>
                            {alert.changePercent > 0 ? '+' : ''}{alert.changePercent.toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <span className="font-medium">Region:</span>
                          <div>{alert.region}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-xs opacity-75">
                        {alert.timestamp.toLocaleTimeString()}
                      </div>
                      <button className="mt-2 text-sm font-medium hover:underline">
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Market Trends Tab */}
        {activeTab === 'trends' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Market Trends Analysis</h3>
              <button className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-md font-medium transition-colors">
                Export Trends Report
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weekly Change</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Change</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pattern</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">7-Day Forecast</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Suppliers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {marketTrends.map((trend, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{trend.item}</div>
                        <div className="text-sm text-gray-500">{trend.category}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">₹{trend.currentPrice}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${
                          trend.weeklyChange > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {trend.weeklyChange > 0 ? '+' : ''}{trend.weeklyChange.toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${
                          trend.monthlyChange > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {trend.monthlyChange > 0 ? '+' : ''}{trend.monthlyChange.toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          trend.seasonalPattern.includes('peak') ? 'bg-red-100 text-red-800' :
                          trend.seasonalPattern.includes('low') ? 'bg-green-100 text-green-800' :
                          trend.seasonalPattern === 'increasing' ? 'bg-yellow-100 text-yellow-800' :
                          trend.seasonalPattern === 'decreasing' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {trend.seasonalPattern.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">₹{trend.forecast7Days}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${getConfidenceColor(trend.confidence)}`}>
                          {trend.confidence}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{trend.suppliers}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Trend Charts Placeholder */}
            <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-800 mb-4">Price Trend Visualization</h4>
              <div className="h-64 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-4">📈</div>
                  <p className="text-gray-600">Interactive price trend charts would appear here</p>
                  <p className="text-sm text-gray-500 mt-2">Showing historical prices and forecasts</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Competitor Analysis Tab */}
        {activeTab === 'competitors' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Competitor Analysis - {location.city}</h3>
              <button className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-md font-medium transition-colors">
                + Add Competitor
              </button>
            </div>

            <div className="grid gap-6">
              {competitorInsights.map((competitor, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 text-lg mb-2">{competitor.competitorName}</h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                        <span>{competitor.businessType}</span>
                        <span>📍 {competitor.location}</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          competitor.priceStrategy === 'premium' ? 'bg-purple-100 text-purple-800' :
                          competitor.priceStrategy === 'competitive' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {competitor.priceStrategy} pricing
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 mb-4">
                        Est. Revenue: {competitor.estimatedRevenue}
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="font-medium text-gray-800 mb-3">Popular Items</h5>
                      <div className="space-y-2">
                        {competitor.popularItems.map((item, idx) => (
                          <div key={idx} className="flex items-center">
                            <span className="text-orange-500 mr-2">•</span>
                            <span className="text-sm text-gray-700">{item}</span>
                          </div>
                        ))}
                      </div>

                      <h5 className="font-medium text-gray-800 mb-3 mt-4">Unique Selling Points</h5>
                      <div className="space-y-2">
                        {competitor.uniqueSellingPoints.map((usp, idx) => (
                          <div key={idx} className="flex items-center">
                            <span className="text-blue-500 mr-2">✓</span>
                            <span className="text-sm text-gray-700">{usp}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-800 mb-3">Strengths</h5>
                      <div className="space-y-2 mb-4">
                        {competitor.strengths.map((strength, idx) => (
                          <div key={idx} className="flex items-center">
                            <span className="text-green-500 mr-2">💪</span>
                            <span className="text-sm text-gray-700">{strength}</span>
                          </div>
                        ))}
                      </div>

                      <h5 className="font-medium text-gray-800 mb-3">Opportunities for You</h5>
                      <div className="space-y-2">
                        {competitor.opportunities.map((opportunity, idx) => (
                          <div key={idx} className="flex items-center">
                            <span className="text-yellow-500 mr-2">💡</span>
                            <span className="text-sm text-gray-700">{opportunity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex space-x-3">
                    <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                      View Detailed Analysis
                    </button>
                    <button className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                      Set Price Alerts
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Seasonal Insights Tab */}
        {activeTab === 'seasonal' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Seasonal Market Insights</h3>
            
            <div className="grid gap-6">
              {seasonalInsights.map((insight, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-900 text-lg">{insight.period}</h4>
                    <div className="flex space-x-4 text-sm">
                      <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-medium">
                        +{insight.priceIncrease}% price increase
                      </span>
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
                        +{insight.demandIncrease}% demand increase
                      </span>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h5 className="font-medium text-gray-800 mb-3">Peak Items</h5>
                      <div className="space-y-2">
                        {insight.peakItems.map((item, idx) => (
                          <div key={idx} className="flex items-center">
                            <span className="text-yellow-500 mr-2">⭐</span>
                            <span className="text-sm text-gray-700">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-800 mb-3">Preparation Checklist</h5>
                      <div className="space-y-2">
                        {insight.preparation.map((task, idx) => (
                          <div key={idx} className="flex items-center">
                            <span className="text-blue-500 mr-2">✓</span>
                            <span className="text-sm text-gray-700">{task}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
                    <h5 className="font-medium text-purple-800 mb-2">💡 Business Opportunity</h5>
                    <p className="text-purple-700 text-sm">{insight.opportunity}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Calendar View Placeholder */}
            <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-800 mb-4">Seasonal Calendar</h4>
              <div className="h-64 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-4">📅</div>
                  <p className="text-gray-600">Interactive seasonal calendar would appear here</p>
                  <p className="text-sm text-gray-500 mt-2">Plan your menu and sourcing strategy by season</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Custom Market Reports</h3>
            
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-4">📊 Weekly Market Summary</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Comprehensive weekly report covering price changes, trend analysis, and actionable insights for your business.
                </p>
                <div className="space-y-2 text-sm text-gray-700 mb-4">
                  <div>✓ Price trend analysis</div>
                  <div>✓ Competitor pricing updates</div>
                  <div>✓ Seasonal recommendations</div>
                  <div>✓ Cost optimization tips</div>
                </div>
                <button className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-2 px-4 rounded-md font-medium transition-colors">
                  Generate Weekly Report
                </button>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-4">🎯 Custom Analysis</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Create custom reports focusing on specific items, competitors, or time periods that matter to your business.
                </p>
                <div className="space-y-3">
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                    <option>Select report type</option>
                    <option>Competitor pricing analysis</option>
                    <option>Seasonal trend forecast</option>
                    <option>Cost optimization report</option>
                    <option>Market opportunity analysis</option>
                  </select>
                  <button className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md font-medium transition-colors">
                    Create Custom Report
                  </button>
                </div>
              </div>
            </div>

            {/* Report History */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-800 mb-4">Report History</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">Weekly Market Summary - Dec 2024</div>
                    <div className="text-sm text-gray-500">Generated 3 days ago</div>
                  </div>
                  <button className="text-indigo-600 hover:text-indigo-800 font-medium text-sm">
                    Download
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">Competitor Analysis - Mumbai Region</div>
                    <div className="text-sm text-gray-500">Generated 1 week ago</div>
                  </div>
                  <button className="text-indigo-600 hover:text-indigo-800 font-medium text-sm">
                    Download
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">Seasonal Forecast - Winter 2024</div>
                    <div className="text-sm text-gray-500">Generated 2 weeks ago</div>
                  </div>
                  <button className="text-indigo-600 hover:text-indigo-800 font-medium text-sm">
                    Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
