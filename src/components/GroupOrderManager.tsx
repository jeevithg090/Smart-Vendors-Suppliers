import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import GroupOrderList from './GroupOrderList';
import GroupOrderCreation from './GroupOrderCreation';
import GroupOrderParticipation from './GroupOrderParticipation';

interface GroupOrderManagerProps {
  vendorId: Id<"vendors">;
  vendorLocation: string;
}

type ViewMode = 'list' | 'create' | 'participate' | 'myOrders';

const GroupOrderManager: React.FC<GroupOrderManagerProps> = ({
  vendorId,
  vendorLocation,
}) => {
  const [currentView, setCurrentView] = useState<ViewMode>('list');
  const [selectedGroupOrderId, setSelectedGroupOrderId] = useState<Id<"groupOrders"> | null>(null);
  const [pendingJoinQuantity, setPendingJoinQuantity] = useState<number>(1);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Get vendor's group orders
  const vendorGroupOrders = useQuery(api.groupOrders.getGroupOrdersByVendor, {
    vendorId,
  });

  const handleJoinOrder = (_groupOrderId: Id<"groupOrders">, _quantity: number) => {
    setSelectedGroupOrderId(_groupOrderId);
    setPendingJoinQuantity(_quantity > 0 ? _quantity : 1);
    setCurrentView('participate');
  };

  const handleOrderCreated = (_groupOrderId: Id<"groupOrders">) => {
    setSuccessMessage('Group order created successfully!');
    setCurrentView('list');
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const handleParticipationSuccess = () => {
    setSuccessMessage('Successfully joined the group order!');
    setCurrentView('list');
    setSelectedGroupOrderId(null);
    setPendingJoinQuantity(1);
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const handleCancel = () => {
    setCurrentView('list');
    setSelectedGroupOrderId(null);
    setPendingJoinQuantity(1);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'create':
        return (
          <GroupOrderCreation
            vendorId={vendorId}
            vendorLocation={vendorLocation}
            onOrderCreated={handleOrderCreated}
            onCancel={handleCancel}
          />
        );
      
      case 'participate':
        return selectedGroupOrderId ? (
          <GroupOrderParticipation
            groupOrderId={selectedGroupOrderId}
            vendorId={vendorId}
            vendorLocation={vendorLocation}
            initialQuantity={pendingJoinQuantity}
            onSuccess={handleParticipationSuccess}
            onCancel={handleCancel}
          />
        ) : null;
      
      case 'myOrders':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">My Group Orders</h2>
              <button
                onClick={() => setCurrentView('list')}
                className="px-4 py-2 text-blue-600 hover:text-blue-800 transition-colors"
              >
                ← Back to All Orders
              </button>
            </div>
            
            {vendorGroupOrders && vendorGroupOrders.length > 0 ? (
              <div className="grid gap-6">
                {vendorGroupOrders.map((order) => (
                  <div
                    key={order._id}
                    className="bg-white rounded-lg shadow-md border border-gray-200 p-6"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-1">
                          {order.itemName}
                        </h3>
                        <p className="text-gray-600">
                          Supplier: {order.supplierName}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                          order.status === 'open' 
                            ? 'bg-green-100 text-green-800'
                            : order.status === 'locked'
                            ? 'bg-orange-100 text-orange-800'
                            : order.status === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </div>
                        {order.isInitiator && (
                          <p className="text-sm text-blue-600 mt-1">You initiated this order</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Progress</p>
                        <p className="text-lg font-semibold">
                          {order.currentQuantity} / {order.targetQuantity} kg
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Price per kg</p>
                        <p className="text-lg font-semibold text-green-600">₹{order.pricePerUnit}</p>
                      </div>
                    </div>

                    {order.vendorParticipation && (
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                          Your participation: {order.vendorParticipation.quantity} kg 
                          (₹{(order.vendorParticipation.quantity * order.pricePerUnit).toFixed(2)})
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-500 text-lg mb-2">No group orders found</div>
                <p className="text-gray-400">You haven't initiated or participated in any group orders yet.</p>
              </div>
            )}
          </div>
        );
      
      default:
        return (
          <GroupOrderList
            vendorLocation={vendorLocation}
            onJoinOrder={handleJoinOrder}
            currentVendorId={vendorId}
          />
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-green-800">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Navigation Header */}
      {currentView === 'list' && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Group Orders</h1>
            <div className="flex space-x-4">
              <button
                onClick={() => setCurrentView('myOrders')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                My Orders ({vendorGroupOrders?.length || 0})
              </button>
              <button
                onClick={() => setCurrentView('create')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Group Order
              </button>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-medium text-blue-900 mb-1">How Group Orders Work</h3>
                <p className="text-blue-800 text-sm">
                  Join with other vendors to reach bulk quantities and get better prices. 
                  Orders automatically lock when the target quantity is reached, and individual orders are created for each participant.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {renderCurrentView()}
    </div>
  );
};

export default GroupOrderManager;
