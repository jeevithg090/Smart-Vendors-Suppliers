import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

interface NegotiationRequest {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierTrustScore: number;
  itemName: string;
  currentPrice: number;
  requestedPrice: number;
  quantity: number;
  unit: string;
  justification: string;
  status: 'pending' | 'accepted' | 'rejected' | 'counter';
  counterOffer?: number;
  counterMessage?: string;
  createdAt: Date;
  expiresAt: Date;
  vendorNote?: string;
  supplierResponse?: string;
}

interface BulkOrder {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  participants: number;
  maxParticipants: number;
  deadline: Date;
  status: 'active' | 'filled' | 'expired';
  category: string;
  organizerId: string;
  organizerName: string;
  estimatedSavings: number;
}

interface NegotiationTip {
  category: string;
  tips: string[];
  icon: string;
}

interface Props {
  vendorId: Id<'vendors'>;
}

export default function SupplierNegotiationHub({ vendorId }: Props) {
  const [activeTab, setActiveTab] = useState<'negotiations' | 'bulk' | 'templates' | 'tips'>('negotiations');
  const [showNewNegotiation, setShowNewNegotiation] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');

  // Mock negotiation data
  const [negotiations, setNegotiations] = useState<NegotiationRequest[]>([
    {
      id: '1',
      supplierId: 'sup1',
      supplierName: 'Green Valley Suppliers',
      supplierTrustScore: 4.2,
      itemName: 'Fresh Tomatoes',
      currentPrice: 35,
      requestedPrice: 30,
      quantity: 50,
      unit: 'kg',
      justification: 'Regular bulk buyer, ordering weekly for 3 months. Looking for long-term partnership rate.',
      status: 'pending',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      vendorNote: 'Quality is important to maintain'
    },
    {
      id: '2',
      supplierId: 'sup2',
      supplierName: 'Spice House Premium',
      supplierTrustScore: 4.5,
      itemName: 'Garam Masala',
      currentPrice: 200,
      requestedPrice: 180,
      quantity: 10,
      unit: 'kg',
      justification: 'Competitor offering at ₹175/kg. Long-term customer loyalty should count.',
      status: 'counter',
      counterOffer: 185,
      counterMessage: 'We can offer ₹185/kg for 15kg+ orders. Premium quality guaranteed.',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      supplierResponse: 'Counter offer with volume requirement'
    },
    {
      id: '3',
      supplierId: 'sup3',
      supplierName: 'Fresh Dairy Co',
      supplierTrustScore: 3.8,
      itemName: 'Fresh Cream',
      currentPrice: 60,
      requestedPrice: 55,
      quantity: 20,
      unit: 'liter',
      justification: 'Seasonal increase seems too high. Historical pricing was ₹55/L.',
      status: 'accepted',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      supplierResponse: 'Agreed for loyal customer'
    }
  ]);

  const bulkOrders: BulkOrder[] = [
    {
      id: '1',
      title: 'Rice & Grains Bulk Purchase',
      description: 'Premium Basmati rice and other grains for restaurants',
      targetAmount: 25000,
      currentAmount: 18500,
      participants: 12,
      maxParticipants: 20,
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      status: 'active',
      category: 'Grains',
      organizerId: 'vendor1',
      organizerName: 'Mumbai Restaurant Hub',
      estimatedSavings: 15
    },
    {
      id: '2',
      title: 'Fresh Vegetable Consortium',
      description: 'Daily fresh vegetables for street food vendors',
      targetAmount: 15000,
      currentAmount: 14200,
      participants: 8,
      maxParticipants: 10,
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      status: 'active',
      category: 'Vegetables',
      organizerId: 'vendor2',
      organizerName: 'Street Food Alliance',
      estimatedSavings: 20
    },
    {
      id: '3',
      title: 'Spice Master Collection',
      description: 'Premium spices and masalas for authentic flavors',
      targetAmount: 30000,
      currentAmount: 30000,
      participants: 15,
      maxParticipants: 15,
      deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      status: 'filled',
      category: 'Spices',
      organizerId: 'vendor3',
      organizerName: 'North Indian Collective',
      estimatedSavings: 25
    }
  ];

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

  const submitNegotiation = () => {
    const negotiation: NegotiationRequest = {
      id: Date.now().toString(),
      supplierId: newNegotiation.supplierId,
      supplierName: suppliers?.find(s => s._id === newNegotiation.supplierId)?.businessName || 'Unknown',
      supplierTrustScore: 4.0,
      itemName: newNegotiation.itemName,
      currentPrice: newNegotiation.currentPrice,
      requestedPrice: newNegotiation.requestedPrice,
      quantity: newNegotiation.quantity,
      unit: newNegotiation.unit,
      justification: newNegotiation.justification,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    };

    setNegotiations(prev => [negotiation, ...prev]);
    setShowNewNegotiation(false);
    setNewNegotiation({
      supplierId: '',
      itemName: '',
      currentPrice: 0,
      requestedPrice: 0,
      quantity: 0,
      unit: 'kg',
      justification: ''
    });
  };

  const acceptCounterOffer = (negotiationId: string) => {
    setNegotiations(prev =>
      prev.map(n =>
        n.id === negotiationId ? { ...n, status: 'accepted' as const } : n
      )
    );
  };

  const joinBulkOrder = (orderId: string) => {
    // In real app, this would call a Convex mutation
    console.log(`Joining bulk order ${orderId}`);
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
            <div className="text-3xl font-bold">{negotiations.filter(n => n.status === 'accepted').length}</div>
            <div className="text-sm opacity-90">Successful Negotiations</div>
          </div>
        </div>
      </div>

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
                  {negotiations.filter(n => n.status === 'pending').length}
                </div>
                <div className="text-yellow-700 text-sm">Pending</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">
                  {negotiations.filter(n => n.status === 'counter').length}
                </div>
                <div className="text-blue-700 text-sm">Counter Offers</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-600">
                  {negotiations.filter(n => n.status === 'accepted').length}
                </div>
                <div className="text-green-700 text-sm">Accepted</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="text-2xl font-bold text-gray-600">
                  {Math.round(
                    negotiations.filter(n => n.status === 'accepted').reduce((sum, n) => 
                      sum + ((n.currentPrice - n.requestedPrice) / n.currentPrice * 100), 0
                    ) / Math.max(negotiations.filter(n => n.status === 'accepted').length, 1)
                  )}%
                </div>
                <div className="text-gray-700 text-sm">Avg Savings</div>
              </div>
            </div>

            {/* Negotiations List */}
            <div className="space-y-4">
              {negotiations.map(negotiation => (
                <div key={negotiation.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold text-gray-900">{negotiation.itemName}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(negotiation.status)}`}>
                          {negotiation.status.charAt(0).toUpperCase() + negotiation.status.slice(1)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">{negotiation.supplierName}</span>
                        <span className="ml-2">⭐ {negotiation.supplierTrustScore.toFixed(1)}</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        {Math.ceil((negotiation.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days left
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
                        onClick={() => acceptCounterOffer(negotiation.id)}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                      >
                        Accept Counter Offer
                      </button>
                      <button className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                        Make New Counter
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bulk Orders Tab */}
        {activeTab === 'bulk' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Bulk Purchase Opportunities</h3>
              <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md font-medium transition-colors">
                + Create Bulk Order
              </button>
            </div>

            <div className="grid gap-6">
              {bulkOrders.map(order => (
                <div key={order.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold text-gray-900">{order.title}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          order.status === 'active' ? 'bg-green-100 text-green-800' :
                          order.status === 'filled' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{order.description}</p>
                      <div className="text-sm text-gray-500">
                        Organized by {order.organizerName}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        {order.estimatedSavings}% savings
                      </div>
                      <div className="text-sm text-gray-500">estimated</div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 mb-4">
                    <div>
                      <h5 className="font-medium text-gray-800 mb-2">Progress</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Target Amount:</span>
                          <span className="font-medium">₹{order.targetAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Current Amount:</span>
                          <span className="font-medium text-blue-600">₹{order.currentAmount.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${Math.min((order.currentAmount / order.targetAmount) * 100, 100)}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {Math.round((order.currentAmount / order.targetAmount) * 100)}% complete
                        </div>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-800 mb-2">Participation</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Participants:</span>
                          <span className="font-medium">{order.participants}/{order.maxParticipants}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Deadline:</span>
                          <span className="font-medium">
                            {Math.ceil((order.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Category:</span>
                          <span className="font-medium">{order.category}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {order.status === 'active' && (
                    <div className="flex space-x-3">
                      <button
                        onClick={() => joinBulkOrder(order.id)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                      >
                        Join This Order
                      </button>
                      <button className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                        View Details
                      </button>
                    </div>
                  )}

                  {order.status === 'filled' && (
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-green-800 text-sm font-medium">
                        ✅ Order completed! Participants saved an average of {order.estimatedSavings}% on bulk purchases.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
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
                <button className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                  Use This Template
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-3">Market Price Alignment</h4>
                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 mb-4">
                  "I've noticed that the current market rate for [item] is around ₹[market price] per [unit]. Your current price is ₹[current price]. While I value our partnership and your quality, I'd appreciate if we could align closer to market rates. Could we discuss pricing at ₹[target price] to maintain our business relationship?"
                </div>
                <button className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                  Use This Template
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-3">Long-term Partnership</h4>
                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 mb-4">
                  "I'm planning to expand my business and will significantly increase my orders over the next [timeframe]. To secure a long-term partnership, I'd like to lock in favorable pricing. If you can offer ₹[target price] per [unit], I can commit to minimum monthly orders of [quantity] for [duration]."
                </div>
                <button className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                  Use This Template
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-3">Quality Concerns</h4>
                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 mb-4">
                  "I've been satisfied with your service, but I've noticed some quality variations in recent orders. Given this situation and my loyalty as a customer, I'd appreciate if we could adjust the pricing to ₹[target price] until quality consistency improves. This would be fair for both parties."
                </div>
                <button className="text-blue-600 hover:text-blue-800 font-medium text-sm">
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
              <h4 className="font-semibold text-green-800 mb-4">🎉 Success Stories</h4>
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg">
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Raj Kumar</strong> saved ₹5,000/month by negotiating a 15% volume discount with his vegetable supplier after committing to weekly orders.
                  </p>
                  <div className="text-xs text-green-600">Saved 15% through volume commitment</div>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Priya Sharma</strong> joined a bulk rice purchase group and reduced her grain costs by 20% while ensuring premium quality.
                  </p>
                  <div className="text-xs text-green-600">Saved 20% through group buying</div>
                </div>
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
    </div>
  );
}
