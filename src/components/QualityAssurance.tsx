import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

interface QualityMetric {
  id: string;
  name: string;
  value: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  status: 'excellent' | 'good' | 'warning' | 'critical';
}

interface QualityCheck {
  id: string;
  itemName: string;
  checkType: 'visual' | 'freshness' | 'packaging' | 'documentation';
  score: number;
  notes: string;
  inspector: string;
  timestamp: Date;
  images?: string[];
  corrective_actions?: string[];
}

interface QualityReport {
  period: string;
  overallScore: number;
  itemsChecked: number;
  issuesFound: number;
  improvements: string[];
}

interface Props {
  supplierId: Id<'suppliers'>;
}

export default function QualityAssurance({ supplierId }: Props) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'checks' | 'reports' | 'standards'>('dashboard');
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('week');
  const [showNewCheckModal, setShowNewCheckModal] = useState(false);

  // Mock data - in real app, this would come from Convex
  const qualityMetrics: QualityMetric[] = [
    {
      id: 'freshness',
      name: 'Freshness Score',
      value: 4.2,
      target: 4.0,
      unit: '/5',
      trend: 'up',
      status: 'excellent'
    },
    {
      id: 'packaging',
      name: 'Packaging Quality',
      value: 3.8,
      target: 4.0,
      unit: '/5',
      trend: 'down',
      status: 'warning'
    },
    {
      id: 'delivery_time',
      name: 'On-time Delivery',
      value: 92,
      target: 95,
      unit: '%',
      trend: 'stable',
      status: 'good'
    },
    {
      id: 'customer_satisfaction',
      name: 'Customer Satisfaction',
      value: 4.5,
      target: 4.2,
      unit: '/5',
      trend: 'up',
      status: 'excellent'
    }
  ];

  const recentChecks: QualityCheck[] = [
    {
      id: '1',
      itemName: 'Fresh Tomatoes',
      checkType: 'freshness',
      score: 4.5,
      notes: 'Excellent quality, optimal ripeness. No bruising detected.',
      inspector: 'Quality Team',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
    {
      id: '2',
      itemName: 'Basmati Rice',
      checkType: 'packaging',
      score: 3.5,
      notes: 'Good quality rice, but packaging could be improved for better moisture protection.',
      inspector: 'QC Inspector',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      corrective_actions: ['Improve packaging material', 'Add moisture control sachets']
    },
    {
      id: '3',
      itemName: 'Green Vegetables',
      checkType: 'visual',
      score: 4.0,
      notes: 'Fresh appearance, proper color. Minor wilting on some leaves.',
      inspector: 'Field Inspector',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000)
    }
  ];

  const qualityReport: QualityReport = {
    period: 'This Week',
    overallScore: 4.1,
    itemsChecked: 47,
    issuesFound: 8,
    improvements: [
      'Packaging quality improved by 15%',
      'Delivery time reduced by 2 hours',
      'Customer complaints decreased by 30%'
    ]
  };

  const inventory = useQuery(api.inventory.getInventoryBySupplier, { supplierId });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      case 'stable': return '➡️';
      default: return '➡️';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">🛡️ Quality Assurance</h2>
            <p className="opacity-90">Maintain excellence with comprehensive quality monitoring</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{qualityReport.overallScore.toFixed(1)}/5</div>
            <div className="text-sm opacity-90">Overall Quality Score</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'dashboard', label: 'Quality Dashboard', icon: '📊' },
              { id: 'checks', label: 'Quality Checks', icon: '✅' },
              { id: 'reports', label: 'Reports', icon: '📋' },
              { id: 'standards', label: 'Standards', icon: '📏' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="p-6">
            {/* Quality Metrics */}
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              {qualityMetrics.map(metric => (
                <div key={metric.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700">{metric.name}</h3>
                    <span className="text-lg">{getTrendIcon(metric.trend)}</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {metric.value}{metric.unit}
                      </div>
                      <div className="text-xs text-gray-500">
                        Target: {metric.target}{metric.unit}
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(metric.status)}`}>
                      {metric.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Stats */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{qualityReport.itemsChecked}</div>
                    <div className="text-blue-700 text-sm">Items Checked</div>
                    <div className="text-xs text-blue-600 mt-1">{qualityReport.period}</div>
                  </div>
                  <div className="text-3xl text-blue-500">📦</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round(((qualityReport.itemsChecked - qualityReport.issuesFound) / qualityReport.itemsChecked) * 100)}%
                    </div>
                    <div className="text-green-700 text-sm">Pass Rate</div>
                    <div className="text-xs text-green-600 mt-1">+5% from last week</div>
                  </div>
                  <div className="text-3xl text-green-500">✅</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-orange-600">{qualityReport.issuesFound}</div>
                    <div className="text-orange-700 text-sm">Issues Found</div>
                    <div className="text-xs text-orange-600 mt-1">-3 from last week</div>
                  </div>
                  <div className="text-3xl text-orange-500">⚠️</div>
                </div>
              </div>
            </div>

            {/* Recent Quality Checks */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-800">Recent Quality Checks</h3>
                  <button
                    onClick={() => setShowNewCheckModal(true)}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md font-medium transition-colors"
                  >
                    + New Check
                  </button>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200">
                {recentChecks.map(check => (
                  <div key={check.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="text-lg">
                            {check.checkType === 'visual' ? '👁️' :
                             check.checkType === 'freshness' ? '🌱' :
                             check.checkType === 'packaging' ? '📦' : '📄'}
                          </span>
                          <div>
                            <h4 className="font-medium text-gray-900">{check.itemName}</h4>
                            <p className="text-sm text-gray-500 capitalize">{check.checkType} Check</p>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">{check.notes}</p>
                        
                        {check.corrective_actions && (
                          <div className="mb-2">
                            <p className="text-xs font-medium text-gray-700 mb-1">Corrective Actions:</p>
                            <ul className="text-xs text-gray-600 list-disc list-inside">
                              {check.corrective_actions.map((action, idx) => (
                                <li key={idx}>{action}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>By: {check.inspector}</span>
                          <span>{check.timestamp.toLocaleString()}</span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`text-lg font-bold ${
                          check.score >= 4.5 ? 'text-green-600' :
                          check.score >= 4.0 ? 'text-blue-600' :
                          check.score >= 3.5 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {check.score.toFixed(1)}/5
                        </div>
                        <div className="text-xs text-gray-500">Score</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quality Checks Tab */}
        {activeTab === 'checks' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Quality Inspection Checklist</h3>
              <div className="flex space-x-3">
                <select className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500">
                  <option>All Categories</option>
                  <option>Vegetables</option>
                  <option>Fruits</option>
                  <option>Grains</option>
                  <option>Dairy</option>
                </select>
                <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md font-medium transition-colors">
                  Start New Inspection
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-4">Visual Inspection</h4>
                <div className="space-y-3">
                  {[
                    'Color consistency and appearance',
                    'No visible defects or damage',
                    'Proper size and shape',
                    'Surface texture quality'
                  ].map((item, idx) => (
                    <label key={idx} className="flex items-center space-x-3">
                      <input type="checkbox" className="rounded border-gray-300 text-green-600 focus:ring-green-500" />
                      <span className="text-sm text-gray-700">{item}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-4">Freshness Check</h4>
                <div className="space-y-3">
                  {[
                    'Optimal ripeness level',
                    'No signs of wilting',
                    'Proper moisture content',
                    'Absence of spoilage'
                  ].map((item, idx) => (
                    <label key={idx} className="flex items-center space-x-3">
                      <input type="checkbox" className="rounded border-gray-300 text-green-600 focus:ring-green-500" />
                      <span className="text-sm text-gray-700">{item}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-4">Packaging Quality</h4>
                <div className="space-y-3">
                  {[
                    'Intact packaging material',
                    'Proper labeling information',
                    'Clean and hygienic',
                    'Adequate protection'
                  ].map((item, idx) => (
                    <label key={idx} className="flex items-center space-x-3">
                      <input type="checkbox" className="rounded border-gray-300 text-green-600 focus:ring-green-500" />
                      <span className="text-sm text-gray-700">{item}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-4">Documentation</h4>
                <div className="space-y-3">
                  {[
                    'FSSAI compliance certificates',
                    'Batch/lot tracking information',
                    'Supplier verification documents',
                    'Quality test reports'
                  ].map((item, idx) => (
                    <label key={idx} className="flex items-center space-x-3">
                      <input type="checkbox" className="rounded border-gray-300 text-green-600 focus:ring-green-500" />
                      <span className="text-sm text-gray-700">{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Quality Reports</h3>
              <div className="flex space-x-3">
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="quarter">This Quarter</option>
                </select>
                <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md font-medium transition-colors">
                  Export Report
                </button>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <h4 className="font-semibold text-gray-800 mb-4">Quality Summary - {qualityReport.period}</h4>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="text-3xl font-bold text-green-600 mb-2">{qualityReport.overallScore.toFixed(1)}/5</div>
                  <div className="text-gray-600 mb-4">Overall Quality Score</div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Items Checked:</span>
                      <span className="font-medium">{qualityReport.itemsChecked}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Issues Found:</span>
                      <span className="font-medium text-red-600">{qualityReport.issuesFound}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Pass Rate:</span>
                      <span className="font-medium text-green-600">
                        {Math.round(((qualityReport.itemsChecked - qualityReport.issuesFound) / qualityReport.itemsChecked) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h5 className="font-medium text-gray-800 mb-3">Key Improvements</h5>
                  <ul className="space-y-2">
                    {qualityReport.improvements.map((improvement, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-green-500 mr-2">✓</span>
                        <span className="text-sm text-gray-700">{improvement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Quality Trends Chart Placeholder */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-800 mb-4">Quality Trends</h4>
              <div className="h-64 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-4">📈</div>
                  <p className="text-gray-600">Quality trends chart would appear here</p>
                  <p className="text-sm text-gray-500 mt-2">Showing improvement in all metrics over time</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Standards Tab */}
        {activeTab === 'standards' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Quality Standards & Guidelines</h3>
            
            <div className="grid gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-4">🥬 Fresh Produce Standards</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Vegetables</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Visual: Vibrant color, no browning</li>
                      <li>• Texture: Firm and crisp</li>
                      <li>• Packaging: Clean, dry, properly labeled</li>
                      <li>• Temperature: 2-4°C for leafy greens</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Fruits</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Ripeness: Appropriate for variety</li>
                      <li>• Surface: No bruises or cuts</li>
                      <li>• Aroma: Fresh, characteristic smell</li>
                      <li>• Storage: Proper humidity control</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-4">🌾 Grains & Pulses Standards</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Quality Criteria</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Moisture content: 12-14% max</li>
                      <li>• Foreign matter: Less than 2%</li>
                      <li>• Broken grains: Less than 5%</li>
                      <li>• Pest infestation: Zero tolerance</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Storage Requirements</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Clean, dry storage areas</li>
                      <li>• Proper ventilation</li>
                      <li>• Regular pest monitoring</li>
                      <li>• FIFO (First In, First Out) rotation</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-4">📋 Compliance Checklist</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Documentation</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• FSSAI license (current)</li>
                      <li>• Supplier certifications</li>
                      <li>• Quality test reports</li>
                      <li>• Traceability records</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Hygiene Standards</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Clean handling procedures</li>
                      <li>• Sanitized storage areas</li>
                      <li>• Temperature monitoring</li>
                      <li>• Staff hygiene protocols</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
