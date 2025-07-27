import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

interface ReviewDisplayProps {
  supplierId: Id<"suppliers">;
  limit?: number;
  showFilters?: boolean;
  className?: string;
}

const ReviewDisplay: React.FC<ReviewDisplayProps> = ({
  supplierId,
  limit = 10,
  showFilters = true,
  className = ''
}) => {
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  
  const ratings = useQuery(api.ratings.getSupplierRatings, { 
    supplierId, 
    limit: limit * 2 // Get more to allow for filtering
  });
  
  const ratingStats = useQuery(api.ratings.getSupplierRatingStats, { supplierId });

  if (!ratings || !ratingStats) {
    return (
      <div className={`animate-pulse space-y-4 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-lg h-24"></div>
        ))}
      </div>
    );
  }

  // Filter and sort ratings
  let filteredRatings = ratings.filter(rating => rating.review && rating.review.trim().length > 0);
  
  if (selectedRating) {
    filteredRatings = filteredRatings.filter(rating => Math.round(rating.rating) === selectedRating);
  }

  // Sort ratings
  filteredRatings.sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return b.createdAt - a.createdAt;
      case 'oldest':
        return a.createdAt - b.createdAt;
      case 'highest':
        return b.rating - a.rating;
      case 'lowest':
        return a.rating - b.rating;
      default:
        return b.createdAt - a.createdAt;
    }
  });

  // Limit results
  filteredRatings = filteredRatings.slice(0, limit);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
    return `${Math.ceil(diffDays / 365)} years ago`;
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'text-yellow-400' : 'text-gray-300'
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  const getCategoryColor = (rating: number) => {
    if (rating >= 4.5) return 'bg-green-100 text-green-800';
    if (rating >= 4.0) return 'bg-blue-100 text-blue-800';
    if (rating >= 3.5) return 'bg-yellow-100 text-yellow-800';
    if (rating >= 3.0) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  if (ratingStats.totalRatings === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10m0 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m0 0v8a2 2 0 002 2h6a2 2 0 002-2V8M9 12h6" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No reviews yet</h3>
        <p className="mt-1 text-sm text-gray-500">
          This supplier hasn't received any reviews yet.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header with Stats */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Customer Reviews ({ratingStats.totalRatings})
          </h3>
          <div className="flex items-center space-x-2">
            {renderStars(ratingStats.averageRating)}
            <span className="text-sm font-medium text-gray-700">
              {ratingStats.averageRating.toFixed(1)} out of 5
            </span>
          </div>
        </div>

        {/* Category Averages */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {Object.entries(ratingStats.categoryAverages).map(([category, rating]) => (
            <div key={category} className="text-center">
              <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(rating)}`}>
                <span className="capitalize">{category}</span>
                <span className="ml-1">{rating.toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Filter by rating:</label>
            <select
              value={selectedRating || ''}
              onChange={(e) => setSelectedRating(e.target.value ? parseInt(e.target.value) : null)}
              className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All ratings</option>
              <option value="5">5 stars</option>
              <option value="4">4 stars</option>
              <option value="3">3 stars</option>
              <option value="2">2 stars</option>
              <option value="1">1 star</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="highest">Highest rating</option>
              <option value="lowest">Lowest rating</option>
            </select>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-6">
        {filteredRatings.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No reviews match your filters.</p>
          </div>
        ) : (
          filteredRatings.map((rating) => (
            <div key={rating._id} className="bg-white border border-gray-200 rounded-lg p-6">
              {/* Review Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">
                        {rating.vendor?.businessName?.charAt(0) || 'V'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {rating.vendor?.businessName || 'Anonymous Vendor'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {rating.vendor?.location} • {formatDate(rating.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {renderStars(rating.rating)}
                  <span className="text-sm font-medium text-gray-700">
                    {rating.rating.toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Review Text */}
              <div className="mb-4">
                <p className="text-gray-700 leading-relaxed">{rating.review}</p>
              </div>

              {/* Category Ratings */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {Object.entries(rating.categories).map(([category, categoryRating]) => (
                  <div key={category} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 capitalize">{category}:</span>
                    <div className="flex items-center space-x-1">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            className={`w-3 h-3 ${
                              star <= categoryRating ? 'text-yellow-400' : 'text-gray-300'
                            }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span className="font-medium">{categoryRating.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Details */}
              {rating.order && (
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      Order: {rating.order.items.map(item => item.itemName).join(', ')}
                    </span>
                    <span>₹{rating.order.totalCost.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Load More Button */}
      {filteredRatings.length === limit && ratings.length > limit && (
        <div className="text-center mt-6">
          <button className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-600 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            Load More Reviews
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewDisplay;