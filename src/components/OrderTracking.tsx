import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

interface OrderTrackingProps {
  orderId: Id<'orders'>;
  userRole: 'vendor' | 'supplier';
  onClose?: () => void;
}

interface TrackingFormData {
  trackingNumber: string;
  carrier: string;
  estimatedDelivery: string;
  isThirdParty: boolean;
  thirdPartyProvider: string;
  notes: string;
}

export default function OrderTracking({ orderId, userRole, onClose }: OrderTrackingProps) {
  const [showAddTracking, setShowAddTracking] = useState(false);
  const [showUpdateStatus, setShowUpdateStatus] = useState<string | null>(null);
  const [trackingForm, setTrackingForm] = useState<TrackingFormData>({
    trackingNumber: '',
    carrier: '',
    estimatedDelivery: '',
    isThirdParty: false,
    thirdPartyProvider: '',
    notes: ''
  });
  const [statusUpdate, setStatusUpdate] = useState({
    status: '',
    location: '',
    notes: ''
  });

  // Queries
  const orderTracking = useQuery(api.orderTracking.getOrderTracking, { orderId });

  // Mutations
  const addTrackingInfo = useMutation(api.orderTracking.addTrackingInfo);
  const updateTrackingStatus = useMutation(api.orderTracking.updateTrackingStatus);

  const handleAddTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await addTrackingInfo({
        orderId,
        trackingData: {
          trackingNumber: trackingForm.trackingNumber,
          carrier: trackingForm.carrier,
          estimatedDelivery: trackingForm.estimatedDelivery ? new Date(trackingForm.estimatedDelivery).getTime() : undefined,
          isThirdParty: trackingForm.isThirdParty,
          thirdPartyProvider: trackingForm.isThirdParty ? trackingForm.thirdPartyProvider : undefined,
          notes: trackingForm.notes || undefined
        }
      });

      // Reset form
      setTrackingForm({
        trackingNumber: '',
        carrier: '',
        estimatedDelivery: '',
        isThirdParty: false,
        thirdPartyProvider: '',
        notes: ''
      });
      setShowAddTracking(false);
    } catch (error) {
      console.error('Error adding tracking info:', error);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!showUpdateStatus) return;

    try {
      await updateTrackingStatus({
        orderId,
        trackingNumber: showUpdateStatus,
        status: statusUpdate.status,
        location: statusUpdate.location || undefined,
        notes: statusUpdate.notes || undefined
      });

      setStatusUpdate({ status: '', location: '', notes: '' });
      setShowUpdateStatus(null);
    } catch (error) {
      console.error('Error updating tracking status:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'confirmed': 'bg-blue-100 text-blue-800',
      'processing': 'bg-purple-100 text-purple-800',
      'shipped': 'bg-orange-100 text-orange-800',
      'in_transit': 'bg-indigo-100 text-indigo-800',
      'out_for_delivery': 'bg-green-100 text-green-800',
      'delivered': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800',
      'exception': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (!orderTracking) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const { order, trackingInfo, timeline } = orderTracking;

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Order Tracking</h2>
            <p className="text-sm text-gray-600">Order #{order._id.slice(-8)}</p>
          </div>
          <div className="flex items-center space-x-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-800 text-xl"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Order Details */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-3">Order Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <span className="font-medium">₹{order.totalCost}</span>
              </div>
              <div className="flex justify-between">
                <span>Items:</span>
                <span className="font-medium">{order.items.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Order Type:</span>
                <span className="font-medium capitalize">{order.orderType}</span>
              </div>
              <div className="flex justify-between">
                <span>Placed:</span>
                <span className="font-medium">{formatDate(order.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-3">
              {userRole === 'vendor' ? 'Supplier' : 'Vendor'} Details
            </h3>
            <div className="space-y-2 text-sm">
              {userRole === 'vendor' && order.supplier && (
                <>
                  <div className="flex justify-between">
                    <span>Business:</span>
                    <span className="font-medium">{order.supplier.businessName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Phone:</span>
                    <span className="font-medium">{order.supplier.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Location:</span>
                    <span className="font-medium">{order.supplier.location.city}</span>
                  </div>
                </>
              )}
              {userRole === 'supplier' && order.vendor && (
                <>
                  <div className="flex justify-between">
                    <span>Business:</span>
                    <span className="font-medium">{order.vendor.businessName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Phone:</span>
                    <span className="font-medium">{order.vendor.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Location:</span>
                    <span className="font-medium">{order.vendor.location.city}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tracking Information */}
        {trackingInfo.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Tracking Information</h3>
            <div className="space-y-4">
              {trackingInfo.map((tracking, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
                          Tracking: {tracking.trackingNumber}
                        </span>
                        {tracking.isThirdParty && (
                          <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs">
                            Third Party
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Carrier: {tracking.carrier}
                        {tracking.thirdPartyProvider && ` via ${tracking.thirdPartyProvider}`}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tracking.status)}`}>
                        {tracking.status.replace('_', ' ').charAt(0).toUpperCase() + tracking.status.replace('_', ' ').slice(1)}
                      </span>
                      {userRole === 'supplier' && tracking.status !== 'delivered' && (
                        <button
                          onClick={() => setShowUpdateStatus(tracking.trackingNumber)}
                          className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
                        >
                          Update Status
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {tracking.estimatedDelivery && (
                    <div className="text-sm text-gray-600 mb-2">
                      Estimated Delivery: {formatDate(tracking.estimatedDelivery)}
                    </div>
                  )}

                  {tracking.trackingHistory && tracking.trackingHistory.length > 0 && (
                    <div className="mt-3 border-t pt-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Tracking History</h4>
                      <div className="space-y-2">
                        {tracking.trackingHistory.map((event, eventIndex) => (
                          <div key={eventIndex} className="flex justify-between items-center text-sm">
                            <div>
                              <span className="font-medium">
                                {event.status.replace('_', ' ').charAt(0).toUpperCase() + event.status.replace('_', ' ').slice(1)}
                              </span>
                              {event.location && <span className="text-gray-600 ml-2">in {event.location}</span>}
                              {event.notes && <div className="text-gray-500 text-xs mt-1">{event.notes}</div>}
                            </div>
                            <span className="text-gray-500 text-xs">
                              {formatDate(event.timestamp)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Order Timeline */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Order Timeline</h3>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
            <div className="space-y-4">
              {timeline.map((event, index) => (
                <div key={index} className="relative flex items-start">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium z-10 ${getStatusColor(event.status).replace('text-', 'bg-').replace('100', '500')}`}>
                    {index + 1}
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium text-gray-900">{event.title}</h4>
                      <span className="text-sm text-gray-500">{formatDate(event.timestamp)}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons for Suppliers */}
        {userRole === 'supplier' && order.status !== 'delivered' && order.status !== 'cancelled' && (
          <div className="border-t pt-6">
            <div className="flex space-x-4">
              {!trackingInfo.length && order.status === 'confirmed' && (
                <button
                  onClick={() => setShowAddTracking(true)}
                  className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Add Tracking Information
                </button>
              )}
              {trackingInfo.length > 0 && (
                <button
                  onClick={() => setShowAddTracking(true)}
                  className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors"
                >
                  Add Additional Tracking
                </button>
              )}
            </div>
          </div>
        )}

        {/* Add Tracking Modal */}
        {showAddTracking && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Add Tracking Information</h3>
                  <button
                    onClick={() => setShowAddTracking(false)}
                    className="text-gray-500 hover:text-gray-800"
                  >
                    ✕
                  </button>
                </div>
                
                <form onSubmit={handleAddTracking} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tracking Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={trackingForm.trackingNumber}
                      onChange={(e) => setTrackingForm({...trackingForm, trackingNumber: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter tracking number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Carrier *
                    </label>
                    <select
                      required
                      value={trackingForm.carrier}
                      onChange={(e) => setTrackingForm({...trackingForm, carrier: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Carrier</option>
                      <option value="Blue Dart">Blue Dart</option>
                      <option value="DTDC">DTDC</option>
                      <option value="FedEx">FedEx</option>
                      <option value="Ecom Express">Ecom Express</option>
                      <option value="India Post">India Post</option>
                      <option value="Delhivery">Delhivery</option>
                      <option value="Self Delivery">Self Delivery</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="thirdParty"
                      checked={trackingForm.isThirdParty}
                      onChange={(e) => setTrackingForm({...trackingForm, isThirdParty: e.target.checked})}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="thirdParty" className="text-sm text-gray-700">
                      Third-party logistics provider
                    </label>
                  </div>

                  {trackingForm.isThirdParty && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Third-party Provider *
                      </label>
                      <input
                        type="text"
                        required={trackingForm.isThirdParty}
                        value={trackingForm.thirdPartyProvider}
                        onChange={(e) => setTrackingForm({...trackingForm, thirdPartyProvider: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter provider name"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estimated Delivery
                    </label>
                    <input
                      type="datetime-local"
                      value={trackingForm.estimatedDelivery}
                      onChange={(e) => setTrackingForm({...trackingForm, estimatedDelivery: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={trackingForm.notes}
                      onChange={(e) => setTrackingForm({...trackingForm, notes: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      placeholder="Additional notes..."
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowAddTracking(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                    >
                      Add Tracking
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Update Status Modal */}
        {showUpdateStatus && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Update Tracking Status</h3>
                  <button
                    onClick={() => setShowUpdateStatus(null)}
                    className="text-gray-500 hover:text-gray-800"
                  >
                    ✕
                  </button>
                </div>
                
                <form onSubmit={handleUpdateStatus} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status *
                    </label>
                    <select
                      required
                      value={statusUpdate.status}
                      onChange={(e) => setStatusUpdate({...statusUpdate, status: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Status</option>
                      <option value="shipped">Shipped</option>
                      <option value="in_transit">In Transit</option>
                      <option value="out_for_delivery">Out for Delivery</option>
                      <option value="delivered">Delivered</option>
                      <option value="exception">Delivery Exception</option>
                      <option value="pickup">Available for Pickup</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={statusUpdate.location}
                      onChange={(e) => setStatusUpdate({...statusUpdate, location: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Current location"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={statusUpdate.notes}
                      onChange={(e) => setStatusUpdate({...statusUpdate, notes: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      placeholder="Additional information..."
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowUpdateStatus(null)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                    >
                      Update Status
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
