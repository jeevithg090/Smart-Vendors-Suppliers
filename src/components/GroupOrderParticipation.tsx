import React, { useEffect, useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

interface GroupOrderParticipationProps {
  groupOrderId: Id<"groupOrders">;
  vendorId: Id<"vendors">;
  vendorLocation: string;
  initialQuantity?: number;
  onSuccess: () => void;
  onCancel: () => void;
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

const GroupOrderParticipation: React.FC<GroupOrderParticipationProps> = ({
  groupOrderId,
  vendorId,
  vendorLocation,
  initialQuantity = 1,
  onSuccess,
  onCancel,
}) => {
  const [quantity, setQuantity] = useState<number>(initialQuantity > 0 ? initialQuantity : 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  const joinGroupOrder = useMutation(api.groupOrders.joinGroupOrder);
  const leaveGroupOrder = useMutation(api.groupOrders.leaveGroupOrder);

  // Get group order details
  const groupOrders = useQuery(api.groupOrders.getGroupOrdersByLocation, {
    location: vendorLocation,
  }) as GroupOrder[] | undefined;

  useEffect(() => {
    setQuantity(initialQuantity > 0 ? initialQuantity : 1);
  }, [initialQuantity, groupOrderId]);

  const groupOrder = groupOrders?.find(order => order._id === groupOrderId);

  const isVendorParticipating = groupOrder?.participants.some(
    p => p.vendorId === vendorId
  );

  const vendorParticipation = groupOrder?.participants.find(
    p => p.vendorId === vendorId
  );

  const remainingQuantity = groupOrder 
    ? groupOrder.targetQuantity - groupOrder.currentQuantity 
    : 0;

  const maxQuantity = Math.min(remainingQuantity, 50); // Reasonable maximum

  const handleJoinOrder = async () => {
    if (!groupOrder || quantity <= 0 || quantity > remainingQuantity) {
      setError('Invalid quantity selected');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await joinGroupOrder({
        groupOrderId,
        vendorId,
        quantity,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join group order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLeaveOrder = async () => {
    if (!groupOrder) return;

    setIsSubmitting(true);
    setError('');

    try {
      await leaveGroupOrder({
        groupOrderId,
        vendorId,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave group order');
    } finally {
      setIsSubmitting(false);
    }
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

  const calculateTotalCost = () => {
    return groupOrder ? quantity * groupOrder.pricePerUnit : 0;
  };

  if (!groupOrder) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const progressPercentage = getProgressPercentage(groupOrder.currentQuantity, groupOrder.targetQuantity);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {isVendorParticipating ? 'Manage Participation' : 'Join Group Order'}
        </h2>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Order Details */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{groupOrder.itemName}</h3>
            <p className="text-gray-600">Category: {groupOrder.category}</p>
            <p className="text-gray-600">Supplier: {groupOrder.supplierName}</p>
          </div>
          <div className="text-right">
            <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
              groupOrder.status === 'open' 
                ? 'bg-green-100 text-green-800'
                : 'bg-orange-100 text-orange-800'
            }`}>
              {groupOrder.status.charAt(0).toUpperCase() + groupOrder.status.slice(1)}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {formatTimeRemaining(groupOrder.expiresAt)}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress: {groupOrder.currentQuantity} / {groupOrder.targetQuantity} kg</span>
            <span>{progressPercentage.toFixed(0)}% complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-600">Price per kg</p>
            <p className="text-lg font-semibold text-green-600">₹{groupOrder.pricePerUnit}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Participants</p>
            <p className="text-lg font-semibold">{groupOrder.participants.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Remaining</p>
            <p className="text-lg font-semibold">{remainingQuantity} kg</p>
          </div>
        </div>
      </div>

      {/* Current Participation Status */}
      {isVendorParticipating && vendorParticipation && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-blue-900 mb-2">Your Current Participation</h3>
          <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <span>Quantity:</span>
              <span className="ml-2 font-medium">{vendorParticipation.quantity} kg</span>
            </div>
            <div>
              <span>Total Cost:</span>
              <span className="ml-2 font-medium">₹{(vendorParticipation.quantity * groupOrder.pricePerUnit).toFixed(2)}</span>
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-2">
            Joined on {new Date(vendorParticipation.joinedAt).toLocaleDateString()}
          </p>
        </div>
      )}

      {/* Participants List */}
      {groupOrder.participantsWithDetails.length > 0 && (
        <div className="mb-6">
          <h3 className="font-medium text-gray-900 mb-3">Current Participants</h3>
          <div className="space-y-2">
            {groupOrder.participantsWithDetails.map((participant, index) => (
              <div
                key={index}
                className={`flex justify-between items-center p-3 rounded-lg ${
                  participant.vendorId === vendorId
                    ? 'bg-blue-50 border border-blue-200'
                    : 'bg-gray-50'
                }`}
              >
                <div>
                  <span className="font-medium">
                    {participant.vendorName}
                    {participant.vendorId === vendorId && ' (You)'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-medium">{participant.quantity} kg</span>
                  <p className="text-sm text-gray-500">
                    ₹{(participant.quantity * groupOrder.pricePerUnit).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Section */}
      {groupOrder.status === 'open' && (
        <div className="space-y-4">
          {!isVendorParticipating && remainingQuantity > 0 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity to join (kg)
                </label>
                <input
                  type="number"
                  min="1"
                  max={maxQuantity}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Max: {remainingQuantity} kg remaining
                </p>
              </div>

              {/* Cost Calculation */}
              <div className="bg-green-50 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-green-800">Total Cost:</span>
                  <span className="text-lg font-semibold text-green-800">
                    ₹{calculateTotalCost().toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  {quantity} kg × ₹{groupOrder.pricePerUnit} per kg
                </p>
              </div>
            </>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            
            {!isVendorParticipating && remainingQuantity > 0 && (
              <button
                onClick={handleJoinOrder}
                disabled={isSubmitting || quantity <= 0 || quantity > remainingQuantity}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Joining...' : `Join Order (₹${calculateTotalCost().toFixed(2)})`}
              </button>
            )}

            {isVendorParticipating && groupOrder.status === 'open' && (
              <button
                onClick={handleLeaveOrder}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Leaving...' : 'Leave Order'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Status Messages */}
      {groupOrder.status === 'locked' && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-orange-800 font-medium">
            This group order has been locked and individual orders have been created.
          </p>
          <p className="text-orange-600 text-sm mt-1">
            Check your order history for the individual order details.
          </p>
        </div>
      )}

      {groupOrder.status === 'open' && remainingQuantity === 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-orange-800 font-medium">
            Target quantity reached! This order will be locked soon.
          </p>
        </div>
      )}

      {groupOrder.status === 'open' && new Date(groupOrder.expiresAt).getTime() < Date.now() && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">
            This group order has expired and is no longer accepting participants.
          </p>
        </div>
      )}
    </div>
  );
};

export default GroupOrderParticipation;
