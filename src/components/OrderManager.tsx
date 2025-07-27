import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { OrderPlacement } from './OrderPlacement';
import OrderTracking from './OrderTracking';
import { OrderHistory } from './OrderHistory';
import { OrderConfirmation } from './OrderConfirmation';

type ViewMode = 'history' | 'place' | 'track' | 'confirmation';

interface OrderManagerProps {
  initialView?: ViewMode;
  supplierId?: Id<"suppliers">;
  orderId?: Id<"orders">;
}

export const OrderManager: React.FC<OrderManagerProps> = ({
  initialView = 'history',
  supplierId,
  orderId
}) => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<ViewMode>(initialView);
  const [selectedSupplierId, setSelectedSupplierId] = useState<Id<"suppliers"> | null>(supplierId || null);
  const [selectedOrderId, setSelectedOrderId] = useState<Id<"orders"> | null>(orderId || null);

  // Get vendor profile
  const vendor = useQuery(
    api.vendors.getByUserId,
    user ? { userId: user.id } : "skip"
  );

  if (!user) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
          <p className="text-gray-600">Please sign in to manage your orders.</p>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const handleOrderPlaced = (orderId: Id<"orders">) => {
    setSelectedOrderId(orderId);
    setCurrentView('confirmation');
  };

  const handleViewOrder = (orderId: Id<"orders">) => {
    setSelectedOrderId(orderId);
    setCurrentView('track');
  };

  // const _handlePlaceNewOrder = (_supplierId?: Id<"suppliers">) => {
  //   if (supplierId) {
  //     setSelectedSupplierId(supplierId);
  //   }
  //   setCurrentView('place');
  // };

  const handleBackToHistory = () => {
    setCurrentView('history');
    setSelectedOrderId(null);
    setSelectedSupplierId(null);
  };

  const handleTrackOrder = () => {
    if (selectedOrderId) {
      setCurrentView('track');
    }
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'place':
        if (!selectedSupplierId) {
          return (
            <div className="text-center p-8">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Supplier Selected</h3>
              <p className="text-gray-600 mb-4">Please select a supplier to place an order.</p>
              <button
                onClick={handleBackToHistory}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Back to Orders
              </button>
            </div>
          );
        }
        return (
          <OrderPlacement
            supplierId={selectedSupplierId}
            vendorId={vendor._id}
            onOrderPlaced={handleOrderPlaced}
            onCancel={handleBackToHistory}
          />
        );

      case 'track':
        if (!selectedOrderId) {
          return (
            <div className="text-center p-8">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Order Selected</h3>
              <p className="text-gray-600 mb-4">Please select an order to track.</p>
              <button
                onClick={handleBackToHistory}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Back to Orders
              </button>
            </div>
          );
        }
        return (
          <div>
            <div className="mb-4">
              <button
                onClick={handleBackToHistory}
                className="text-blue-600 hover:text-blue-800 flex items-center"
              >
                ← Back to Order History
              </button>
            </div>
            <OrderTracking
              orderId={selectedOrderId}
              vendorId={vendor._id}
            />
          </div>
        );

      case 'confirmation':
        if (!selectedOrderId) {
          handleBackToHistory();
          return null;
        }
        return (
          <OrderConfirmation
            orderId={selectedOrderId}
            onClose={handleBackToHistory}
            onTrackOrder={handleTrackOrder}
          />
        );

      case 'history':
      default:
        return (
          <div>
            <div className="mb-6 flex justify-between items-center">
              <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
              <button
                onClick={() => setCurrentView('place')}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 font-medium"
              >
                Place New Order
              </button>
            </div>
            <OrderHistory
              vendorId={vendor._id}
              onViewOrder={handleViewOrder}
            />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {renderCurrentView()}
      </div>
    </div>
  );
};
