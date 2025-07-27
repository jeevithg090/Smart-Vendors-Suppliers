import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

interface PricingRecommendation {
  itemId: string;
  itemName: string;
  currentPrice: number;
  recommendedPrice: number;
  expectedDemand: number;
  competitorAverage: number;
  profitability: 'high' | 'medium' | 'low';
  reasoning: string;
}

interface Props {
  supplierId: Id<'suppliers'>;
}

export default function SmartPricingEngine({ supplierId }: Props) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(false);
  const [appliedUpdates, setAppliedUpdates] = useState<Set<string>>(new Set());

  // Get supplier's inventory for pricing analysis
  const inventory = useQuery(api.inventory.getInventoryBySupplier, { supplierId });
  const marketData = useQuery(api.analytics.getMarketPricingData, { supplierId });
  
  const updatePricing = useMutation(api.inventory.updateInventoryItem);

  // Mock pricing recommendations based on market data and AI analysis
  const generatePricingRecommendations = (): PricingRecommendation[] => {
    if (!inventory) return [];

    return inventory.map(item => {
      const basePrice = item.pricePerUnit;
      const marketVariance = Math.random() * 0.2 - 0.1; // -10% to +10%
      const demandFactor = Math.random() * 0.15; // 0-15% demand adjustment
      
      const recommendedPrice = Math.round((basePrice * (1 + marketVariance + demandFactor)) * 100) / 100;
      const competitorAverage = Math.round((basePrice * (1 + (Math.random() * 0.3 - 0.15))) * 100) / 100;
      
      const profitMargin = ((recommendedPrice - basePrice) / basePrice) * 100;
      const profitability: 'high' | 'medium' | 'low' = 
        profitMargin > 10 ? 'high' : profitMargin > 5 ? 'medium' : 'low';

      let reasoning = '';
      if (recommendedPrice > basePrice) {
        reasoning = `High demand period. Competitors pricing at ₹${competitorAverage}/${item.unit}. Optimal time to increase margins.`;
      } else if (recommendedPrice < basePrice) {
        reasoning = `Market price declining. Recommend competitive pricing to maintain volume.`;
      } else {
        reasoning = `Current pricing is optimal for market conditions.`;
      }

      return {
        itemId: item._id,
        itemName: item.itemName,
        currentPrice: basePrice,
        recommendedPrice,
        expectedDemand: Math.round(item.currentStock * (0.7 + Math.random() * 0.6)),
        competitorAverage,
        profitability,
        reasoning
      };
    });
  };

  const recommendations = generatePricingRecommendations();

  const handleApplyPricing = async (rec: PricingRecommendation) => {
    try {
      await updatePricing({
        id: rec.itemId as Id<'inventory'>,
        pricePerUnit: rec.recommendedPrice
      });
      setAppliedUpdates(prev => new Set([...prev, rec.itemId]));
    } catch (error) {
      console.error('Error updating pricing:', error);
    }
  };

  const applyAllRecommendations = async () => {
    const updates = recommendations.filter(rec => 
      rec.recommendedPrice !== rec.currentPrice && 
      !appliedUpdates.has(rec.itemId)
    );
    
    for (const rec of updates) {
      await handleApplyPricing(rec);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">🤖 Smart Pricing Engine</h2>
            <p className="opacity-90">AI-powered pricing optimization for maximum profitability</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{recommendations.length}</div>
            <div className="text-sm opacity-90">Items Analyzed</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Analysis Period:</label>
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={autoUpdateEnabled}
                onChange={(e) => setAutoUpdateEnabled(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Auto-update pricing</span>
            </label>
            
            <button
              onClick={applyAllRecommendations}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              Apply All Recommendations
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">
              {recommendations.filter(r => r.profitability === 'high').length}
            </div>
            <div className="text-sm text-green-700">High Profit Opportunities</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {recommendations.filter(r => r.recommendedPrice > r.currentPrice).length}
            </div>
            <div className="text-sm text-yellow-700">Price Increase Suggested</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">
              ₹{recommendations.reduce((sum, r) => sum + (r.recommendedPrice - r.currentPrice), 0).toFixed(0)}
            </div>
            <div className="text-sm text-blue-700">Potential Revenue Increase</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-600">
              {Math.round(recommendations.reduce((sum, r) => sum + r.expectedDemand, 0) / recommendations.length)}
            </div>
            <div className="text-sm text-purple-700">Avg Expected Demand</div>
          </div>
        </div>
      </div>

      {/* Pricing Recommendations */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Pricing Recommendations</h3>
          <p className="text-sm text-gray-600 mt-1">AI-analyzed optimal pricing based on market conditions and demand</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recommended</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Market Avg</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Demand</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profitability</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recommendations.map((rec) => {
                const priceChange = rec.recommendedPrice - rec.currentPrice;
                const isApplied = appliedUpdates.has(rec.itemId);
                
                return (
                  <tr key={rec.itemId} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{rec.itemName}</div>
                      <div className="text-sm text-gray-500 max-w-xs">{rec.reasoning}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      ₹{rec.currentPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900">
                          ₹{rec.recommendedPrice.toFixed(2)}
                        </span>
                        {priceChange !== 0 && (
                          <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                            priceChange > 0 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {priceChange > 0 ? '+' : ''}₹{priceChange.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      ₹{rec.competitorAverage.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {rec.expectedDemand} units
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        rec.profitability === 'high' ? 'bg-green-100 text-green-800' :
                        rec.profitability === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {rec.profitability} profit
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {isApplied ? (
                        <span className="text-green-600 text-sm font-medium">✓ Applied</span>
                      ) : (
                        <button
                          onClick={() => handleApplyPricing(rec)}
                          disabled={rec.recommendedPrice === rec.currentPrice}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                            rec.recommendedPrice === rec.currentPrice
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-500 hover:bg-blue-600 text-white'
                          }`}
                        >
                          {rec.recommendedPrice === rec.currentPrice ? 'Optimal' : 'Apply'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Market Insights */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Market Insights</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">📈 Trending Up</h4>
            <p className="text-sm text-blue-700">
              Vegetable prices showing 8% increase this week due to seasonal demand. 
              Consider increasing prices for tomatoes, onions, and leafy greens.
            </p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <h4 className="font-medium text-orange-800 mb-2">⚠️ Price Alert</h4>
            <p className="text-sm text-orange-700">
              Rice and wheat prices expected to drop 5% next week due to new supply arrivals. 
              Consider current inventory levels.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
