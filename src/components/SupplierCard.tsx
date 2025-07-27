import { useMemo } from 'react';
import TrustScoreDisplay from './TrustScoreDisplay';

interface SupplierCardProps {
  supplier: {
    _id: string;
    businessName: string;
    ownerName: string;
    location: {
      address: string;
      city: string;
      state: string;
      pincode: string;
      coordinates: {
        lat: number;
        lng: number;
      };
    };
    categories: string[];
    fssaiCertified: boolean;
    fssaiLicense?: string;
    isVerified: boolean;
    trustScore: number;
    businessHours: {
      open: string;
      close: string;
      days: string[];
    };
    deliveryRadius: number;
    minimumOrder: number;
    distance?: number;
  };
  onClick: () => void;
  showDistance?: boolean;
}

export default function SupplierCard({ supplier, onClick, showDistance = false }: SupplierCardProps) {
  const isCurrentlyOpen = useMemo(() => {
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    
    if (!supplier.businessHours.days.includes(currentDay)) {
      return false;
    }
    
    return currentTime >= supplier.businessHours.open && currentTime <= supplier.businessHours.close;
  }, [supplier.businessHours]);



  const formatDistance = (distance: number) => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-all duration-200 cursor-pointer hover:border-orange-200 p-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800 mb-1 line-clamp-1">
            {supplier.businessName}
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            by {supplier.ownerName}
          </p>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-gray-500">
              📍 {supplier.location.city}, {supplier.location.state}
            </span>
            {showDistance && supplier.distance && (
              <span className="text-sm text-blue-600 font-medium">
                • {formatDistance(supplier.distance)} away
              </span>
            )}
          </div>
        </div>
        
        {/* Trust Score Badge */}
        <TrustScoreDisplay 
          supplierId={supplier._id as any}
          size="sm"
          className="flex-shrink-0"
        />
      </div>

      {/* Categories */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-1">
          {supplier.categories.slice(0, 3).map((category, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-orange-50 text-orange-700 text-xs rounded-full"
            >
              {category}
            </span>
          ))}
          {supplier.categories.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
              +{supplier.categories.length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* Business Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Delivery Radius:</span>
          <span className="font-medium">{supplier.deliveryRadius}km</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Min Order:</span>
          <span className="font-medium">₹{supplier.minimumOrder}</span>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          {/* Business Hours Status */}
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${isCurrentlyOpen ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className={`text-xs font-medium ${isCurrentlyOpen ? 'text-green-600' : 'text-red-600'}`}>
              {isCurrentlyOpen ? 'Open' : 'Closed'}
            </span>
          </div>

          {/* Verification Badges */}
          {supplier.isVerified && (
            <div className="flex items-center gap-1">
              <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-xs text-blue-600 font-medium">Verified</span>
            </div>
          )}

          {supplier.fssaiCertified && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-green-600 font-medium">FSSAI</span>
            </div>
          )}
        </div>

        {/* View Details Button */}
        <button className="text-orange-500 hover:text-orange-600 text-sm font-medium flex items-center">
          View Details
          <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Business Hours Tooltip */}
      <div className="mt-2 text-xs text-gray-500">
        {supplier.businessHours.open} - {supplier.businessHours.close} • {supplier.businessHours.days.join(', ')}
      </div>
    </div>
  );
}