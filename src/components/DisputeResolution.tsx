import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

interface DisputeResolutionProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DisputeResolution: React.FC<DisputeResolutionProps> = ({
  isOpen,
  onClose
}) => {
  const [activeDispute, setActiveDispute] = useState<Id<'disputes'> | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="absolute right-4 top-4 w-full max-w-4xl h-[90vh] bg-white rounded-lg shadow-xl">
        {activeDispute ? (
          <DisputeDetails
            disputeId={activeDispute}
            onBack={() => setActiveDispute(null)}
            onClose={onClose}
          />
        ) : showCreateForm ? (
          <CreateDisputeForm
            onBack={() => setShowCreateForm(false)}
            onDisputeCreated={(disputeId) => {
              setActiveDispute(disputeId);
              setShowCreateForm(false);
            }}
            onClose={onClose}
          />
        ) : (
          <DisputesList
            onSelectDispute={setActiveDispute}
            onCreateDispute={() => setShowCreateForm(true)}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
};

// Disputes List Component
const DisputesList: React.FC<{
  onSelectDispute: (disputeId: Id<'disputes'>) => void;
  onCreateDispute: () => void;
  onClose: () => void;
}> = ({ onSelectDispute, onCreateDispute, onClose }) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const disputes = useQuery(api.support.getDisputes, {
    status: statusFilter === 'all' ? undefined : statusFilter
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Dispute Resolution</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Filters and Actions */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            {['all', 'open', 'under_review', 'mediation', 'resolved'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 text-sm rounded-full transition-colors capitalize ${
                  statusFilter === status
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>
          <button
            onClick={onCreateDispute}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Create Dispute
          </button>
        </div>
      </div>

      {/* Disputes List */}
      <div className="flex-1 overflow-y-auto p-6">
        {disputes === undefined ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse p-4 border border-gray-200 rounded-lg">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        ) : disputes.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No disputes found</h3>
            <p className="text-gray-500">
              {statusFilter === 'all' 
                ? "You don't have any disputes yet."
                : `No disputes with status "${statusFilter.replace('_', ' ')}".`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {disputes.map((dispute: any) => (
              <div
                key={dispute._id}
                onClick={() => onSelectDispute(dispute._id)}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-medium text-gray-900">
                        Order #{dispute.orderId.slice(-8)}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs rounded-full capitalize ${
                          dispute.status === 'open'
                            ? 'bg-red-100 text-red-800'
                            : dispute.status === 'under_review'
                            ? 'bg-yellow-100 text-yellow-800'
                            : dispute.status === 'mediation'
                            ? 'bg-orange-100 text-orange-800'
                            : dispute.status === 'resolved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {dispute.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Category: <span className="capitalize">{dispute.category}</span>
                    </p>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {dispute.description}
                    </p>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <p>{new Date(dispute.createdAt).toLocaleDateString()}</p>
                    <p className="capitalize">
                      {dispute.initiatorType === 'vendor' ? 'You initiated' : 'Initiated against you'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Dispute ID: {dispute._id.slice(-8)}</span>
                  {dispute.mediatorId && (
                    <span>Mediator assigned</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Create Dispute Form Component
const CreateDisputeForm: React.FC<{
  onBack: () => void;
  onDisputeCreated: (disputeId: Id<'disputes'>) => void;
  onClose: () => void;
}> = ({ onBack, onDisputeCreated, onClose }) => {
  const [formData, setFormData] = useState({
    orderId: '',
    category: 'quality',
    description: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const createDispute = useMutation(api.support.createDispute);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.orderId || !formData.description.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const disputeId = await createDispute({
        orderId: formData.orderId as Id<'orders'>,
        category: formData.category,
        description: formData.description.trim(),
      });
      onDisputeCreated(disputeId);
    } catch (error) {
      console.error('Failed to create dispute:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-semibold text-gray-900">Create Dispute</h2>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Order ID
          </label>
          <input
            type="text"
            value={formData.orderId}
            onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="Enter the order ID for this dispute"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            You can find the order ID in your order history
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dispute Category
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="quality">Product Quality</option>
            <option value="delivery">Delivery Issue</option>
            <option value="payment">Payment Problem</option>
            <option value="communication">Communication Issue</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full h-40 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
            placeholder="Please provide detailed information about the dispute, including what happened, when it occurred, and what resolution you're seeking..."
            required
          />
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-yellow-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Important Notice</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Creating a dispute will notify the other party and may affect your relationship. 
                Please try to resolve issues through direct communication first.
              </p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={!formData.orderId || !formData.description.trim() || isLoading}
          className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Creating Dispute...' : 'Create Dispute'}
        </button>
      </form>
    </div>
  );
};

// Dispute Details Component
const DisputeDetails: React.FC<{
  disputeId: Id<'disputes'>;
  onBack: () => void;
  onClose: () => void;
}> = ({ disputeId, onBack, onClose }) => {
  const dispute = useQuery(api.support.getDispute, { disputeId });

  if (!dispute) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Dispute #{dispute._id.slice(-8)}
            </h2>
            <p className="text-sm text-gray-500">
              Order #{dispute.orderId.slice(-8)}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span
            className={`px-3 py-1 text-sm rounded-full capitalize ${
              dispute.status === 'open'
                ? 'bg-red-100 text-red-800'
                : dispute.status === 'under_review'
                ? 'bg-yellow-100 text-yellow-800'
                : dispute.status === 'mediation'
                ? 'bg-orange-100 text-orange-800'
                : dispute.status === 'resolved'
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {dispute.status.replace('_', ' ')}
          </span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Dispute Info */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Dispute Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Category</p>
                <p className="text-sm text-gray-900 capitalize">{dispute.category}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Created</p>
                <p className="text-sm text-gray-900">
                  {new Date(dispute.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Initiator</p>
                <p className="text-sm text-gray-900 capitalize">{dispute.initiatorType}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Respondent</p>
                <p className="text-sm text-gray-900 capitalize">{dispute.respondentType}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Description</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{dispute.description}</p>
          </div>

          {/* Order Details */}
          {dispute.order && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Order Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Order Status</p>
                  <p className="text-sm text-gray-900 capitalize">{dispute.order.status}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Total Cost</p>
                  <p className="text-sm text-gray-900">₹{dispute.order.totalCost}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Order Date</p>
                  <p className="text-sm text-gray-900">
                    {new Date(dispute.order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Payment Status</p>
                  <p className="text-sm text-gray-900 capitalize">{dispute.order.paymentStatus}</p>
                </div>
              </div>
            </div>
          )}

          {/* Resolution */}
          {dispute.resolution && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-green-900 mb-4">Resolution</h3>
              <p className="text-green-700 whitespace-pre-wrap">{dispute.resolution}</p>
              {dispute.resolvedAt && (
                <p className="text-sm text-green-600 mt-2">
                  Resolved on {new Date(dispute.resolvedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Timeline</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Dispute Created</p>
                  <p className="text-sm text-gray-500">
                    {new Date(dispute.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              {dispute.status !== 'open' && (
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Under Review</p>
                    <p className="text-sm text-gray-500">Status updated</p>
                  </div>
                </div>
              )}
              {dispute.mediatorId && (
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Mediator Assigned</p>
                    <p className="text-sm text-gray-500">Mediation in progress</p>
                  </div>
                </div>
              )}
              {dispute.resolvedAt && (
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Resolved</p>
                    <p className="text-sm text-gray-500">
                      {new Date(dispute.resolvedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};