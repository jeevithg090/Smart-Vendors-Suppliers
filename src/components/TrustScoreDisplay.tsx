import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

interface TrustScoreDisplayProps {
  supplierId: Id<"suppliers">;
  showBreakdown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const TrustScoreDisplay: React.FC<TrustScoreDisplayProps> = ({
  supplierId,
  showBreakdown = false,
  size = 'md',
  className = ''
}) => {
  const [showDetails, setShowDetails] = useState(false);
  
  const trustBreakdown = useQuery(api.ratings.getTrustScoreBreakdown, { supplierId });
  const ratingStats = useQuery(api.ratings.getSupplierRatingStats, { supplierId });

  if (!trustBreakdown || !ratingStats) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="bg-gray-200 rounded h-6 w-20"></div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return 'text-green-600 bg-green-100';
    if (score >= 4.0) return 'text-blue-600 bg-blue-100';
    if (score >= 3.5) return 'text-yellow-600 bg-yellow-100';
    if (score >= 3.0) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 4.5) return 'Excellent';
    if (score >= 4.0) return 'Very Good';
    if (score >= 3.5) return 'Good';
    if (score >= 3.0) return 'Fair';
    return 'Poor';
  };

  const sizeClasses = {
    sm: 'text-sm px-2 py-1',
    md: 'text-base px-3 py-1.5',
    lg: 'text-lg px-4 py-2'
  };

  const iconSize = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const renderStars = (rating: number, showNumber: boolean = true) => {
    return (
      <div className="flex items-center space-x-1">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <svg
              key={star}
              className={`${iconSize[size]} ${
                star <= rating ? 'text-yellow-400' : 'text-gray-300'
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
        {showNumber && (
          <span className="text-sm font-medium text-gray-700">
            {rating.toFixed(1)}
          </span>
        )}
      </div>
    );
  };

  const renderProgressBar = (value: number, max: number = 5, color: string = 'blue') => {
    const percentage = (value / max) * 100;
    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`bg-${color}-600 h-2 rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    );
  };

  return (
    <div className={className}>
      {/* Main Trust Score Display */}
      <div className="flex items-center space-x-2">
        <div className={`inline-flex items-center space-x-2 rounded-full font-semibold ${sizeClasses[size]} ${getScoreColor(trustBreakdown.currentScore)}`}>
          <svg className={`${iconSize[size]}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>{trustBreakdown.currentScore.toFixed(1)}</span>
          <span className="text-xs opacity-75">{getScoreLabel(trustBreakdown.currentScore)}</span>
        </div>

        {showBreakdown && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className={`${iconSize[size]} transform transition-transform ${showDetails ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Detailed Breakdown */}
      {showBreakdown && showDetails && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
          <h4 className="font-semibold text-gray-900">Trust Score Breakdown</h4>
          
          {/* Overall Rating */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-gray-700">Overall Rating</span>
              <span className="text-sm text-gray-600">
                {ratingStats.averageRating.toFixed(1)}/5 ({ratingStats.totalRatings} reviews)
              </span>
            </div>
            {renderStars(ratingStats.averageRating, false)}
          </div>

          {/* Category Ratings */}
          <div className="space-y-3">
            <h5 className="text-sm font-medium text-gray-700">Category Ratings</h5>
            
            {Object.entries(ratingStats.categoryAverages).map(([category, rating]) => (
              <div key={category}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600 capitalize">{category}</span>
                  <span className="text-sm font-medium text-gray-700">{(rating as number).toFixed(1)}</span>
                </div>
                {renderProgressBar(rating as number)}
              </div>
            ))}
          </div>

          {/* Trust Factors */}
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-gray-700">Trust Factors</h5>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${trustBreakdown.factors.volumeBonus > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span>Volume Bonus</span>
                <span className="font-medium">+{trustBreakdown.factors.volumeBonus.toFixed(1)}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${trustBreakdown.factors.consistencyBonus > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span>Consistency</span>
                <span className="font-medium">+{trustBreakdown.factors.consistencyBonus.toFixed(1)}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${trustBreakdown.factors.certificationBonus > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span>FSSAI Certified</span>
                <span className="font-medium">+{trustBreakdown.factors.certificationBonus.toFixed(1)}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${trustBreakdown.factors.verificationBonus > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span>Verified</span>
                <span className="font-medium">+{trustBreakdown.factors.verificationBonus.toFixed(1)}</span>
              </div>
            </div>
          </div>

          {/* Rating Distribution */}
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2">Rating Distribution</h5>
            <div className="space-y-1">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = ratingStats.ratingDistribution[stars as keyof typeof ratingStats.ratingDistribution];
                const percentage = ratingStats.totalRatings > 0 ? (count / ratingStats.totalRatings) * 100 : 0;
                
                return (
                  <div key={stars} className="flex items-center space-x-2 text-xs">
                    <span className="w-4">{stars}</span>
                    <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrustScoreDisplay;