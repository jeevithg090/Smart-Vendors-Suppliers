import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

interface OrderTrackingProps {
  orderId: Id<"orders">;
  vendorId: Id<"vendors">;
}

const statusSteps = [
  { key: 'pending', label: 'Order Placed', icon: '📝' },
  { key: 'confirmed', label: 'Confirmed', icon: '✅' },
  { key: 'processing', label: 'Processing', icon: '⚙️' },
  { key: 'shipped', label: 'Shipped', icon: '🚚' },
  { key: 'delivered', label: 'Delivered', icon: '📦' }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'text-yellow-600 bg-yellow-100';
    case 'confirmed': return 'text-blue-600 bg-blue-100';
    case 'processing': return 'text-purple-600 bg-purple-100';
    case 'shipped': return 'text-orange-600 bg-orange-100';
    case 'delivered': return 'text-green-600 bg-green-100';
    case 'cancelled': return 'text-red-600 bg-red-100';
    default: return 'text-gray-600 bg-gray-100';
  }
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount);
};

export const OrderTracking: React.FC<OrderTrackingProps> = ({ orderId, vendorId: _vendorId }) => {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const order = useQuery(api.orders.getOrderDetails, { orderId });
  const cancelOrder = useMutation(api.orders.cancelOrder);

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      alert('Please provide a reason for cancellation');
      return;
    }

    setIsCancelling(true);
    try {
      await cancelOrder({ orderId, reason: cancelReason });
      setShowCancelDialog(false);
      setCancelReason('');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to cancel order');
    } finally {
      setIsCancelling(false);
    }
  };

  if (!order) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const currentStatusIndex = statusSteps.findIndex(step => step.key === order.status);
  const canCancel = ['pending', 'confirmed'].includes(order.status);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Order Tracking</h2>
          <p className="text-gray-600">Order ID: {orderId}</p>
          <p className="text-sm text-gray-500">
            Placed on {formatDate(order.createdAt)}
          </p>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </div>
      </div>

      {/* Order Status Timeline */}
      {order.status !== 'cancelled' && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Order Progress</h3>
          <div className="flex items-center justify-between">
            {statusSteps.map((step, index) => {
              const isCompleted = index <= currentStatusIndex;
              const isCurrent = index === currentStatusIndex;
              
              return (
                <div key={step.key} className="flex flex-col items-center flex-1">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl mb-2 ${
                    isCompleted 
                      ? 'bg-green-500 text-white' 
                      : isCurrent 
                        ? 'bg-blue-500 text-white animate-pulse'
                        : 'bg-gray-200 text-gray-400'
                  }`}>
                    {step.icon}
                  </div>
                  <span className={`text-sm text-center ${
                    isCompleted ? 'text-green-600 font-medium' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </span>
                  {index < statusSteps.length - 1 && (
                    <div className={`h-1 w-full mt-2 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cancelled Status */}
      {order.status === 'cancelled' && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center mb-2">
            <span className="text-2xl mr-2">❌</span>
            <h3 className="text-lg font-semibold text-red-800">Order Cancelled</h3>
          </div>
          {order.notes && (
            <p className="text-red-700">Reason: {order.notes}</p>
          )}
        </div>
      )}

      {/* Supplier Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-lg mb-2">Supplier Details</h3>
          <p className="font-medium">{order.supplier?.businessName}</p>
          <p className="text-gray-600">{order.supplier?.ownerName}</p>
          <p className="text-gray-600">{order.supplier?.location.address}</p>
          <p className="text-blue-600">{order.supplier?.phone}</p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-lg mb-2">Delivery Information</h3>
          <p className="text-gray-600 mb-2">{order.deliveryAddress}</p>
          <div className="space-y-1 text-sm">
            <p>
              <span className="font-medium">Estimated Delivery:</span>{' '}
              {formatDate(order.estimatedDelivery)}
            </p>
            {order.actualDelivery && (
              <p>
                <span className="font-medium">Actual Delivery:</span>{' '}
                {formatDate(order.actualDelivery)}
              </p>
            )}
            <p>
              <span className="font-medium">Payment Method:</span>{' '}
              {order.paymentMethod.replace('_', ' ').toUpperCase()}
            </p>
            <p>
              <span className="font-medium">Payment Status:</span>{' '}
              <span className={`px-2 py-1 rounded text-xs ${
                order.paymentStatus === 'paid' 
                  ? 'bg-green-100 text-green-800'
                  : order.paymentStatus === 'failed'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
              }`}>
                {order.paymentStatus.toUpperCase()}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Order Items</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-4 py-2 text-left">Item</th>
                <th className="border border-gray-200 px-4 py-2 text-center">Quantity</th>
                <th className="border border-gray-200 px-4 py-2 text-right">Price/Unit</th>
                <th className="border border-gray-200 px-4 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => (
                <tr key={index}>
                  <td className="border border-gray-200 px-4 py-2">{item.itemName}</td>
                  <td className="border border-gray-200 px-4 py-2 text-center">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-right">
                    {formatCurrency(item.pricePerUnit)}
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-right font-medium">
                    {formatCurrency(item.totalPrice)}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-bold">
                <td colSpan={3} className="border border-gray-200 px-4 py-2 text-right">
                  Total Cost:
                </td>
                <td className="border border-gray-200 px-4 py-2 text-right text-green-600">
                  {formatCurrency(order.totalCost)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Notes</h3>
          <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{order.notes}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        {canCancel && (
          <button
            onClick={() => setShowCancelDialog(true)}
            className="px-6 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
          >
            Cancel Order
          </button>
        )}
        
        {order.status === 'delivered' && (
          <button
            onClick={() => {
              // Navigate to rating/feedback form
              window.location.href = `/rate-supplier?orderId=${orderId}&supplierId=${order.supplierId}`;
            }}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Rate Supplier
          </button>
        )}
      </div>

      {/* Cancel Order Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Cancel Order</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to cancel this order? This action cannot be undone.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for cancellation
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Please provide a reason for cancellation"
                required
              />
            </div>

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowCancelDialog(false);
                  setCancelReason('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Keep Order
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={isCancelling || !cancelReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};