import { useMemo, useState, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
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

interface ReportHistoryItem {
  _id: Id<'marketReports'>;
  title: string;
  generatedAt: number;
  type: string;
  content: string;
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
  const [message, setMessage] = useState('');
  const [showAlertPreferences, setShowAlertPreferences] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<PriceAlert | null>(null);
  const [showCompetitorCreator, setShowCompetitorCreator] = useState(false);
  const [customReportType, setCustomReportType] = useState('Competitor pricing analysis');

  const priceAlertsData = useQuery(api.priceAlerts.getVendorPriceAlerts, { vendorId });
  const inventory = useQuery(api.inventory.getAvailableInventory, {});
  const competitorInsights = useQuery(api.marketIntelligence.getCompetitorInsights, { vendorId }) as CompetitorInsight[] | undefined;
  const seasonalInsights = useQuery(api.marketIntelligence.getSeasonalInsights, { vendorId }) as SeasonalInsight[] | undefined;
  const reportHistory = useQuery(api.marketIntelligence.getMarketReports, { vendorId }) as ReportHistoryItem[] | undefined;

  const createCompetitorInsight = useMutation(api.marketIntelligence.createCompetitorInsight);
  const deleteCompetitorInsight = useMutation(api.marketIntelligence.deleteCompetitorInsight);
  const createMarketReport = useMutation(api.marketIntelligence.createMarketReport);

  const itemNames = useMemo(() => {
    if (!inventory) return [];
    const names = Array.from(new Set(inventory.map((item) => item.itemName)));
    return names.slice(0, 12);
  }, [inventory]);

  const trendDays = timeframe === '24h' ? 1 : timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
  const priceTrends = useQuery(
    api.inventory.getBulkPriceTrends,
    itemNames.length > 0 ? { itemNames, days: trendDays } : "skip"
  ) as Array<{
    itemName: string;
    currentPrice: number;
    change: number;
    changePercent: number;
    trend: string;
    dataPoints: number;
  }> | undefined;

  const priceTrendsMonthly = useQuery(
    api.inventory.getBulkPriceTrends,
    itemNames.length > 0 ? { itemNames, days: 30 } : "skip"
  ) as Array<{
    itemName: string;
    currentPrice: number;
    change: number;
    changePercent: number;
    trend: string;
    dataPoints: number;
  }> | undefined;

  const marketTrends: MarketTrend[] = useMemo(() => {
    if (!inventory || !priceTrends) return [];

    const monthlyMap = new Map(
      (priceTrendsMonthly ?? []).map((trend) => [trend.itemName.toLowerCase(), trend])
    );

    return priceTrends.map((trend) => {
      const monthly = monthlyMap.get(trend.itemName.toLowerCase());
      const suppliers = inventory.filter((item) => item.itemName === trend.itemName).length;
      const monthlyChange = monthly?.changePercent ?? 0;
      const seasonalPattern: MarketTrend['seasonalPattern'] =
        monthlyChange > 5 ? 'increasing' : monthlyChange < -5 ? 'decreasing' : 'stable';
      const confidence = Math.min(95, Math.max(50, (trend.dataPoints || 1) * 10));

      return {
        item: trend.itemName,
        category: inventory.find((item) => item.itemName === trend.itemName)?.category || 'General',
        currentPrice: trend.currentPrice,
        weeklyChange: trend.changePercent,
        monthlyChange,
        seasonalPattern,
        forecast7Days: trend.currentPrice * (1 + trend.changePercent / 100),
        forecast30Days: trend.currentPrice * (1 + monthlyChange / 100),
        confidence,
        suppliers,
      };
    });
  }, [inventory, priceTrends, priceTrendsMonthly]);

  const priceAlerts: PriceAlert[] = useMemo(() => {
    const alerts: PriceAlert[] = [];
    const categoryByItem = new Map<string, string>(
      (inventory ?? []).map((item) => [item.itemName.toLowerCase(), item.category])
    );

    (priceAlertsData ?? []).forEach((alert) => {
      alerts.push({
        id: String(alert._id),
        itemName: alert.itemName,
        currentPrice: alert.currentPrice,
        previousPrice: alert.currentPrice,
        changePercent: 0,
        trend: 'stable',
        category: categoryByItem.get(alert.itemName.toLowerCase()) || 'General',
        region: location.city,
        alertType: alert.currentPrice <= alert.targetPrice ? 'opportunity' : 'significant_increase',
        message: alert.currentPrice <= alert.targetPrice
          ? 'Price alert triggered at or below target.'
          : 'Price above target.',
        timestamp: new Date(alert.lastTriggered || alert.createdAt),
      });
    });

    (priceTrends ?? [])
      .filter((trend) => Math.abs(trend.changePercent) >= 5)
      .forEach((trend) => {
        const alertType = trend.changePercent > 0 ? 'significant_increase' : 'significant_decrease';
        alerts.push({
          id: `trend-${trend.itemName}`,
          itemName: trend.itemName,
          currentPrice: trend.currentPrice,
          previousPrice: trend.currentPrice - trend.change,
          changePercent: trend.changePercent,
          trend: trend.changePercent > 0 ? 'up' : 'down',
          category: categoryByItem.get(trend.itemName.toLowerCase()) || 'General',
          region: location.city,
          alertType,
          message: trend.changePercent > 0
            ? 'Prices rising based on recent transactions.'
            : 'Prices dropping based on recent transactions.',
          timestamp: new Date(),
        });
      });

    return alerts.slice(0, 12);
  }, [priceAlertsData, priceTrends, inventory, location.city]);

  const reportHistoryList = reportHistory ?? [];

  const [newCompetitor, setNewCompetitor] = useState({
    competitorName: '',
    businessType: 'Street Food Cart',
    location: '',
    priceStrategy: 'competitive' as CompetitorInsight['priceStrategy']
  });

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

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(''), 5000);
    return () => window.clearTimeout(timer);
  }, [message]);

  const notify = (text: string) => {
    setMessage(text);
  };

  const downloadReport = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportTrendsReport = () => {
    const csvRows = [
      ['Item', 'Category', 'Current Price', 'Weekly Change', 'Monthly Change', 'Forecast 7 Days', 'Confidence'],
      ...marketTrends.map(trend => [
        trend.item,
        trend.category,
        trend.currentPrice.toString(),
        trend.weeklyChange.toString(),
        trend.monthlyChange.toString(),
        trend.forecast7Days.toString(),
        `${trend.confidence}%`
      ])
    ];

    const csv = csvRows.map(row => row.join(',')).join('\\n');
    const fileName = `market-trends-${location.city.toLowerCase().replace(/\\s+/g, '-')}.csv`;
    downloadReport(fileName, csv);
    notify('Trends report exported.');
  };

  const createReportEntry = async (title: string, type: string, content: string) => {
    await createMarketReport({
      vendorId,
      title,
      type,
      content,
      generatedAt: Date.now(),
    });
    notify(`${title} generated.`);
  };

  const generateWeeklyReport = async () => {
    const content = [
      `Vendor: ${vendorId}`,
      `Location: ${location.city}, ${location.state}`,
      `Generated: ${new Date().toLocaleString()}`,
      '',
      'Key Alerts:',
      ...priceAlerts.map(alert => `- ${alert.itemName}: ${alert.message}`),
      '',
      'Top Trend Items:',
      ...marketTrends.slice(0, 3).map(trend => `- ${trend.item}: ₹${trend.currentPrice} (${trend.weeklyChange > 0 ? '+' : ''}${trend.weeklyChange.toFixed(1)}%)`)
    ].join('\\n');

    await createReportEntry(`Weekly Market Summary - ${new Date().toLocaleDateString()}`, 'Weekly Summary', content);
  };

  const generateCustomReport = async () => {
    const content = [
      `Custom Report Type: ${customReportType}`,
      `Generated: ${new Date().toLocaleString()}`,
      `City: ${location.city}`,
      '',
      'Recommended Actions:',
      '- Review high-volatility ingredients',
      '- Compare price movements against competitor positioning',
      '- Update weekly purchase plan based on forecast'
    ].join('\\n');

    await createReportEntry(`${customReportType} - ${location.city}`, 'Custom', content);
  };

  const addCompetitor = async () => {
    if (!newCompetitor.competitorName || !newCompetitor.location) {
      notify('Competitor name and location are required.');
      return;
    }

    await createCompetitorInsight({
      vendorId,
      competitorName: newCompetitor.competitorName,
      businessType: newCompetitor.businessType,
      location: newCompetitor.location,
      popularItems: [],
      priceStrategy: newCompetitor.priceStrategy,
      estimatedRevenue: undefined,
      uniqueSellingPoints: [],
      strengths: [],
      opportunities: [],
    });
    setShowCompetitorCreator(false);
    setNewCompetitor({
      competitorName: '',
      businessType: 'Street Food Cart',
      location: '',
      priceStrategy: 'competitive'
    });
    notify(`${newCompetitor.competitorName} added to competitor watchlist.`);
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

      {message && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 text-sm text-indigo-800">
          {message}
        </div>
      )}

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
                <button
                  onClick={() => {
                    setShowAlertPreferences(true);
                    notify('Adjust your alert preferences.');
                  }}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-md font-medium transition-colors"
                >
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
              {priceAlerts.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-200 p-6 text-sm text-gray-600">
                  No alerts yet. Create price alerts to track item movements.
                </div>
              )}
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
                          <div>₹{alert.currentPrice}/unit</div>
                        </div>
                        <div>
                          <span className="font-medium">Previous Price:</span>
                          <div>₹{alert.previousPrice}/unit</div>
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
                      <button
                        onClick={() => {
                          setSelectedAlert(alert);
                          notify(`Viewing details for ${alert.itemName}.`);
                        }}
                        className="mt-2 text-sm font-medium hover:underline"
                      >
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
              <button
                onClick={exportTrendsReport}
                className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
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
              <button
                onClick={() => setShowCompetitorCreator(true)}
                className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                + Add Competitor
              </button>
            </div>

            <div className="grid gap-6">
              {(competitorInsights ?? []).length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-200 p-6 text-sm text-gray-600">
                  No competitors tracked yet. Add a competitor to start analysis.
                </div>
              )}
              {(competitorInsights ?? []).map((competitor, index) => (
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
                        Est. Revenue: {competitor.estimatedRevenue || 'Not set'}
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
                    <button
                      onClick={() => {
                        setActiveTab('reports');
                        setCustomReportType('Competitor pricing analysis');
                        notify(`Detailed analysis opened for ${competitor.competitorName}.`);
                      }}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      View Detailed Analysis
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('alerts');
                        notify(`Price alerts focused for ${competitor.competitorName}.`);
                      }}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
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
              {(seasonalInsights ?? []).length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-200 p-6 text-sm text-gray-600">
                  No seasonal insights available yet.
                </div>
              )}
              {(seasonalInsights ?? []).map((insight, index) => (
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
                <button
                  onClick={generateWeeklyReport}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-2 px-4 rounded-md font-medium transition-colors"
                >
                  Generate Weekly Report
                </button>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-4">🎯 Custom Analysis</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Create custom reports focusing on specific items, competitors, or time periods that matter to your business.
                </p>
                <div className="space-y-3">
                  <select
                    value={customReportType}
                    onChange={(e) => setCustomReportType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option>Competitor pricing analysis</option>
                    <option>Seasonal trend forecast</option>
                    <option>Cost optimization report</option>
                    <option>Market opportunity analysis</option>
                  </select>
                  <button
                    onClick={generateCustomReport}
                    className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md font-medium transition-colors"
                  >
                    Create Custom Report
                  </button>
                </div>
              </div>
            </div>

            {/* Report History */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-800 mb-4">Report History</h4>
              <div className="space-y-3">
                {reportHistoryList.map((report) => (
                  <div key={report._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{report.title}</div>
                      <div className="text-sm text-gray-500">
                        Generated {new Date(report.generatedAt).toLocaleDateString()} • {report.type}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        downloadReport(`${report.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`, report.content);
                        notify(`${report.title} downloaded.`);
                      }}
                      className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                    >
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {showAlertPreferences && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Alert Preferences</h3>
                <button
                  onClick={() => setShowAlertPreferences(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-600">
                Alerts are currently configured for the <span className="font-medium">{timeframe}</span> timeframe in {location.city}.
              </p>
              <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                <li>Notify on price increase above 8%</li>
                <li>Notify on price decrease above 5%</li>
                <li>Prioritize alerts for frequently purchased categories</li>
              </ul>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowAlertPreferences(false);
                    notify('Alert preferences saved.');
                  }}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-md font-medium transition-colors"
                >
                  Save Preferences
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">{selectedAlert.itemName} Alert Details</h3>
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-700">{selectedAlert.message}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Current Price</div>
                  <div className="font-semibold">₹{selectedAlert.currentPrice}</div>
                </div>
                <div>
                  <div className="text-gray-500">Previous Price</div>
                  <div className="font-semibold">₹{selectedAlert.previousPrice}</div>
                </div>
                <div>
                  <div className="text-gray-500">Change</div>
                  <div className={`font-semibold ${selectedAlert.changePercent > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {selectedAlert.changePercent > 0 ? '+' : ''}{selectedAlert.changePercent.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Time</div>
                  <div className="font-semibold">{selectedAlert.timestamp.toLocaleString()}</div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-md font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCompetitorCreator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Add Competitor</h3>
                <button
                  onClick={() => setShowCompetitorCreator(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ✕
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Competitor Name</label>
                  <input
                    type="text"
                    value={newCompetitor.competitorName}
                    onChange={(e) => setNewCompetitor(prev => ({ ...prev, competitorName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business Type</label>
                  <input
                    type="text"
                    value={newCompetitor.businessType}
                    onChange={(e) => setNewCompetitor(prev => ({ ...prev, businessType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <input
                    type="text"
                    value={newCompetitor.location}
                    onChange={(e) => setNewCompetitor(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g. 1.2 km away"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price Strategy</label>
                  <select
                    value={newCompetitor.priceStrategy}
                    onChange={(e) => setNewCompetitor(prev => ({ ...prev, priceStrategy: e.target.value as CompetitorInsight['priceStrategy'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="premium">Premium</option>
                    <option value="competitive">Competitive</option>
                    <option value="budget">Budget</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowCompetitorCreator(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={addCompetitor}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md"
                >
                  Add Competitor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
