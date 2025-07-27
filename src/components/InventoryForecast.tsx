import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useState } from 'react';

interface Forecast {
  item: string;
  predictedQty: number;
  confidence: number;
  forecastDate: number;
  reason?: string;
}

interface InventoryForecastProps {
  supplierId: string;
}

export default function InventoryForecast({ supplierId }: InventoryForecastProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get current forecasts
  const forecasts = useQuery(api.suppliers.getSupplierForecasts, { supplierId }) as Forecast[] | undefined;
  
  // Get supplier profile for additional context
  const supplier = useQuery(api.suppliers.getSupplierById, { supplierId: supplierId as any });
  
  // Manual forecast generation mutation
  const generateForecast = useMutation(api.suppliers.generateForecastForSupplier);

  const handleGenerateForecast = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      await generateForecast({ supplierId: supplierId as any });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate forecast');
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

  if (!supplier) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
                  <div>
            <h3 className="text-lg font-medium text-gray-800">AI Inventory Forecast</h3>
            <p className="text-sm text-gray-600">
              Predictions for the next 7 days based on Indian market trends, festivals, and order history
            </p>
          </div>
        <button
          onClick={handleGenerateForecast}
          disabled={isGenerating}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            isGenerating
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-orange-500 hover:bg-orange-600 text-white'
          }`}
        >
          {isGenerating ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </span>
          ) : (
            'Generate Forecast'
          )}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {forecasts && forecasts.length > 0 ? (
        <div className="space-y-4">
          {forecasts.map((forecast, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{forecast.item}</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Predicted demand: <span className="font-medium">{forecast.predictedQty.toFixed(1)} units</span>
                  </p>
                </div>
                <div className="ml-4">
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${getConfidenceColor(forecast.confidence)}`}>
                    {getConfidenceLabel(forecast.confidence)} Confidence
                  </span>
                </div>
              </div>
              
              {forecast.reason && (
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                  <span className="font-medium">AI Reasoning:</span> {forecast.reason}
                </div>
              )}
              
              <div className="mt-3 text-xs text-gray-500">
                Forecast generated: {new Date(forecast.forecastDate).toLocaleDateString()}
              </div>
            </div>
          ))}
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">AI Insights for Indian Market</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>• Forecasts consider Indian festivals (Diwali, Holi, etc.)</p>
                  <p>• Seasonal adjustments for monsoon, summer, winter</p>
                  <p>• FSSAI certification impact on demand</p>
                  <p>• Regional food preferences and local events</p>
                  <p>• Updated daily at 2 AM with latest market data</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Forecasts Available</h3>
          <p className="text-gray-600 mb-4">
            Generate your first AI-powered inventory forecast tailored for the Indian market to get started with smart inventory planning.
          </p>
          <button
            onClick={handleGenerateForecast}
            disabled={isGenerating}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              isGenerating
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-orange-500 hover:bg-orange-600 text-white'
            }`}
          >
            {isGenerating ? 'Generating...' : 'Generate First Forecast'}
          </button>
        </div>
      )}
    </div>
  );
} 