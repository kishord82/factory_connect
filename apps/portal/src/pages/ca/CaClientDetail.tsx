import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { AlertCircle, TrendingUp, Clock, CheckCircle } from 'lucide-react';

interface ClientDetail {
  id: string;
  firm_id: string;
  client_name: string;
  gst_number: string;
  email: string;
  phone_number: string;
  health_score: number;
  compliance_status: Record<string, string>;
  last_sync: string;
}

export function CaClientDetail() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['ca-client', id],
    queryFn: () => api.get<{ data: ClientDetail }>(`/ca/clients/${id}`),
  });

  const { data: healthData } = useQuery({
    queryKey: ['ca-client-health', id],
    queryFn: () => api.get(`/ca/clients/${id}/health`),
  });

  const client = data?.data;

  if (isLoading) {
    return <div className="text-center py-8">Loading client...</div>;
  }

  if (isError || !client) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-red-600" />
        <p className="text-red-700">Failed to load client details</p>
      </div>
    );
  }

  const healthColor = client.health_score >= 80 ? 'text-green-600' : client.health_score >= 60 ? 'text-yellow-600' : 'text-red-600';
  const complianceColors: Record<string, string> = {
    compliant: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    non_compliant: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{client.client_name}</h1>
          <p className="text-gray-500 mt-1">{client.gst_number}</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          Edit Details
        </button>
      </div>

      {/* Health Score Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Client Health Score</h2>
            <p className={`text-5xl font-bold ${healthColor}`}>{client.health_score}%</p>
          </div>
          <div className="w-32 h-32 relative">
            <svg className="transform -rotate-90 w-full h-full">
              <circle cx="64" cy="64" r="60" fill="none" stroke="#e5e7eb" strokeWidth="8" />
              <circle
                cx="64"
                cy="64"
                r="60"
                fill="none"
                stroke={client.health_score >= 80 ? '#16a34a' : client.health_score >= 60 ? '#eab308' : '#dc2626'}
                strokeWidth="8"
                strokeDasharray={`${(client.health_score / 100) * 376.99} 376.99`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-gray-900">
              {client.health_score}%
            </div>
          </div>
        </div>
      </div>

      {/* Compliance Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Compliance Status</h2>
        <div className="grid grid-cols-4 gap-4">
          {Object.entries(client.compliance_status).map(([type, status]) => (
            <div key={type} className={`rounded-lg p-4 ${complianceColors[status] || 'bg-gray-100 text-gray-700'}`}>
              <p className="text-sm font-medium capitalize">{type.replace('_', ' ')}</p>
              <p className="text-lg font-semibold mt-2 capitalize">{status.replace('_', ' ')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Health Trend */}
      {healthData ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Health Score Trend</h2>
          <div className="space-y-2">
            {((healthData as unknown as { data?: { history?: Array<{ date: string; score: number }> } }).data?.history || []).map((item, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm text-gray-600">
                  {new Date(item.date).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${item.score}%` }}></div>
                  </div>
                  <span className="font-medium text-gray-900">{item.score}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Contact Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="text-gray-900 font-medium mt-1">{client.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <p className="text-gray-900 font-medium mt-1">{client.phone_number || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Last Sync</p>
            <p className="text-gray-900 font-medium mt-1">
              {new Date(client.last_sync).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Member Since</p>
            <p className="text-gray-900 font-medium mt-1">
              {new Date(client.firm_id).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-3">
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Request Documents
          </button>
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> Start Filing
          </button>
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> View Analytics
          </button>
        </div>
      </div>
    </div>
  );
}
