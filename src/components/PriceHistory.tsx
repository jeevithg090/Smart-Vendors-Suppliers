import React, { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { safeDivide, safePercentage, validateNumber, safeRound } from '../utils/numberValidation';

interface PriceHistoryProps {
  itemName: string;
  supplierId?: Id<"suppliers">;
}

interface PricePoint {
  supplierId: Id<"suppliers">;
  price: number;
  stock: number;
  timestamp: number;
  isAvailable: boolean;
}

const PriceHistory: React.FC<PriceHistoryProps> = ({ itemName, supplierId }) => {
  const [timeRange, setTimeRange] = useState<7 | 30 | 90>(30);

  const priceHistory = useQuery(api.inventory.getPriceHistory, {
    itemName,
    supplierId,
    days: timeRange,
  });

  // Calculate trend analysis
  const trendAnalysis = useMemo(() => {
    if (!priceHistory || priceHistory.length < 2) {
      return {
        trend: 'stable' as const,
        change: 0,
        changePercent: 0,
        avgPrice: 0,
        minPrice: 0,
        maxPrice: 0,
        volatility: 0,
      };
    }

    const prices = priceHistory.map(p => p.price).filter(p => p > 0);
    if (prices.length === 0) {
      return {
        trend: 'stable' as const,
        change: 0,
        changePercent: 0,
        avgPrice: 0,
        minPrice: 0,
        maxPrice: 0,
        volatility: 0,
      };
    }

    const avgPrice = safeDivide(prices.reduce((sum, price) => sum + price, 0), prices.length, 0);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    // Calculate trend (comparing first and last price)
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const change = lastPrice - firstPrice;
    const changePercent = safePercentage(change, firstPrice, 0);

    let trend: 'rising' | 'falling' | 'stable' = 'stable';
    if (Math.abs(changePercent) > 5) {
      trend = changePercent > 0 ? 'rising' : 'falling';
    }

    // Calculate volatility (standard deviation)
    const variance = safeDivide(prices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0), prices.length, 0);
    const volatility = validateNumber(Math.sqrt(variance), 0);

    return {
      trend,
      change,
      changePercent,
      avgPrice,
      minPrice,
      maxPrice,
      volatility,
    };
  }, [priceHistory]);

  // Group price history by day for chart display
  const chartData = useMemo(() => {
    if (!priceHistory) return [];

    const groupedByDay: { [key: string]: PricePoint[] } = {};
    
    priceHistory.forEach(point => {
      const date = new Date(point.timestamp).toDateString();
      if (!groupedByDay[date]) {
        groupedByDay[date] = [];
      }
      groupedByDay[date].push(point);
    });

    return Object.entries(groupedByDay)
      .map(([date, points]) => {
        const avgPrice = safeDivide(points.reduce((sum, p) => sum + validateNumber(p.price, 0), 0), points.length, 0);
        const totalStock = points.reduce((sum, p) => sum + validateNumber(p.stock, 0), 0);
        return {
          date,
          avgPrice,
          totalStock,
          dataPoints: points.length,
          timestamp: new Date(date).getTime(),
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [priceHistory]);

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'rising': return 'text-red-600';
      case 'falling': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'rising': return '↗';
      case 'falling': return '↘';
      default: return '→';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (!priceHistory) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Price History: {itemName}
          </h2>
          <div className="flex space-x-2">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => setTimeRange(days as 7 | 30 | 90)}
                className={`px-3 py-1 text-sm rounded-md border ${
                  timeRange === days
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>
        </div>

        {/* Trend Analysis */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Current Trend</div>
            <div className={`text-lg font-semibold ${getTrendColor(trendAnalysis.trend)}`}>
              {getTrendIcon(trendAnalysis.trend)} {trendAnalysis.trend}
            </div>
            <div className="text-xs text-gray-500">
              {trendAnalysis.changePercent > 0 ? '+' : ''}{safeRound(trendAnalysis.changePercent, 1, 0).toFixed(1)}%
            </div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-blue-600 mb-1">Average Price</div>
            <div className="text-lg font-semibold text-blue-600">
              ₹{safeRound(trendAnalysis.avgPrice, 2, 0).toFixed(2)}
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-green-600 mb-1">Lowest Price</div>
            <div className="text-lg font-semibold text-green-600">
              ₹{safeRound(trendAnalysis.minPrice, 2, 0).toFixed(2)}
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-sm text-red-600 mb-1">Highest Price</div>
            <div className="text-lg font-semibold text-red-600">
              ₹{safeRound(trendAnalysis.maxPrice, 2, 0).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Volatility Indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Price Volatility</span>
            <span className="text-sm text-gray-500">
              {trendAnalysis.volatility < 5 ? 'Low' : trendAnalysis.volatility < 15 ? 'Medium' : 'High'}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                trendAnalysis.volatility < 5 ? 'bg-green-500' : 
                trendAnalysis.volatility < 15 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min((trendAnalysis.volatility / 20) * 100, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Price Chart */}
      <div className="p-6">
        {chartData.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg mb-2">No price data available</div>
            <div className="text-gray-400 text-sm">
              Price history will appear here once data is available
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Simple line chart representation */}
            <div className="relative h-64 bg-gray-50 rounded-lg p-4">
              <div className="absolute inset-4">
                <div className="h-full flex items-end space-x-1">
                  {chartData.map((point, index) => {
                    const height = safePercentage((point.avgPrice - trendAnalysis.minPrice), (trendAnalysis.maxPrice - trendAnalysis.minPrice), 5);
                    return (
                      <div
                        key={index}
                        className="flex-1 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer group relative"
                        style={{ height: `${Math.max(height, 5)}%` }}
                        title={`${formatDate(point.timestamp)}: ₹${safeRound(point.avgPrice, 2, 0).toFixed(2)}`}
                      >
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {formatDate(point.timestamp)}<br />
                          ₹{safeRound(point.avgPrice, 2, 0).toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 -ml-12">
                  <span>₹{safeRound(trendAnalysis.maxPrice, 0, 0).toFixed(0)}</span>
                  <span>₹{safeRound(safeDivide(trendAnalysis.maxPrice + trendAnalysis.minPrice, 2, 0), 0, 0).toFixed(0)}</span>
                  <span>₹{safeRound(trendAnalysis.minPrice, 0, 0).toFixed(0)}</span>
                </div>
              </div>
              
              {/* X-axis labels */}
              <div className="absolute bottom-0 left-4 right-4 flex justify-between text-xs text-gray-500 mt-2">
                {chartData.length > 0 && (
                  <>
                    <span>{formatDate(chartData[0].timestamp)}</span>
                    {chartData.length > 2 && (
                      <span>{formatDate(chartData[Math.floor(chartData.length / 2)].timestamp)}</span>
                    )}
                    <span>{formatDate(chartData[chartData.length - 1].timestamp)}</span>
                  </>
                )}
              </div>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Average Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data Points
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {chartData.slice(-10).reverse().map((point, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(point.timestamp).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ₹{safeRound(point.avgPrice, 2, 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {validateNumber(point.totalStock, 0)} units
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {validateNumber(point.dataPoints, 0)} suppliers
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceHistory;
