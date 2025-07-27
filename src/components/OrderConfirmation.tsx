import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

interface OrderConfirmationProps {
  orderId: Id<"orders">;
  onClose: () => void;
  onTrackOrder: () => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount);
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

export const OrderConfirmation: React.FC<OrderConfirmationProps> = ({
  orderId,
  onClose,
  onTrackOrder
}) => {
  const order = useQuery(api.orders.getOrderDetails, { orderId });

  if (!order) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Success Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Placed Successfully!</h2>
          <p className="text-gray-600">Your order has been confirmed and sent to the supplier.</p>
        </div>

        {/* Order Details */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Order ID:</span>
              <p className="font-mono text-gray-900">{orderId.slice(-8)}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Order Date:</span>
              <p className="text-gray-900">{formatDate(order.createdAt)}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Estimated Delivery:</span>
              <p className="text-gray-900">{formatDate(order.estimatedDelivery)}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Payment Method:</span>
              <p className="text-gray-900 capitalize">{order.paymentMethod.replace('_', ' ')}</p>
            </div>
          </div>
        </div>

        {/* Supplier Information */}
        <div className="mb-6">
          <h3 className="font-semibold text-lg mb-3">Supplier Details</h3>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium text-gray-900">{order.supplier?.businessName}</h4>
                <p className="text-gray-600">{order.supplier?.ownerName}</p>
                <p className="text-gray-600">{order.supplier?.location.address}</p>
              </div>
              <div className="text-right">
                <p className="text-blue-600 font-medium">{order.supplier?.phone}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="mb-6">
          <h3 className="font-semibold text-lg mb-3">Order Items</h3>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Item</th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">Qty</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Price</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {order.items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2 text-sm text-gray-900">{item.itemName}</td>
                    <td className="px-4 py-2 text-sm text-gray-600 text-center">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600 text-right">
                      {formatCurrency(item.pricePerUnit)}
                    </td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                      {formatCurrency(item.totalPrice)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-bold">
                  <td colSpan={3} className="px-4 py-2 text-sm text-gray-900 text-right">
                    Total Amount:
                  </td>
                  <td className="px-4 py-2 text-sm text-green-600 text-right">
                    {formatCurrency(order.totalCost)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Delivery Address */}
        <div className="mb-6">
          <h3 className="font-semibold text-lg mb-3">Delivery Address</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-900">{order.deliveryAddress}</p>
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-3">Order Notes</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-900">{order.notes}</p>
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="mb-6">
          <h3 className="font-semibold text-lg mb-3">What's Next?</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
              The supplier will review and confirm your order
            </div>
            <div className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
              You'll receive updates on order status via notifications
            </div>
            <div className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
              Track your order progress in real-time
            </div>
            <div className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
              Rate the supplier after delivery completion
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onTrackOrder}
            className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 font-medium"
          >
            Track Order
          </button>
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-50 font-medium"
          >
            Continue Shopping
          </button>
        </div>

        {/* Contact Support */}
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            Need help? Contact our support team at{' '}
            <a href="tel:+911234567890" className="text-blue-600 hover:underline">
              +91 123 456 7890
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};