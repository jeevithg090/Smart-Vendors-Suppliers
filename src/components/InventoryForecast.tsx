import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

interface InventoryForecastProps {
  supplierId: Id<"suppliers">;
}

export default function InventoryForecast({ supplierId }: InventoryForecastProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  
  const forecasts = useQuery(api.suppliers.getSupplierForecasts, { supplierId });
  const generateForecast = useMutation(api.suppliers.generateForecastForSupplier);

  const handleGenerateForecast = async () => {
    setIsGenerating(true);
    try {
      await generateForecast({ supplierId });
    } catch (error) {
      console.error('Error generating forecast:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">AI Inventory Forecast</h2>
            <p className="text-gray-600">
              Predict demand for your inventory items based on historical data and market trends
            </p>
          </div>
          <button
            onClick={handleGenerateForecast}
            disabled={isGenerating}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Generate New Forecast
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {forecasts && forecasts.length > 0 ? (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center mb-3">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <h3 className="text-lg font-semibold text-blue-800">Forecast Summary</h3>
              </div>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-blue-600 font-medium">Total Items Forecasted</div>
                  <div className="text-2xl font-bold text-blue-800">{forecasts.length}</div>
                </div>
                <div>
                  <div className="text-blue-600 font-medium">High Confidence Predictions</div>
                  <div className="text-2xl font-bold text-blue-800">
                    {forecasts.filter((f: any) => f.confidence >= 0.8).length}
                  </div>
                </div>
                <div>
                  <div className="text-blue-600 font-medium">Last Updated</div>
                  <div className="text-sm font-medium text-blue-800">
                    {formatDate(forecasts[0]?.forecastDate || Date.now())}
                  </div>
                </div>
              </div>
            </div>

            {/* Forecasts Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {forecasts.map((forecast: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-blue-200 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-800 truncate">{forecast.item}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(forecast.confidence)}`}>
                      {getConfidenceLabel(forecast.confidence)}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Predicted Demand:</span>
                      <span className="font-semibold text-gray-800">
                        {forecast.predictedQty} units
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Confidence:</span>
                      <span className="font-semibold text-gray-800">
                        {Math.round(forecast.confidence * 100)}%
                      </span>
                    </div>
                    
                    {forecast.reason && (
                      <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
                        <strong>Reasoning:</strong> {forecast.reason}
                      </div>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="mt-4 flex space-x-2">
                    <button className="flex-1 bg-green-50 text-green-600 py-1 px-2 rounded text-xs hover:bg-green-100 transition-colors">
                      Restock Now
                    </button>
                    <button className="flex-1 bg-blue-50 text-blue-600 py-1 px-2 rounded text-xs hover:bg-blue-100 transition-colors">
                      Set Alert
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Insights */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="text-yellow-800 font-medium mb-2">AI Insights & Recommendations</h4>
                  <ul className="text-yellow-700 text-sm space-y-1">
                    <li>• Consider stocking up on high-confidence predictions to avoid stockouts</li>
                    <li>• Monitor low-confidence items closely and adjust based on actual demand</li>
                    <li>• Festival seasons typically increase demand by 20-40% for food items</li>
                    <li>• Weather patterns can significantly impact fresh produce demand</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              No Forecasts Available
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Generate AI-powered demand forecasts to optimize your inventory management and reduce stockouts.
            </p>
            <button
              onClick={handleGenerateForecast}
              disabled={isGenerating}
              className="bg-blue-500 text-white px-6 py-3 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? 'Generating...' : 'Generate First Forecast'}
            </button>
          </div>
        )}
      </div>

      {/* How it Works */}
      <div className="p-6 border-t border-gray-200 bg-gray-50">
        <h4 className="font-semibold text-gray-800 mb-3">How AI Forecasting Works</h4>
        <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-600">
          <div className="flex items-start space-x-2">
            <span className="text-blue-500 font-bold">1.</span>
            <div>
              <div className="font-medium text-gray-700">Data Analysis</div>
              <div>Analyzes your order history, seasonal patterns, and market trends</div>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-500 font-bold">2.</span>
            <div>
              <div className="font-medium text-gray-700">AI Processing</div>
              <div>Uses machine learning to predict future demand with confidence scores</div>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-500 font-bold">3.</span>
            <div>
              <div className="font-medium text-gray-700">Actionable Insights</div>
              <div>Provides specific recommendations for inventory management</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}