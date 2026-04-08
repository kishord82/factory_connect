import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { useState } from 'react';
import { Save, AlertCircle } from 'lucide-react';

interface FirmSettings {
  firm_name: string;
  gst_number: string;
  pan_number: string;
  firm_type: string;
  phone_number: string;
  email: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
}

interface Subscription {
  tier: string;
  status: string;
  clients_limit: number;
  clients_used: number;
  current_period_start: string;
  current_period_end: string;
}

export function CaSettings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<FirmSettings>>({});

  const { data: firm } = useQuery({
    queryKey: ['ca-firm-settings'],
    queryFn: () => api.get<{ data: FirmSettings }>('/ca/firms/me'),
  });

  const { data: subscription } = useQuery({
    queryKey: ['ca-subscription'],
    queryFn: () => api.get<{ data: Subscription }>('/ca/firms/me/subscription'),
  });

  const sub = subscription?.data;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Settings</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {['profile', 'team', 'integration', 'subscription', 'features'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Firm Profile</h2>
            {!editMode ? (
              <button
                onClick={() => {
                  setEditMode(true);
                  setFormData(firm?.data || {});
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
                  <Save className="w-4 h-4" /> Save
                </button>
                <button
                  onClick={() => setEditMode(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {editMode ? (
            <form className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Firm Name</label>
                  <input
                    type="text"
                    value={formData.firm_name || ''}
                    onChange={(e) => setFormData({ ...formData, firm_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">GST Number</label>
                  <input
                    type="text"
                    value={formData.gst_number || ''}
                    onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">PAN</label>
                  <input
                    type="text"
                    value={formData.pan_number || ''}
                    onChange={(e) => setFormData({ ...formData, pan_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Firm Type</label>
                  <select
                    value={formData.firm_type || ''}
                    onChange={(e) => setFormData({ ...formData, firm_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
                  >
                    <option>Individual</option>
                    <option>Partnership</option>
                    <option>LLP</option>
                    <option>Pvt Ltd</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
                />
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                  <input
                    type="text"
                    value={formData.state || ''}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
                  <input
                    type="text"
                    value={formData.postal_code || ''}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {firm?.data && Object.entries(firm.data).map(([key, value]) => (
                <div key={key} className="flex justify-between py-2 border-b last:border-0">
                  <span className="text-sm font-medium text-gray-500 capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="text-sm text-gray-900">{value as string}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Subscription Tab */}
      {activeTab === 'subscription' && (
        <div className="space-y-6">
          {sub && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Current Subscription</h2>
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Plan</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1 capitalize">{sub.tier}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="text-2xl font-bold text-green-600 mt-1 capitalize">{sub.status}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 mb-2">Clients Usage</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width:
                        sub.clients_limit > 0
                          ? `${(sub.clients_used / sub.clients_limit) * 100}%`
                          : '0%',
                    }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600">
                  {sub.clients_used} of {sub.clients_limit === -1 ? '∞' : sub.clients_limit} clients
                </p>
              </div>
              <div className="space-y-2 mb-6">
                <p className="text-sm text-gray-500">
                  Period: {new Date(sub.current_period_start).toLocaleDateString()} to{' '}
                  {new Date(sub.current_period_end).toLocaleDateString()}
                </p>
              </div>
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                View All Plans
              </button>
            </div>
          )}
        </div>
      )}

      {/* Features Tab */}
      {activeTab === 'features' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Feature Access</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700">
              Some features are restricted based on your subscription tier. Upgrade to unlock more features.
            </p>
          </div>
          <div className="space-y-3">
            {[
              { name: 'Basic Compliance Tracking', available: true },
              { name: 'GST Filing', available: true },
              { name: 'TDS Management', available: true },
              { name: 'WhatsApp Integration', available: sub?.tier !== 'trial' },
              { name: 'Auto Reconciliation', available: sub?.tier !== 'trial' },
              { name: 'Advanced Analytics', available: sub?.tier === 'enterprise' },
              { name: 'Priority Support', available: sub?.tier === 'enterprise' },
            ].map((feature, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
                <span className="text-gray-700">{feature.name}</span>
                {feature.available ? (
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                    ✓ Included
                  </span>
                ) : (
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                    Locked
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Tab */}
      {activeTab === 'team' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Team Members</h2>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 mb-6">
            + Invite Member
          </button>
          <div className="text-center py-12 text-gray-500">
            <p>No team members added yet</p>
          </div>
        </div>
      )}

      {/* Integration Tab */}
      {activeTab === 'integration' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Integrations</h2>
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">WhatsApp</p>
                <p className="text-sm text-gray-500">Client communication</p>
              </div>
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                Configure
              </button>
            </div>
            <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Tally</p>
                <p className="text-sm text-gray-500">Accounting data sync</p>
              </div>
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                Configure
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
