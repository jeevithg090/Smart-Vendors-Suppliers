import { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import TrustScoreDisplay from './TrustScoreDisplay';
import ReviewDisplay from './ReviewDisplay';
import FSSAIVerification from './FSSAIVerification';

interface SupplierDetailsProps {
  supplierId: string;
  onBack: () => void;
  vendorLocation?: {
    lat: number;
    lng: number;
    city: string;
  };
}

export default function SupplierDetails({ supplierId, onBack, vendorLocation }: SupplierDetailsProps) {
  const [activeTab, setActiveTab] = useState<'inventory' | 'reviews' | 'info'>('inventory');
  
  const supplierDetails = useQuery(api.suppliers.getSupplierDetails, {
    supplierId: supplierId as any
  });

  const isCurrentlyOpen = useMemo(() => {
    if (!supplierDetails) return false;
    
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    
    if (!supplierDetails.businessHours.days.includes(currentDay)) {
      return false;
    }
    
    return currentTime >= supplierDetails.businessHours.open && currentTime <= supplierDetails.businessHours.close;
  }, [supplierDetails]);

  const formatDistance = (distance: number) => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const distance = useMemo(() => {
    if (!vendorLocation || !supplierDetails) return null;
    return calculateDistance(
      vendorLocation.lat,
      vendorLocation.lng,
      supplierDetails.location.coordinates.lat,
      supplierDetails.location.coordinates.lng
    );
  }, [vendorLocation, supplierDetails]);



  if (!supplierDetails) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading supplier details...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Back Button */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-orange-500 hover:text-orange-600 font-medium transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Search
        </button>
      </div>

      {/* Supplier Header */}
      <div className="bg-white rounded-lg shadow-sm border p-8 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                  {supplierDetails.businessName}
                </h1>
                <p className="text-lg text-gray-600 mb-2">
                  Owned by {supplierDetails.ownerName}
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <span className="flex items-center">
                    📍 {supplierDetails.location.address}, {supplierDetails.location.city}
                  </span>
                  {distance && (
                    <span className="text-blue-600 font-medium">
                      • {formatDistance(distance)} away
                    </span>
                  )}
                </div>
              </div>
              
              {/* Trust Score */}
              <TrustScoreDisplay 
                supplierId={supplierId as any}
                showBreakdown={true}
                size="lg"
                className="flex-shrink-0"
              />
            </div>

            {/* Categories */}
            <div className="flex flex-wrap gap-2 mb-4">
              {supplierDetails.categories.map((category, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-orange-50 text-orange-700 text-sm rounded-full font-medium"
                >
                  {category}
                </span>
              ))}
            </div>

            {/* Status Indicators */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isCurrentlyOpen ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className={`font-medium ${isCurrentlyOpen ? 'text-green-600' : 'text-red-600'}`}>
                  {isCurrentlyOpen ? 'Open Now' : 'Closed'}
                </span>
                <span className="text-gray-500 text-sm">
                  ({supplierDetails.businessHours.open} - {supplierDetails.businessHours.close})
                </span>
              </div>

              {supplierDetails.isVerified && (
                <div className="flex items-center gap-1 text-blue-600">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Verified Supplier</span>
                </div>
              )}

              {supplierDetails.fssaiCertified && (
                <div className="flex items-center gap-1 text-green-600">
                  <span className="font-medium">FSSAI Certified</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 lg:w-48">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-xl font-bold text-gray-800">{supplierDetails.deliveryRadius}km</div>
              <div className="text-sm text-gray-600">Delivery Radius</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-xl font-bold text-gray-800">₹{supplierDetails.minimumOrder}</div>
              <div className="text-sm text-gray-600">Min Order</div>
            </div>
          </div>
        </div>

        {/* Contact Actions */}
        <div className="flex gap-4 mt-6 pt-6 border-t border-gray-200">
          <button className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5-6m0 0h15M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6" />
            </svg>
            Place Order
          </button>
          <button className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Message
          </button>
          <button className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Call
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'inventory'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Inventory ({supplierDetails.inventory.length})
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'reviews'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Reviews ({supplierDetails.totalRatings})
            </button>
            <button
              onClick={() => setActiveTab('info')}
              className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'info'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Business Info
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Inventory Tab */}
          {activeTab === 'inventory' && (
            <div>
              {supplierDetails.inventory.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {supplierDetails.inventory.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-orange-200 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-800">{item.itemName}</h4>
                        <span className="text-sm text-gray-500">{item.category}</span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Price:</span>
                          <span className="font-medium">₹{item.pricePerUnit}/{item.unit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Stock:</span>
                          <span className={`font-medium ${item.currentStock > 10 ? 'text-green-600' : 'text-orange-600'}`}>
                            {item.currentStock} {item.unit}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Min Order:</span>
                          <span className="font-medium">{item.minimumOrder} {item.unit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Quality:</span>
                          <span className="font-medium">{item.quality}</span>
                        </div>
                      </div>
                      <button className="w-full mt-3 bg-orange-50 text-orange-600 py-2 rounded-md hover:bg-orange-100 transition-colors font-medium">
                        Add to Order
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📦</div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">No inventory available</h3>
                  <p className="text-gray-600">This supplier hasn't added any items to their inventory yet.</p>
                </div>
              )}
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <ReviewDisplay 
              supplierId={supplierId as any}
              limit={20}
              showFilters={true}
            />
          )}

          {/* Business Info Tab */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Contact Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <span className="text-gray-600 w-20">Email:</span>
                      <span className="font-medium">{supplierDetails.email}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-gray-600 w-20">Phone:</span>
                      <span className="font-medium">{supplierDetails.phone}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start">
                      <span className="text-gray-600 w-20">Address:</span>
                      <span className="font-medium">
                        {supplierDetails.location.address}<br />
                        {supplierDetails.location.city}, {supplierDetails.location.state} - {supplierDetails.location.pincode}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Business Hours</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {supplierDetails.businessHours.open} - {supplierDetails.businessHours.close}
                    </span>
                    <span className="text-gray-600">
                      {supplierDetails.businessHours.days.join(', ')}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Certifications</h3>
                <div className="space-y-2">
                  {supplierDetails.fssaiCertified ? (
                    <div className="flex items-center text-green-600">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium">FSSAI Certified</span>
                      {supplierDetails.fssaiLicense && (
                        <span className="ml-2 text-gray-600">({supplierDetails.fssaiLicense})</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center text-gray-500">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span>FSSAI Certification Pending</span>
                    </div>
                  )}
                </div>
              </div>

              {/* FSSAI Verification Component */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">FSSAI Certificate Verification</h3>
                <FSSAIVerification 
                  supplierId={supplierId as any}
                  onVerificationComplete={(status) => {
                    // Refresh the page or update the supplier details
                    window.location.reload();
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}