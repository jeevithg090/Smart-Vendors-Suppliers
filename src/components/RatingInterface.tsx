import React, { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

interface RatingInterfaceProps {
  orderId: Id<"orders">;
  vendorId: Id<"vendors">;
  supplierId: Id<"suppliers">;
  supplierName: string;
  onRatingSubmitted?: () => void;
  onCancel?: () => void;
}

interface CategoryRatings {
  quality: number;
  delivery: number;
  communication: number;
  pricing: number;
}

const RatingInterface: React.FC<RatingInterfaceProps> = ({
  orderId,
  vendorId,
  supplierId,
  supplierName,
  onRatingSubmitted,
  onCancel
}) => {
  const [overallRating, setOverallRating] = useState<number>(0);
  const [categoryRatings, setCategoryRatings] = useState<CategoryRatings>({
    quality: 0,
    delivery: 0,
    communication: 0,
    pricing: 0
  });
  const [review, setReview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  const submitRating = useMutation(api.ratings.submitRating);
  const canRateQuery = useQuery(api.ratings.canRateOrder, { vendorId, orderId });

  const handleStarClick = (rating: number, category?: keyof CategoryRatings) => {
    if (category) {
      setCategoryRatings(prev => ({
        ...prev,
        [category]: rating
      }));
    } else {
      setOverallRating(rating);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (overallRating === 0) {
      setError('Please provide an overall rating');
      return;
    }

    const unratedCategories = Object.entries(categoryRatings)
      .filter(([_, rating]) => rating === 0)
      .map(([category, _]) => category);

    if (unratedCategories.length > 0) {
      setError(`Please rate: ${unratedCategories.join(', ')}`);
      return;
    }

    setIsSubmitting(true);

    try {
      await submitRating({
        vendorId,
        supplierId,
        orderId,
        rating: overallRating,
        review: review.trim() || undefined,
        categories: categoryRatings
      });

      onRatingSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit rating');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (currentRating: number, onStarClick: (rating: number) => void, size: 'sm' | 'lg' = 'sm') => {
    const starSize = size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';
    
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onStarClick(star)}
            className={`${starSize} transition-colors duration-200 ${
              star <= currentRating
                ? 'text-yellow-400 hover:text-yellow-500'
                : 'text-gray-300 hover:text-yellow-300'
            }`}
          >
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
      </div>
    );
  };

  if (!canRateQuery) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!canRateQuery.canRate) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-800">
              {canRateQuery.reason}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Rate Your Experience
        </h2>
        <p className="text-gray-600">
          How was your experience with <span className="font-semibold">{supplierName}</span>?
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Overall Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Overall Rating
          </label>
          <div className="flex items-center space-x-4">
            {renderStars(overallRating, setOverallRating, 'lg')}
            <span className="text-lg font-medium text-gray-700">
              {overallRating > 0 ? `${overallRating}/5` : 'Select rating'}
            </span>
          </div>
        </div>

        {/* Category Ratings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Quality
            </label>
            <div className="flex items-center space-x-2">
              {renderStars(categoryRatings.quality, (rating) => handleStarClick(rating, 'quality'))}
              <span className="text-sm text-gray-600">
                {categoryRatings.quality > 0 ? `${categoryRatings.quality}/5` : ''}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Delivery Service
            </label>
            <div className="flex items-center space-x-2">
              {renderStars(categoryRatings.delivery, (rating) => handleStarClick(rating, 'delivery'))}
              <span className="text-sm text-gray-600">
                {categoryRatings.delivery > 0 ? `${categoryRatings.delivery}/5` : ''}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Communication
            </label>
            <div className="flex items-center space-x-2">
              {renderStars(categoryRatings.communication, (rating) => handleStarClick(rating, 'communication'))}
              <span className="text-sm text-gray-600">
                {categoryRatings.communication > 0 ? `${categoryRatings.communication}/5` : ''}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pricing
            </label>
            <div className="flex items-center space-x-2">
              {renderStars(categoryRatings.pricing, (rating) => handleStarClick(rating, 'pricing'))}
              <span className="text-sm text-gray-600">
                {categoryRatings.pricing > 0 ? `${categoryRatings.pricing}/5` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Review Text */}
        <div>
          <label htmlFor="review" className="block text-sm font-medium text-gray-700 mb-2">
            Write a Review (Optional)
          </label>
          <textarea
            id="review"
            rows={4}
            value={review}
            onChange={(e) => setReview(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Share your experience to help other vendors..."
            maxLength={500}
          />
          <p className="mt-1 text-sm text-gray-500">
            {review.length}/500 characters
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || overallRating === 0}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Rating'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RatingInterface;