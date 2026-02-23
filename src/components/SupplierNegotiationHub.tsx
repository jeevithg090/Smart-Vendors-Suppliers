import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

interface NegotiationRequest {
  _id: Id<'negotiations'>;
  supplierId: Id<'suppliers'>;
  itemName: string;
  currentPrice: number;
  requestedPrice: number;
  quantity: number;
  unit: string;
  justification: string;
  status: 'pending' | 'accepted' | 'rejected' | 'counter';
  counterOffer?: number;
  counterMessage?: string;
  createdAt: number;
  expiresAt: number;
  vendorNote?: string;
  supplierResponse?: string;
}

interface BulkOrder {
  _id: Id<'groupOrders'>;
  itemName: string;
  category: string;
  targetQuantity: number;
  currentQuantity: number;
  pricePerUnit: number;
  status: string;
  expiresAt: number;
  createdAt: number;
  initiatorId: Id<'vendors'>;
  supplierId: Id<'suppliers'>;
  supplierName?: string;
}

interface NegotiationTip {
  category: string;
  tips: string[];
  icon: string;
}

interface Props {
  vendorId: Id<'vendors'>;
  vendorCity: string;
}
export default function SupplierNegotiationHub({ vendorId, vendorCity }: Props) {
  const [activeTab, setActiveTab] = useState<'negotiations' | 'bulk' | 'templates' | 'tips'>('negotiations');
  const [showNewNegotiation, setShowNewNegotiation] = useState(false);
  const [showBulkOrderCreator, setShowBulkOrderCreator] = useState(false);
  const [selectedBulkOrderId, setSelectedBulkOrderId] = useState<Id<'groupOrders'> | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const [bulkOrderDraft, setBulkOrderDraft] = useState({
    itemName: '',
    category: 'Vegetables',
    targetQuantity: 50,
    pricePerUnit: 0,
    supplierId: '',
    deadlineDays: 5
  });

  const negotiationTips: NegotiationTip[] = [
    {
      category: 'Building Relationships',
      icon: '🤝',
      tips: [
        'Start with smaller orders to build trust before negotiating larger deals',
        'Pay on time consistently to establish creditworthiness',
        'Provide honest feedback about product quality',
        'Share your business plans to show growth potential'
      ]
    },
    {
      category: 'Timing Your Negotiations',
      icon: '⏰',
      tips: [
        'Negotiate during supplier\'s slower seasons',
        'Plan negotiations around your renewal periods',
        'Consider market price fluctuations in your timing',
        'Avoid peak demand periods for better rates'
      ]
    },
    {
      category: 'Volume-Based Negotiation',
      icon: '📦',
      tips: [
        'Commit to minimum monthly volumes for better rates',
        'Bundle multiple items in your negotiation',
        'Consider joining bulk purchase groups',
        'Offer longer-term contracts for better pricing'
      ]
    },
    {
      category: 'Market Research',
      icon: '📊',
      tips: [
        'Research competitor pricing before negotiating',
        'Understand seasonal price variations',
        'Know your supplier\'s cost structure',
        'Stay informed about market trends'
      ]
    }
  ];

  const [newNegotiation, setNewNegotiation] = useState({
    supplierId: '',
    itemName: '',
    currentPrice: 0,
    requestedPrice: 0,
    quantity: 0,
    unit: 'kg',
    justification: ''
  });

  const suppliers = useQuery(api.suppliers.listAllSuppliers);
  const negotiations = useQuery(api.negotiations.getNegotiationsByVendor, { vendorId }) as any[] | undefined;
  const bulkOrders = useQuery(api.groupOrders.getGroupOrdersByLocation, {
    location: vendorCity,
    status: "open",
  }) as BulkOrder[] | undefined;

  const createNegotiation = useMutation(api.negotiations.createNegotiation);
  const respondToNegotiation = useMutation(api.negotiations.respondToNegotiation);
  const createGroupOrder = useMutation(api.groupOrders.createGroupOrder);
  const joinGroupOrder = useMutation(api.groupOrders.joinGroupOrder);

  const supplierLookup = useMemo(() => {
    const map = new Map<string, { businessName: string; trustScore: number }>();
    (suppliers ?? []).forEach((supplier) =>
      map.set(String(supplier._id), {
        businessName: supplier.businessName,
        trustScore: supplier.trustScore ?? 0,
      })
    );
    return map;
  }, [suppliers]);

  const negotiationList = (negotiations ?? []) as NegotiationRequest[];
  const bulkOrderList = bulkOrders ?? [];

  useEffect(() => {
    if (!actionMessage) return;
    const timer = window.setTimeout(() => setActionMessage(''), 4500);
    return () => window.clearTimeout(timer);
  }, [actionMessage]);

  const showActionMessage = (message: string) => {
    setActionMessage(message);
  };

  const submitNegotiation = async () => {
    if (!newNegotiation.supplierId || !newNegotiation.itemName || !newNegotiation.justification) {
      showActionMessage('Fill supplier, item, and justification before submitting.');
      return;
    }

    try {
      await createNegotiation({
        vendorId,
        supplierId: newNegotiation.supplierId as Id<'suppliers'>,
        itemName: newNegotiation.itemName,
        currentPrice: newNegotiation.currentPrice,
        requestedPrice: newNegotiation.requestedPrice,
        quantity: newNegotiation.quantity,
        unit: newNegotiation.unit,
        justification: newNegotiation.justification,
      });
      setShowNewNegotiation(false);
      showActionMessage('Negotiation request sent.');
      setNewNegotiation({
        supplierId: '',
        itemName: '',
        currentPrice: 0,
        requestedPrice: 0,
        quantity: 0,
        unit: 'kg',
        justification: ''
      });
    } catch (error) {
      console.error('Failed to create negotiation:', error);
      showActionMessage('Failed to send negotiation request.');
    }
  };

  const acceptCounterOffer = async (negotiationId: Id<'negotiations'>) => {
    try {
      await respondToNegotiation({
        negotiationId,
        status: 'accepted',
        supplierResponse: 'Vendor accepted counter offer',
      });
      showActionMessage('Counter offer accepted.');
    } catch (error) {
      console.error('Failed to accept counter offer:', error);
      showActionMessage('Failed to accept counter offer.');
    }
  };

  const startCounterNegotiation = (negotiation: NegotiationRequest) => {
    setShowNewNegotiation(true);
    setNewNegotiation({
      supplierId: negotiation.supplierId,
      itemName: negotiation.itemName,
      currentPrice: negotiation.counterOffer || negotiation.currentPrice,
      requestedPrice: negotiation.counterOffer
        ? Math.max(negotiation.counterOffer - 2, 1)
        : negotiation.requestedPrice,
      quantity: negotiation.quantity,
      unit: negotiation.unit,
      justification: `Following up on counter offer: ${negotiation.counterMessage || negotiation.justification}`
    });
    showActionMessage('Counter negotiation draft prepared.');
  };

  const joinBulkOrder = async (orderId: Id<'groupOrders'>) => {
    try {
      await joinGroupOrder({
        groupOrderId: orderId,
        vendorId,
        quantity: 10,
      });
      showActionMessage('Joined group order successfully.');
    } catch (error) {
      console.error('Failed to join group order:', error);
      showActionMessage('Failed to join group order.');
    }
  };

  const viewBulkOrderDetails = (orderId: Id<'groupOrders'>) => {
    setSelectedBulkOrderId(orderId);
    const order = bulkOrders?.find(o => o._id === orderId);
    if (order) {
      showActionMessage(`Viewing details for ${order.itemName}.`);
    }
  };

  const createBulkOrder = async () => {
    if (!bulkOrderDraft.itemName || !bulkOrderDraft.supplierId) {
      showActionMessage('Select a supplier and item to create a group order.');
      return;
    }
    try {
      const expiresAt = Date.now() + Math.max(1, bulkOrderDraft.deadlineDays) * 24 * 60 * 60 * 1000;
      const newOrderId = await createGroupOrder({
        initiatorId: vendorId,
        itemName: bulkOrderDraft.itemName,
        category: bulkOrderDraft.category,
        targetQuantity: Math.max(1, bulkOrderDraft.targetQuantity),
        pricePerUnit: Math.max(1, bulkOrderDraft.pricePerUnit),
        supplierId: bulkOrderDraft.supplierId as Id<'suppliers'>,
        location: vendorCity,
        expiresAt,
      });
      setShowBulkOrderCreator(false);
      setActiveTab('bulk');
      setSelectedBulkOrderId(newOrderId as Id<'groupOrders'>);
      setBulkOrderDraft({
        itemName: '',
        category: 'Vegetables',
        targetQuantity: 50,
        pricePerUnit: 0,
        supplierId: '',
        deadlineDays: 5
      });
      showActionMessage('Group order created.');
    } catch (error) {
      console.error('Failed to create group order:', error);
      showActionMessage('Failed to create group order.');
    }
  };

  const applyTemplate = (templateName: string, templateText: string) => {
    setShowNewNegotiation(true);
    setActiveTab('negotiations');
    setNewNegotiation(prev => ({
      ...prev,
      justification: templateText
    }));
    showActionMessage(`${templateName} template loaded into negotiation form.`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'counter': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">🤝 Supplier Negotiation Hub</h2>
            <p className="opacity-90">Negotiate better prices and join bulk purchase groups</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{negotiationList.filter(n => n.status === 'accepted').length}</div>
            <div className="text-sm opacity-90">Successful Negotiations</div>
          </div>
        </div>
      </div>

      {actionMessage && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
          {actionMessage}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'negotiations', label: 'My Negotiations', icon: '💬' },
              { id: 'bulk', label: 'Bulk Orders', icon: '📦' },
              { id: 'templates', label: 'Templates', icon: '📝' },
              { id: 'tips', label: 'Negotiation Tips', icon: '💡' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Negotiations Tab */}
        {activeTab === 'negotiations' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Price Negotiations</h3>
              <button
                onClick={() => setShowNewNegotiation(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                + Start New Negotiation
              </button>
            </div>

            {/* Negotiation Stats */}
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="text-2xl font-bold text-yellow-600">
                  {negotiationList.filter(n => n.status === 'pending').length}
                </div>
                <div className="text-yellow-700 text-sm">Pending</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">
                  {negotiationList.filter(n => n.status === 'counter').length}
                </div>
                <div className="text-blue-700 text-sm">Counter Offers</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-600">
                  {negotiationList.filter(n => n.status === 'accepted').length}
                </div>
                <div className="text-green-700 text-sm">Accepted</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="text-2xl font-bold text-gray-600">
                  {Math.round(
                    negotiationList.filter(n => n.status === 'accepted').reduce((sum, n) => 
                      sum + ((n.currentPrice - n.requestedPrice) / n.currentPrice * 100), 0
                    ) / Math.max(negotiationList.filter(n => n.status === 'accepted').length, 1)
                  )}%
                </div>
                <div className="text-gray-700 text-sm">Avg Savings</div>
              </div>
            </div>

            {/* Negotiations List */}
            <div className="space-y-4">
              {negotiationList.map(negotiation => {
                const supplierInfo = supplierLookup.get(String(negotiation.supplierId));
                return (
                <div key={negotiation._id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold text-gray-900">{negotiation.itemName}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(negotiation.status)}`}>
                          {negotiation.status.charAt(0).toUpperCase() + negotiation.status.slice(1)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">{supplierInfo?.businessName || 'Unknown supplier'}</span>
                        <span className="ml-2">⭐ {(supplierInfo?.trustScore ?? 0).toFixed(1)}</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        {Math.max(0, Math.ceil((negotiation.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)))} days left
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 mb-4">
                    <div>
                      <h5 className="font-medium text-gray-800 mb-2">Price Comparison</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Current Price:</span>
                          <span className="font-medium">₹{negotiation.currentPrice}/{negotiation.unit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Requested Price:</span>
                          <span className="font-medium text-green-600">₹{negotiation.requestedPrice}/{negotiation.unit}</span>
                        </div>
                        {negotiation.counterOffer && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Counter Offer:</span>
                            <span className="font-medium text-blue-600">₹{negotiation.counterOffer}/{negotiation.unit}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-600">Potential Savings:</span>
                          <span className="font-medium text-green-600">
                            ₹{((negotiation.currentPrice - (negotiation.counterOffer || negotiation.requestedPrice)) * negotiation.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-800 mb-2">Order Details</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Quantity:</span>
                          <span className="font-medium">{negotiation.quantity} {negotiation.unit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Value:</span>
                          <span className="font-medium">₹{(negotiation.currentPrice * negotiation.quantity).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h5 className="font-medium text-gray-800 mb-2">Justification</h5>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      {negotiation.justification}
                    </p>
                  </div>

                  {negotiation.counterMessage && (
                    <div className="mb-4">
                      <h5 className="font-medium text-gray-800 mb-2">Supplier Response</h5>
                      <p className="text-sm text-blue-700 bg-blue-50 p-3 rounded-lg">
                        {negotiation.counterMessage}
                      </p>
                    </div>
                  )}

                  {negotiation.status === 'counter' && (
                    <div className="flex space-x-3">
                      <button
                        onClick={() => acceptCounterOffer(negotiation._id)}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                      >
                        Accept Counter Offer
                      </button>
                      <button
                        onClick={() => startCounterNegotiation(negotiation)}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                      >
                        Make New Counter
                      </button>
                    </div>
                  )}
                </div>
              )})}
            </div>
          </div>
        )}

        {/* Bulk Orders Tab */}
        {activeTab === 'bulk' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Bulk Purchase Opportunities</h3>
              <button
                onClick={() => setShowBulkOrderCreator(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                + Create Bulk Order
              </button>
            </div>

            <div className="grid gap-6">
              {bulkOrderList.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-200 p-6 text-sm text-gray-600">
                  No open group orders in your city yet.
                </div>
              )}
              {bulkOrderList.map(order => (
                <div key={order._id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold text-gray-900">{order.itemName}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          order.status === 'open' ? 'bg-green-100 text-green-800' :
                          order.status === 'locked' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        Supplier: {order.supplierName || 'Unknown'}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        ₹{order.pricePerUnit}/{order.category}
                      </div>
                      <div className="text-sm text-gray-500">price per unit</div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 mb-4">
                    <div>
                      <h5 className="font-medium text-gray-800 mb-2">Progress</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Target Quantity:</span>
                          <span className="font-medium">{order.targetQuantity} units</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Current Quantity:</span>
                          <span className="font-medium text-blue-600">{order.currentQuantity} units</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${Math.min((order.currentQuantity / order.targetQuantity) * 100, 100)}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {Math.round((order.currentQuantity / order.targetQuantity) * 100)}% complete
                        </div>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-800 mb-2">Participation</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Current status:</span>
                          <span className="font-medium">{order.status}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Deadline:</span>
                          <span className="font-medium">
                            {Math.max(0, Math.ceil((order.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)))} days
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Category:</span>
                          <span className="font-medium">{order.category}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {order.status === 'open' && (
                    <div className="flex space-x-3">
                      <button
                        onClick={() => joinBulkOrder(order._id)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                      >
                        Join This Order
                      </button>
                      <button
                        onClick={() => viewBulkOrderDetails(order._id)}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                      >
                        View Details
                      </button>
                    </div>
                  )}

                  {order.status === 'completed' && (
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-green-800 text-sm font-medium">
                        Order completed and converted into individual orders.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {selectedBulkOrderId && (
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                {bulkOrderList
                  .filter(order => order._id === selectedBulkOrderId)
                  .map(order => (
                    <div key={order._id}>
                      <h4 className="font-semibold text-blue-900 mb-2">{order.itemName}</h4>
                      <div className="text-sm text-blue-700">
                        Deadline: {new Date(order.expiresAt).toLocaleDateString()} • Category: {order.category} • Supplier: {order.supplierName || 'Unknown'}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Negotiation Templates</h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-3">Volume Discount Request</h4>
                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 mb-4">
                  "I've been consistently ordering [quantity] of [item] for the past [duration]. Given my volume and reliable payment history, I'd like to discuss a volume discount. My current cost is ₹[current price] per [unit], and I'm hoping we can work towards ₹[target price]. This would help me maintain competitive pricing while ensuring steady business for you."
                </div>
                <button
                  onClick={() => applyTemplate(
                    'Volume Discount Request',
                    "I've been consistently ordering [quantity] of [item] for the past [duration]. Given my volume and reliable payment history, I'd like to discuss a volume discount. My current cost is ₹[current price] per [unit], and I'm hoping we can work towards ₹[target price]. This would help me maintain competitive pricing while ensuring steady business for you."
                  )}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                >
                  Use This Template
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-3">Market Price Alignment</h4>
                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 mb-4">
                  "I've noticed that the current market rate for [item] is around ₹[market price] per [unit]. Your current price is ₹[current price]. While I value our partnership and your quality, I'd appreciate if we could align closer to market rates. Could we discuss pricing at ₹[target price] to maintain our business relationship?"
                </div>
                <button
                  onClick={() => applyTemplate(
                    'Market Price Alignment',
                    "I've noticed that the current market rate for [item] is around ₹[market price] per [unit]. Your current price is ₹[current price]. While I value our partnership and your quality, I'd appreciate if we could align closer to market rates. Could we discuss pricing at ₹[target price] to maintain our business relationship?"
                  )}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                >
                  Use This Template
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-3">Long-term Partnership</h4>
                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 mb-4">
                  "I'm planning to expand my business and will significantly increase my orders over the next [timeframe]. To secure a long-term partnership, I'd like to lock in favorable pricing. If you can offer ₹[target price] per [unit], I can commit to minimum monthly orders of [quantity] for [duration]."
                </div>
                <button
                  onClick={() => applyTemplate(
                    'Long-term Partnership',
                    "I'm planning to expand my business and will significantly increase my orders over the next [timeframe]. To secure a long-term partnership, I'd like to lock in favorable pricing. If you can offer ₹[target price] per [unit], I can commit to minimum monthly orders of [quantity] for [duration]."
                  )}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                >
                  Use This Template
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-3">Quality Concerns</h4>
                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 mb-4">
                  "I've been satisfied with your service, but I've noticed some quality variations in recent orders. Given this situation and my loyalty as a customer, I'd appreciate if we could adjust the pricing to ₹[target price] until quality consistency improves. This would be fair for both parties."
                </div>
                <button
                  onClick={() => applyTemplate(
                    'Quality Concerns',
                    "I've been satisfied with your service, but I've noticed some quality variations in recent orders. Given this situation and my loyalty as a customer, I'd appreciate if we could adjust the pricing to ₹[target price] until quality consistency improves. This would be fair for both parties."
                  )}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                >
                  Use This Template
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tips Tab */}
        {activeTab === 'tips' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Negotiation Tips & Best Practices</h3>
            
            <div className="grid gap-6">
              {negotiationTips.map(tipCategory => (
                <div key={tipCategory.category} className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <span className="text-2xl mr-3">{tipCategory.icon}</span>
                    <h4 className="font-semibold text-gray-800">{tipCategory.category}</h4>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {tipCategory.tips.map((tip, index) => (
                      <div key={index} className="flex items-start">
                        <span className="text-blue-500 mr-2 mt-1">•</span>
                        <span className="text-sm text-gray-700">{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Success Stories */}
            <div className="mt-8 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
              <h4 className="font-semibold text-green-800 mb-4">Success Stories</h4>
              <div className="text-sm text-green-700">
                Share your success stories after completing a negotiation or group order.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Negotiation Modal */}
      {showNewNegotiation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Start New Negotiation</h2>
                <button
                  onClick={() => setShowNewNegotiation(false)}
                  className="text-gray-500 hover:text-gray-800 text-xl"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Supplier</label>
                  <select
                    value={newNegotiation.supplierId}
                    onChange={(e) => setNewNegotiation(prev => ({ ...prev, supplierId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers?.map(supplier => (
                      <option key={supplier._id} value={supplier._id}>
                        {supplier.businessName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Item Name</label>
                    <input
                      type="text"
                      value={newNegotiation.itemName}
                      onChange={(e) => setNewNegotiation(prev => ({ ...prev, itemName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Fresh Tomatoes"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                    <select
                      value={newNegotiation.unit}
                      onChange={(e) => setNewNegotiation(prev => ({ ...prev, unit: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="kg">Kilogram</option>
                      <option value="g">Gram</option>
                      <option value="l">Liter</option>
                      <option value="pieces">Pieces</option>
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Price (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newNegotiation.currentPrice}
                      onChange={(e) => setNewNegotiation(prev => ({ ...prev, currentPrice: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Requested Price (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newNegotiation.requestedPrice}
                      onChange={(e) => setNewNegotiation(prev => ({ ...prev, requestedPrice: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={newNegotiation.quantity}
                      onChange={(e) => setNewNegotiation(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Justification</label>
                  <textarea
                    value={newNegotiation.justification}
                    onChange={(e) => setNewNegotiation(prev => ({ ...prev, justification: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={4}
                    placeholder="Explain why you're requesting this price reduction..."
                  />
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => setShowNewNegotiation(false)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitNegotiation}
                    className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
                  >
                    Submit Negotiation
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBulkOrderCreator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Create Bulk Order</h2>
                <button
                  onClick={() => setShowBulkOrderCreator(false)}
                  className="text-gray-500 hover:text-gray-800 text-xl"
                >
                  ✕
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Supplier</label>
                  <select
                    value={bulkOrderDraft.supplierId}
                    onChange={(e) => setBulkOrderDraft(prev => ({ ...prev, supplierId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select supplier</option>
                    {suppliers?.map((supplier) => (
                      <option key={supplier._id} value={supplier._id}>
                        {supplier.businessName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Item Name</label>
                  <input
                    type="text"
                    value={bulkOrderDraft.itemName}
                    onChange={(e) => setBulkOrderDraft(prev => ({ ...prev, itemName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Tomatoes"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Target Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={bulkOrderDraft.targetQuantity}
                    onChange={(e) => setBulkOrderDraft(prev => ({ ...prev, targetQuantity: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price Per Unit (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={bulkOrderDraft.pricePerUnit}
                    onChange={(e) => setBulkOrderDraft(prev => ({ ...prev, pricePerUnit: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={bulkOrderDraft.category}
                    onChange={(e) => setBulkOrderDraft(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Vegetables">Vegetables</option>
                    <option value="Grains">Grains</option>
                    <option value="Spices">Spices</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Oil">Oil</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Deadline (days)</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={bulkOrderDraft.deadlineDays}
                    onChange={(e) => setBulkOrderDraft(prev => ({ ...prev, deadlineDays: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowBulkOrderCreator(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createBulkOrder}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
                >
                  Create Bulk Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
