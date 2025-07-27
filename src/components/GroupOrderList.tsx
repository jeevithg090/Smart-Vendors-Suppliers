import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

interface GroupOrderListProps {
  vendorLocation: string;
  onJoinOrder: (groupOrderId: Id<"groupOrders">, quantity: number) => void;
  currentVendorId: Id<"vendors">;
}

interface GroupOrder {
  _id: Id<"groupOrders">;
  initiatorId: Id<"vendors">;
  itemName: string;
  category: string;
  targetQuantity: number;
  currentQuantity: number;
  pricePerUnit: number;
  participants: Array<{
    vendorId: Id<"vendors">;
    quantity: number;
    joinedAt: number;
  }>;
  supplierId: Id<"suppliers">;
  status: string;
  location: string;
  expiresAt: number;
  createdAt: number;
  initiatorName: string;
  supplierName: string;
  participantsWithDetails: Array<{
    vendorId: Id<"vendors">;
    quantity: number;
    joinedAt: number;
    vendorName: string;
  }>;
}

const GroupOrderList: React.FC<GroupOrderListProps> = ({
  vendorLocation,
  onJoinOrder,
  currentVendorId,
}) => {
  const [selectedQuantity, setSelectedQuantity] = useState<{ [key: string]: number }>({});
  const [filter, setFilter] = useState<'all' | 'open' | 'locked'>('open');

  const groupOrders = useQuery(api.groupOrders.getGroupOrdersByLocation, {
    location: vendorLocation,
    status: filter === 'all' ? undefined : filter,
  }) as GroupOrder[] | undefined;

  const handleQuantityChange = (orderId: string, quantity: number) => {
    setSelectedQuantity(prev => ({
      ...prev,
      [orderId]: quantity,
    }));
  };

  const handleJoinOrder = (groupOrderId: Id<"groupOrders">) => {
    const quantity = selectedQuantity[groupOrderId] || 1;
    onJoinOrder(groupOrderId, quantity);
  };

  const formatTimeRemaining = (expiresAt: number) => {
    const now = Date.now();
    const remaining = expiresAt - now;
    
    if (remaining <= 0) return 'Expired';
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const isVendorParticipating = (participants: GroupOrder['participants']) => {
    return participants.some(p => p.vendorId === currentVendorId);
  };

  if (!groupOrders) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="flex space-x-4 border-b border-gray-200 pb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Orders
        </button>
        <button
          onClick={() => setFilter('open')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'open'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Open
        </button>
        <button
          onClick={() => setFilter('locked')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'locked'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Locked
        </button>
      </div>

      {/* Group Orders List */}
      {groupOrders.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-2">No group orders found</div>
          <p className="text-gray-400">
            {filter === 'open' 
              ? 'No open group orders in your area right now'
              : `No ${filter} group orders in your area`
            }
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {groupOrders.map((order) => {
            const isParticipating = isVendorParticipating(order.participants);
            const isInitiator = order.initiatorId === currentVendorId;
            const progressPercentage = getProgressPercentage(order.currentQuantity, order.targetQuantity);
            const remainingQuantity = order.targetQuantity - order.currentQuantity;
            const maxJoinQuantity = Math.min(remainingQuantity, 50); // Reasonable max
            
            return (
              <div
                key={order._id}
                className="bg-white rounded-lg shadow-md border border-gray-200 p-6"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">
                      {order.itemName}
                    </h3>
                    <p className="text-gray-600">
                      Category: {order.category} • Supplier: {order.supplierName}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                      order.status === 'open' 
                        ? 'bg-green-100 text-green-800'
                        : order.status === 'locked'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatTimeRemaining(order.expiresAt)}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Progress: {order.currentQuantity} / {order.targetQuantity} kg</span>
                    <span>{progressPercentage.toFixed(0)}% complete</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Price and Details */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Price per kg</p>
                    <p className="text-lg font-semibold text-green-600">₹{order.pricePerUnit}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Participants</p>
                    <p className="text-lg font-semibold">{order.participants.length}</p>
                  </div>
                </div>

                {/* Participants List */}
                {order.participantsWithDetails.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Participants:</p>
                    <div className="flex flex-wrap gap-2">
                      {order.participantsWithDetails.map((participant, index) => (
                        <span
                          key={index}
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                            participant.vendorId === currentVendorId
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {participant.vendorName} ({participant.quantity}kg)
                          {participant.vendorId === currentVendorId && ' (You)'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Section */}
                {order.status === 'open' && !isParticipating && !isInitiator && remainingQuantity > 0 && (
                  <div className="border-t pt-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quantity to join (kg)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={maxJoinQuantity}
                          value={selectedQuantity[order._id] || 1}
                          onChange={(e) => handleQuantityChange(order._id, parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Max: {remainingQuantity}kg remaining
                        </p>
                      </div>
                      <button
                        onClick={() => handleJoinOrder(order._id)}
                        disabled={!selectedQuantity[order._id] || selectedQuantity[order._id] > remainingQuantity}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                      >
                        Join Order
                      </button>
                    </div>
                  </div>
                )}

                {/* Status Messages */}
                {isInitiator && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-blue-600 font-medium">
                      You initiated this group order
                    </p>
                  </div>
                )}

                {isParticipating && !isInitiator && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-green-600 font-medium">
                      You are participating in this order
                    </p>
                  </div>
                )}

                {order.status === 'open' && remainingQuantity === 0 && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-orange-600 font-medium">
                      Target quantity reached - order will be locked soon
                    </p>
                  </div>
                )}

                {order.status === 'locked' && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-orange-600 font-medium">
                      This order is locked and individual orders have been created
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GroupOrderList;