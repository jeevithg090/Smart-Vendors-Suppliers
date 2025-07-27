import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

interface SimpleOrderTrackingProps {
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

export default function SimpleOrderTracking({ orderId, userRole, onClose }: SimpleOrderTrackingProps) {
  const [showAddTracking, setShowAddTracking] = useState(false);
  const [trackingForm, setTrackingForm] = useState<TrackingFormData>({
    trackingNumber: '',
    carrier: '',
    estimatedDelivery: '',
    isThirdParty: false,
    thirdPartyProvider: '',
    notes: ''
  });

  // Queries
  const orderDetails = useQuery(api.orders.getOrderDetails, { orderId });

  // Mutations
  const updateOrderStatus = useMutation(api.orders.updateOrderStatus);

  const handleAddTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // For now, just mark as shipped with notes containing tracking info
      const trackingNotes = `Tracking: ${trackingForm.trackingNumber} | Carrier: ${trackingForm.carrier}${
        trackingForm.isThirdParty ? ` | Third-party: ${trackingForm.thirdPartyProvider}` : ''
      }${trackingForm.notes ? ` | Notes: ${trackingForm.notes}` : ''}`;

      await updateOrderStatus({
        orderId,
        status: 'shipped',
        notes: trackingNotes
      });

      // Reset form and close modal
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

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      await updateOrderStatus({
        orderId,
        status: newStatus
      });
    } catch (error) {
      console.error('Error updating status:', error);
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
      'delivered': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (!orderDetails) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const timeline = [
    {
      status: 'pending',
      timestamp: orderDetails.createdAt,
      title: 'Order Placed',
      description: 'Order has been placed and is awaiting confirmation',
      completed: true
    },
    {
      status: 'confirmed',
      timestamp: orderDetails.updatedAt,
      title: 'Order Confirmed',
      description: 'Supplier has confirmed the order',
      completed: ['confirmed', 'processing', 'shipped', 'delivered'].includes(orderDetails.status)
    },
    {
      status: 'processing',
      timestamp: orderDetails.updatedAt,
      title: 'Order Processing',
      description: 'Order is being prepared',
      completed: ['processing', 'shipped', 'delivered'].includes(orderDetails.status)
    },
    {
      status: 'shipped',
      timestamp: orderDetails.updatedAt,
      title: 'Order Shipped',
      description: orderDetails.notes && orderDetails.notes.includes('Tracking:') 
        ? orderDetails.notes 
        : 'Order has been shipped',
      completed: ['shipped', 'delivered'].includes(orderDetails.status)
    },
    {
      status: 'delivered',
      timestamp: orderDetails.actualDelivery || orderDetails.updatedAt,
      title: 'Order Delivered',
      description: 'Order has been successfully delivered',
      completed: orderDetails.status === 'delivered'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Order Tracking</h2>
            <p className="text-sm text-gray-600">Order #{orderDetails._id.slice(-8)}</p>
          </div>
          <div className="flex items-center space-x-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(orderDetails.status)}`}>
              {orderDetails.status.charAt(0).toUpperCase() + orderDetails.status.slice(1)}
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
                <span className="font-medium">₹{orderDetails.totalCost}</span>
              </div>
              <div className="flex justify-between">
                <span>Items:</span>
                <span className="font-medium">{orderDetails.items.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Order Type:</span>
                <span className="font-medium capitalize">{orderDetails.orderType}</span>
              </div>
              <div className="flex justify-between">
                <span>Placed:</span>
                <span className="font-medium">{formatDate(orderDetails.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-3">
              {userRole === 'vendor' ? 'Supplier' : 'Vendor'} Details
            </h3>
            <div className="space-y-2 text-sm">
              {userRole === 'vendor' && orderDetails.supplier && (
                <>
                  <div className="flex justify-between">
                    <span>Business:</span>
                    <span className="font-medium">{orderDetails.supplier.businessName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Phone:</span>
                    <span className="font-medium">{orderDetails.supplier.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Location:</span>
                    <span className="font-medium">{orderDetails.supplier.location.city}</span>
                  </div>
                </>
              )}
              {userRole === 'supplier' && orderDetails.vendor && (
                <>
                  <div className="flex justify-between">
                    <span>Business:</span>
                    <span className="font-medium">{orderDetails.vendor.businessName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Phone:</span>
                    <span className="font-medium">{orderDetails.vendor.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Location:</span>
                    <span className="font-medium">{orderDetails.vendor.location.city}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Order Items</h3>
          <div className="space-y-3">
            {orderDetails.items.map((item, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium text-gray-900">{item.itemName}</span>
                  <div className="text-sm text-gray-600">
                    {item.quantity} {item.unit} × ₹{item.pricePerUnit}
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-medium text-gray-900">₹{item.totalPrice}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Timeline */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Order Progress</h3>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
            <div className="space-y-4">
              {timeline.map((event, index) => (
                <div key={index} className="relative flex items-start">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium z-10 ${
                    event.completed ? 'bg-green-500' : 'bg-gray-300'
                  }`}>
                    {event.completed ? '✓' : index + 1}
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex justify-between items-center">
                      <h4 className={`font-medium ${event.completed ? 'text-gray-900' : 'text-gray-500'}`}>
                        {event.title}
                      </h4>
                      <span className="text-sm text-gray-500">
                        {event.completed ? formatDate(event.timestamp) : 'Pending'}
                      </span>
                    </div>
                    <p className={`text-sm mt-1 ${event.completed ? 'text-gray-600' : 'text-gray-400'}`}>
                      {event.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons for Suppliers */}
        {userRole === 'supplier' && orderDetails.status !== 'delivered' && orderDetails.status !== 'cancelled' && (
          <div className="border-t pt-6">
            <div className="flex space-x-4 mb-4">
              {orderDetails.status === 'confirmed' && (
                <>
                  <button
                    onClick={() => handleStatusUpdate('processing')}
                    className="bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    Mark as Processing
                  </button>
                  <button
                    onClick={() => setShowAddTracking(true)}
                    className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Add Tracking & Ship
                  </button>
                </>
              )}
              {orderDetails.status === 'processing' && (
                <>
                  <button
                    onClick={() => setShowAddTracking(true)}
                    className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Add Tracking & Ship
                  </button>
                  <button
                    onClick={() => handleStatusUpdate('shipped')}
                    className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    Mark as Shipped
                  </button>
                </>
              )}
              {orderDetails.status === 'shipped' && (
                <button
                  onClick={() => handleStatusUpdate('delivered')}
                  className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors"
                >
                  Mark as Delivered
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
                      Add Tracking & Ship
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
