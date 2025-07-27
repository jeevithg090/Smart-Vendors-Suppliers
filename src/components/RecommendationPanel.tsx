import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

interface RecommendationPanelProps {
  vendorId: Id<"vendors">;
  onSupplierSelect?: (supplierId: Id<"suppliers">) => void;
  className?: string;
}

interface RecommendationWithSupplier {
  _id: Id<"recommendations">;
  vendorId: Id<"vendors">;
  supplierId: Id<"suppliers">;
  score: number;
  reasons: string[];
  itemCategories: string[];
  priceAdvantage?: number;
  trustFactor: number;
  locationScore: number;
  isActive: boolean;
  createdAt: number;
  expiresAt: number;
  supplier: any;
  relevantInventory: any[];
}

export default function RecommendationPanel({ vendorId, onSupplierSelect, className = "" }: RecommendationPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedRec, setExpandedRec] = useState<string | null>(null);

  // Get recommendations
  const recommendations = useQuery(api.recommendations.getRecommendations, {
    vendorId,
    limit: 5
  }) as RecommendationWithSupplier[] | undefined;

  // Mutations
  const generateRecommendations = useMutation(api.recommendations.generateRecommendations);
  const submitFeedback = useMutation(api.recommendations.submitFeedback);

  const handleGenerateRecommendations = async () => {
    setIsGenerating(true);
    try {
      await generateRecommendations({
        vendorId,
        refreshExisting: true
      });
    } catch (error) {
      console.error('Error generating recommendations:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFeedback = async (recommendationId: Id<"recommendations">, feedback: string, notes?: string) => {
    try {
      await submitFeedback({
        recommendationId,
        vendorId,
        feedback,
        notes
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const formatScore = (score: number) => {
    return Math.round(score * 100);
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-100';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getTrustScoreStars = (trustScore: number) => {
    const stars = [];
    const fullStars = Math.floor(trustScore);
    const hasHalfStar = trustScore % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push('★');
    }
    if (hasHalfStar) {
      stars.push('☆');
    }
    while (stars.length < 5) {
      stars.push('☆');
    }
    
    return stars.join('');
  };

  if (!recommendations) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4 w-48"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-2 w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <svg className="w-5 h-5 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AI Recommendations
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Personalized supplier suggestions based on your preferences and history
            </p>
          </div>
          <button
            onClick={handleGenerateRecommendations}
            disabled={isGenerating}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </>
            )}
          </button>
        </div>
      </div>

      {/* Recommendations List */}
      <div className="p-6">
        {recommendations.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              No recommendations yet
            </h3>
            <p className="text-gray-600 mb-4">
              Generate AI-powered supplier recommendations based on your preferences and ordering history.
            </p>
            <button
              onClick={handleGenerateRecommendations}
              disabled={isGenerating}
              className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
            >
              Generate Recommendations
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map((rec) => (
              <div key={rec._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                {/* Supplier Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <h3 className="text-lg font-semibold text-gray-800 mr-3">
                        {rec.supplier.businessName}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(rec.score)}`}>
                        {formatScore(rec.score)}% Match
                      </span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {rec.supplier.location.city}, {rec.supplier.location.state}
                      
                      <span className="mx-2">•</span>
                      
                      <span className="text-yellow-500 mr-1">
                        {getTrustScoreStars(rec.supplier.trustScore)}
                      </span>
                      <span>({rec.supplier.trustScore.toFixed(1)})</span>
                    </div>

                    {/* Categories */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {rec.itemCategories.map((category) => (
                        <span key={category} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {category}
                        </span>
                      ))}
                    </div>

                    {/* Reasons */}
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-2">
                        {rec.reasons.slice(0, 3).map((reason, index) => (
                          <div key={index} className="flex items-center text-sm text-green-700 bg-green-50 px-2 py-1 rounded">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {reason}
                          </div>
                        ))}
                        {rec.reasons.length > 3 && (
                          <button
                            onClick={() => setExpandedRec(expandedRec === rec._id ? null : rec._id)}
                            className="text-sm text-orange-500 hover:text-orange-600"
                          >
                            +{rec.reasons.length - 3} more
                          </button>
                        )}
                      </div>
                      
                      {expandedRec === rec._id && rec.reasons.length > 3 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {rec.reasons.slice(3).map((reason, index) => (
                            <div key={index} className="flex items-center text-sm text-green-700 bg-green-50 px-2 py-1 rounded">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              {reason}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Price Advantage */}
                    {rec.priceAdvantage && rec.priceAdvantage > 0 && (
                      <div className="mb-3">
                        <div className="flex items-center text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                          Potential savings: ₹{rec.priceAdvantage.toFixed(2)} per unit on average
                        </div>
                      </div>
                    )}

                    {/* Available Items Preview */}
                    {rec.relevantInventory.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm text-gray-600 mb-2">Available items in your categories:</p>
                        <div className="flex flex-wrap gap-2">
                          {rec.relevantInventory.slice(0, 4).map((item) => (
                            <div key={item._id} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              {item.itemName} - ₹{item.pricePerUnit}/{item.unit}
                            </div>
                          ))}
                          {rec.relevantInventory.length > 4 && (
                            <div className="text-xs text-gray-500 px-2 py-1">
                              +{rec.relevantInventory.length - 4} more items
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onSupplierSelect?.(rec.supplierId)}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-medium"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleFeedback(rec._id, "contacted")}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                    >
                      Contact Supplier
                    </button>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleFeedback(rec._id, "helpful")}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                      title="Helpful recommendation"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleFeedback(rec._id, "not_helpful")}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Not helpful"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.106-1.79l-.05-.025A4 4 0 0011.057 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}