import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useAuth } from '../contexts/AuthContext';
import GroupOrderManager from './GroupOrderManager';
import { OrderPlacement } from './OrderPlacement';

interface WorkflowIntegrationProps {
  initialStep?: string;
}

type WorkflowStepId =
  | 'discover'
  | 'recommendations'
  | 'groupOrders'
  | 'firstOrder'
  | 'inventory'
  | 'priceAlerts'
  | 'analytics'
  | 'communication';

interface WorkflowState {
  discoveryCompleted: boolean;
  recommendationsViewed: boolean;
  groupOrderParticipated: boolean;
  firstOrderPlaced: boolean;
  inventoryTracked: boolean;
  priceAlertsSet: boolean;
  financialAnalyticsViewed: boolean;
  communicationUsed: boolean;
  currentStep: string;
  lastActivity: number;
}

interface WorkflowStep {
  id: WorkflowStepId;
  title: string;
  description: string;
  icon: string;
  completed: boolean;
}

type FeedbackState = {
  type: 'success' | 'error' | 'info';
  text: string;
};

type WorkflowPatch = Partial<
  Pick<
    WorkflowState,
    | 'discoveryCompleted'
    | 'recommendationsViewed'
    | 'groupOrderParticipated'
    | 'firstOrderPlaced'
    | 'inventoryTracked'
    | 'priceAlertsSet'
    | 'financialAnalyticsViewed'
    | 'communicationUsed'
  >
>;

interface MarketplaceInventory {
  _id: Id<'inventory'>;
  supplierId: Id<'suppliers'>;
  itemName: string;
  category: string;
  currentStock: number;
  unit: string;
  pricePerUnit: number;
  quality: string;
}

interface MarketplaceSupplier {
  _id: Id<'suppliers'>;
  businessName: string;
  userId: string;
}

const createGuestWorkflowState = (initialStep: string): WorkflowState => ({
  discoveryCompleted: false,
  recommendationsViewed: false,
  groupOrderParticipated: false,
  firstOrderPlaced: false,
  inventoryTracked: false,
  priceAlertsSet: false,
  financialAnalyticsViewed: false,
  communicationUsed: false,
  currentStep: initialStep,
  lastActivity: Date.now(),
});

const WorkflowIntegration: React.FC<WorkflowIntegrationProps> = ({ initialStep = 'discover' }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<WorkflowStepId>(
    initialStep as WorkflowStepId,
  );

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [supplier, setSupplier] = useState('');

  const [showGroupOrders, setShowGroupOrders] = useState(false);
  const [showMessageComposer, setShowMessageComposer] = useState(false);
  const [messageSupplierId, setMessageSupplierId] = useState<Id<'suppliers'> | ''>('');
  const [messageText, setMessageText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [pendingAlertItemId, setPendingAlertItemId] = useState<string | null>(null);

  const [orderModal, setOrderModal] = useState<{
    open: boolean;
    supplierId?: Id<'suppliers'>;
  } | null>(null);

  const allInventory = useQuery(api.inventory.getAvailableInventory, {}) as
    | MarketplaceInventory[]
    | undefined;
  const allSuppliers = useQuery(api.suppliers.listAllSuppliers, {}) as
    | MarketplaceSupplier[]
    | undefined;

  const vendor = useQuery(api.vendors.getByUserId, user ? { userId: user.id } : 'skip');
  const workflowState = useQuery(
    api.vendors.getWorkflowState,
    vendor ? { vendorId: vendor._id } : 'skip',
  );

  const updateWorkflowState = useMutation(api.vendors.updateWorkflowState);
  const createPriceAlert = useMutation(api.priceAlerts.createPriceAlert);
  const sendMessage = useMutation(api.messages.sendMessage);
  const sendMessageNotification = useMutation(api.notifications.sendMessageNotification);

  const isFallbackMode = !user || !vendor;
  const guestWorkflowState = useMemo(() => createGuestWorkflowState(initialStep), [initialStep]);
  const effectiveWorkflowState = workflowState ?? (isFallbackMode ? guestWorkflowState : null);

  const supplierLookup = useMemo(() => {
    const map = new Map<string, MarketplaceSupplier>();
    (allSuppliers ?? []).forEach((sup) => map.set(String(sup._id), sup));
    return map;
  }, [allSuppliers]);

  const filteredInventory = useMemo(() => {
    if (!allInventory) return [];

    return allInventory.filter((item) => {
      const matchesSearch =
        search === '' || item.itemName.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === '' || item.category === category;
      const matchesSupplier = supplier === '' || String(item.supplierId) === supplier;
      return matchesSearch && matchesCategory && matchesSupplier;
    });
  }, [allInventory, search, category, supplier]);

  const workflowSteps: WorkflowStep[] = useMemo(
    () => [
      {
        id: 'discover',
        title: 'Discover Suppliers',
        description: 'Find trusted suppliers in your area',
        icon: '🔍',
        completed: effectiveWorkflowState?.discoveryCompleted || false,
      },
      {
        id: 'recommendations',
        title: 'AI Recommendations',
        description: 'Get personalized supplier suggestions',
        icon: '🤖',
        completed: effectiveWorkflowState?.recommendationsViewed || false,
      },
      {
        id: 'groupOrders',
        title: 'Group Orders',
        description: 'Save money with bulk purchasing',
        icon: '👥',
        completed: effectiveWorkflowState?.groupOrderParticipated || false,
      },
      {
        id: 'firstOrder',
        title: 'Place Your First Order',
        description: 'Start sourcing with confidence',
        icon: '🛒',
        completed: effectiveWorkflowState?.firstOrderPlaced || false,
      },
      {
        id: 'inventory',
        title: 'Track Inventory',
        description: 'Monitor your stock levels',
        icon: '📦',
        completed: effectiveWorkflowState?.inventoryTracked || false,
      },
      {
        id: 'priceAlerts',
        title: 'Set Price Alerts',
        description: 'Never miss a good deal',
        icon: '💰',
        completed: effectiveWorkflowState?.priceAlertsSet || false,
      },
      {
        id: 'analytics',
        title: 'View Analytics',
        description: 'Understand your spending patterns',
        icon: '📊',
        completed: effectiveWorkflowState?.financialAnalyticsViewed || false,
      },
      {
        id: 'communication',
        title: 'Connect with Suppliers',
        description: 'Build lasting relationships',
        icon: '💬',
        completed: effectiveWorkflowState?.communicationUsed || false,
      },
    ],
    [effectiveWorkflowState],
  );

  useEffect(() => {
    if (!effectiveWorkflowState) return;
    const firstIncompleteStep = workflowSteps.find((step) => !step.completed);
    setCurrentStep((firstIncompleteStep?.id || 'discover') as WorkflowStepId);
  }, [effectiveWorkflowState, workflowSteps]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 5000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const persistWorkflowActivity = async (stepId: WorkflowStepId, patch: WorkflowPatch = {}) => {
    if (!vendor) return;

    try {
      await updateWorkflowState({
        vendorId: vendor._id,
        currentStep: stepId,
        lastActivity: Date.now(),
        ...patch,
      });
    } catch (error) {
      console.warn('Failed to update workflow state:', error);
    }
  };

  const setActionFeedback = (type: FeedbackState['type'], text: string) => {
    setFeedback({ type, text });
  };

  const openOrderPlacement = (supplierId: Id<'suppliers'>) => {
    setOrderModal({ open: true, supplierId });
    setShowGroupOrders(false);
    setShowMessageComposer(false);
  };

  const handleQuickOrder = () => {
    const candidateItem = filteredInventory[0] ?? allInventory?.[0];
    if (!candidateItem) {
      setActionFeedback(
        'info',
        'No inventory is available right now. Try updating filters or check back later.',
      );
      return;
    }

    setCurrentStep('firstOrder');
    openOrderPlacement(candidateItem.supplierId);
    setActionFeedback('info', `Opening order form for ${candidateItem.itemName}.`);
    void persistWorkflowActivity('firstOrder');
  };

  const handleJoinGroupOrders = () => {
    if (!vendor) {
      setActionFeedback('error', 'Vendor profile is still loading. Please wait a moment.');
      return;
    }

    setCurrentStep('groupOrders');
    setShowGroupOrders(true);
    setShowMessageComposer(false);
    setActionFeedback('info', 'Group order manager opened.');
    void persistWorkflowActivity('groupOrders');
  };

  const handleOpenMessages = () => {
    if (!allSuppliers || allSuppliers.length === 0) {
      setActionFeedback('info', 'No suppliers available to message yet.');
      return;
    }

    setCurrentStep('communication');
    setShowGroupOrders(false);
    setShowMessageComposer(true);
    setMessageSupplierId((prev) => prev || allSuppliers[0]._id);
    setActionFeedback('info', 'Message composer opened.');
    void persistWorkflowActivity('communication');
  };

  const handleCreatePriceAlert = async (item: MarketplaceInventory) => {
    if (!vendor) {
      setActionFeedback('error', 'Vendor profile is required before creating alerts.');
      return;
    }

    setPendingAlertItemId(String(item._id));

    try {
      const targetPrice = Number(Math.max(item.pricePerUnit * 0.95, 0.01).toFixed(2));
      await createPriceAlert({
        vendorId: vendor._id,
        itemName: item.itemName,
        targetPrice,
        supplierId: item.supplierId,
      });

      setActionFeedback(
        'success',
        `Price alert created for ${item.itemName} at ₹${targetPrice.toFixed(2)}.`,
      );
      setCurrentStep('priceAlerts');
      void persistWorkflowActivity('priceAlerts', { priceAlertsSet: true });
    } catch (error) {
      console.error(error);
      setActionFeedback('error', `Failed to create alert for ${item.itemName}.`);
    } finally {
      setPendingAlertItemId(null);
    }
  };

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user?.email) {
      setActionFeedback('error', 'Please sign in again before sending messages.');
      return;
    }

    if (!messageSupplierId) {
      setActionFeedback('error', 'Select a supplier to send a message.');
      return;
    }

    if (!messageText.trim()) {
      setActionFeedback('error', 'Message cannot be empty.');
      return;
    }

    const selectedSupplier = (allSuppliers ?? []).find(
      (sup) => String(sup._id) === String(messageSupplierId),
    );

    if (!selectedSupplier?.userId) {
      setActionFeedback('error', 'Unable to resolve supplier identity for messaging.');
      return;
    }

    setIsSendingMessage(true);

    try {
      const messageId = await sendMessage({
        userEmail: user.email,
        receiverId: selectedSupplier.userId,
        receiverType: 'supplier',
        content: messageText.trim(),
        messageType: 'text',
      });

      try {
        await sendMessageNotification({ messageId });
      } catch (notificationError) {
        console.warn('Message sent but notification failed:', notificationError);
      }

      setMessageText('');
      setShowMessageComposer(false);
      setActionFeedback('success', `Message sent to ${selectedSupplier.businessName}.`);
      void persistWorkflowActivity('communication', { communicationUsed: true });
    } catch (error) {
      console.error(error);
      setActionFeedback('error', 'Failed to send the message. Please try again.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleStepAction = (stepId: WorkflowStepId) => {
    setCurrentStep(stepId);

    switch (stepId) {
      case 'discover':
        setShowGroupOrders(false);
        setShowMessageComposer(false);
        setActionFeedback('info', 'Use search and filters to discover suppliers and products.');
        void persistWorkflowActivity('discover', { discoveryCompleted: true });
        break;
      case 'recommendations':
        setActionFeedback(
          'info',
          'Recommendations update automatically from your sourcing activity and orders.',
        );
        void persistWorkflowActivity('recommendations', { recommendationsViewed: true });
        break;
      case 'groupOrders':
        handleJoinGroupOrders();
        break;
      case 'firstOrder':
        handleQuickOrder();
        break;
      case 'inventory':
        setActionFeedback(
          'info',
          'Inventory details are visible in the catalog table below and refresh with marketplace data.',
        );
        void persistWorkflowActivity('inventory', { inventoryTracked: true });
        break;
      case 'priceAlerts': {
        const candidateItem = filteredInventory[0] ?? allInventory?.[0];
        if (candidateItem) {
          void handleCreatePriceAlert(candidateItem);
        } else {
          setActionFeedback('info', 'No item found for alert creation. Add inventory filters first.');
        }
        break;
      }
      case 'analytics':
        setActionFeedback(
          'info',
          'Open the Analytics tab from dashboard quick actions for full financial breakdowns.',
        );
        void persistWorkflowActivity('analytics', { financialAnalyticsViewed: true });
        break;
      case 'communication':
        handleOpenMessages();
        break;
      default:
        break;
    }
  };

  if (!effectiveWorkflowState) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-orange-500" />
      </div>
    );
  }

  const completedSteps = workflowSteps.filter((step) => step.completed).length;
  const progressPercentage = (completedSteps / workflowSteps.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-orange-200 bg-gradient-to-r from-orange-100 to-orange-50 py-6 px-4 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between md:flex-row">
          <div>
            <h1 className="mb-1 text-2xl font-bold text-orange-800">Vendor Sourcing Workflow</h1>
            <p className="text-sm text-orange-700">
              Follow this guided workflow to optimize your sourcing process.
            </p>
          </div>

          <div className="mb-4 w-full max-w-md">
            <div className="mb-2 flex justify-between text-sm text-gray-600">
              <span>Progress:</span>
              <span>
                {completedSteps} of {workflowSteps.length} completed
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-orange-500 to-green-500 transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleQuickOrder}
              className="rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600"
            >
              Quick Order
            </button>
            <button
              type="button"
              onClick={handleJoinGroupOrders}
              className="rounded-md bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600"
            >
              Join Group Order
            </button>
            <button
              type="button"
              onClick={handleOpenMessages}
              className="rounded-md bg-gray-700 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Messages
            </button>
          </div>

          {feedback && (
            <div
              className={`mb-5 rounded-lg border px-4 py-3 text-sm ${
                feedback.type === 'success'
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : feedback.type === 'error'
                    ? 'border-red-200 bg-red-50 text-red-800'
                    : 'border-blue-200 bg-blue-50 text-blue-800'
              }`}
            >
              {feedback.text}
            </div>
          )}

          <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {workflowSteps.map((step) => (
              <button
                key={step.id}
                type="button"
                onClick={() => handleStepAction(step.id)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  step.id === currentStep
                    ? 'border-orange-300 bg-orange-50'
                    : 'border-gray-200 bg-white hover:border-orange-200'
                }`}
              >
                <div className="mb-1 text-sm font-semibold text-gray-900">
                  {step.icon} {step.title}
                </div>
                <div className="text-xs text-gray-600">{step.description}</div>
              </button>
            ))}
          </div>

          {showGroupOrders && vendor && (
            <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-2">
              <div className="mb-2 flex items-center justify-between px-4 pt-3">
                <h3 className="text-lg font-semibold text-blue-900">Group Orders Workspace</h3>
                <button
                  type="button"
                  onClick={() => setShowGroupOrders(false)}
                  className="text-sm font-medium text-blue-700 hover:text-blue-900"
                >
                  Hide
                </button>
              </div>
              <GroupOrderManager vendorId={vendor._id} vendorLocation={vendor.location.city} />
            </div>
          )}

          {showMessageComposer && (
            <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Send Supplier Message</h3>
                <button
                  type="button"
                  onClick={() => setShowMessageComposer(false)}
                  className="text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleSendMessage} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Supplier</label>
                  <select
                    value={messageSupplierId}
                    onChange={(event) => setMessageSupplierId(event.target.value as Id<'suppliers'>)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    required
                  >
                    <option value="">Select a supplier</option>
                    {(allSuppliers ?? []).map((sup) => (
                      <option key={sup._id} value={sup._id}>
                        {sup.businessName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Message</label>
                  <textarea
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    rows={4}
                    placeholder="Type your request or negotiation message..."
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    required
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSendingMessage}
                    className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSendingMessage ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="lg:col-span-3">
            <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
              <div className="mb-4 flex flex-col md:flex-row md:items-end md:space-x-4">
                <div className="mb-2 flex-1 md:mb-0">
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div className="mb-2 md:mb-0">
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">All Categories</option>
                    {[...new Set((allInventory || []).map((item) => item.category))].map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <select
                    value={supplier}
                    onChange={(event) => setSupplier(event.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">All Suppliers</option>
                    {(allSuppliers || []).map((sup) => (
                      <option key={sup._id} value={sup._id}>
                        {sup.businessName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Supplier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Stock
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Quality
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredInventory.map((item) => {
                      const supplierObj = supplierLookup.get(String(item.supplierId));
                      const isCreatingAlert = pendingAlertItemId === String(item._id);

                      return (
                        <tr key={item._id} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{item.itemName}</div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                              {item.category}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="text-sm text-gray-900">{supplierObj?.businessName || '—'}</div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {item.currentStock} {item.unit}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              ₹{item.pricePerUnit.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">per {item.unit}</div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                              {item.quality}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 space-x-2">
                            <button
                              type="button"
                              className="rounded bg-orange-500 px-3 py-1 text-xs text-white hover:bg-orange-600"
                              onClick={() => {
                                setCurrentStep('firstOrder');
                                openOrderPlacement(item.supplierId);
                                setActionFeedback('info', `Ordering ${item.itemName} from catalog.`);
                              }}
                            >
                              Order
                            </button>
                            <button
                              type="button"
                              className="rounded bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600"
                              onClick={() => {
                                setSupplier(String(item.supplierId));
                                handleJoinGroupOrders();
                              }}
                            >
                              Group Order
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleCreatePriceAlert(item)}
                              disabled={isCreatingAlert}
                              className="rounded bg-yellow-500 px-3 py-1 text-xs text-white hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isCreatingAlert ? 'Saving...' : 'Price Alert'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {filteredInventory.length === 0 && (
                  <div className="py-12 text-center text-gray-500">No products found.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {orderModal?.open && vendor && orderModal.supplierId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-xl">
            <OrderPlacement
              supplierId={orderModal.supplierId}
              vendorId={vendor._id}
              onOrderPlaced={() => {
                setOrderModal(null);
                setActionFeedback('success', 'Order placed successfully.');
                void persistWorkflowActivity('firstOrder', {
                  firstOrderPlaced: true,
                  inventoryTracked: true,
                });
              }}
              onCancel={() => setOrderModal(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowIntegration;
