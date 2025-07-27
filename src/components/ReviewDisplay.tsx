import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

interface ReviewDisplayProps {
  supplierId: Id<"suppliers">;
  limit?: number;
  showFilters?: boolean;
}

export default function ReviewDisplay({ supplierId, limit = 10, showFilters = false }: ReviewDisplayProps) {
  const [filterRating, setFilterRating] = useState<number | null>(null);
  
  const ratings = useQuery(api.ratings.getSupplierRatings, { 
    supplierId, 
    limit 
  });
  
  const ratingStats = useQuery(api.ratings.getSupplierRatingStats, { 
    supplierId 
  });

  if (!ratings || !ratingStats) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-center space-x-4 mb-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
            <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  const filteredRatings = filterRating 
    ? ratings.filter(rating => Math.round(rating.rating) === filterRating)
    : ratings;

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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center space-x-2">
              {renderStars(ratingStats.averageRating)}
              <span className="text-lg font-semibold text-gray-900">
                {ratingStats.averageRating.toFixed(1)}
              </span>
              <span className="text-gray-600">
                ({ratingStats.totalRatings} reviews)
              </span>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(ratingStats.categoryAverages).map(([category, rating]) => (
            <div key={category} className="text-center">
              <div className="text-sm text-gray-600 capitalize mb-1">{category}</div>
              <div className="flex items-center justify-center space-x-1">
                {renderStars(rating as number)}
                <span className="text-sm font-medium text-gray-700 ml-1">
                  {(rating as number).toFixed(1)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Filter by rating:</span>
          <div className="flex space-x-2">
            <button
              onClick={() => setFilterRating(null)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                filterRating === null
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All
            </button>
            {[5, 4, 3, 2, 1].map((rating) => (
              <button
                key={rating}
                onClick={() => setFilterRating(rating)}
                className={`px-3 py-1 text-sm rounded-full transition-colors flex items-center space-x-1 ${
                  filterRating === rating
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <span>{rating}</span>
                <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredRatings.length > 0 ? (
          filteredRatings.map((rating) => (
            <div key={rating._id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-orange-600 font-semibold text-sm">
                      {rating.vendor?.businessName?.charAt(0) || 'V'}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {rating.vendor?.businessName || 'Anonymous Vendor'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(rating.createdAt)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {renderStars(rating.rating)}
                  <span className="text-sm font-medium text-gray-700">
                    {rating.rating.toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Category Ratings */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                {Object.entries(rating.categories).map(([category, categoryRating]) => (
                  <div key={category} className="text-center">
                    <div className="text-xs text-gray-500 capitalize mb-1">{category}</div>
                    <div className="flex items-center justify-center">
                      {renderStars(categoryRating as number)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Review Text */}
              {rating.review && (
                <div className="text-gray-700 text-sm leading-relaxed">
                  "{rating.review}"
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              {filterRating ? `No ${filterRating}-star reviews` : 'No reviews yet'}
            </h3>
            <p className="text-gray-600">
              {filterRating 
                ? 'Try selecting a different rating filter.'
                : 'Be the first to leave a review for this supplier!'
              }
            </p>
          </div>
        )}
      </div>

      {/* Load More */}
      {filteredRatings.length === limit && (
        <div className="text-center">
          <button className="text-orange-500 hover:text-orange-600 font-medium text-sm">
            Load more reviews
          </button>
        </div>
      )}
    </div>
  );
}