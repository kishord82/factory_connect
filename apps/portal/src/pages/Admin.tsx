import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { useAuth, isAdmin } from '../lib/auth.js';
import { useState } from 'react';
import { formatDate } from '../utils/date.js';

interface Factory {
  id: string;
  factory_name: string;
  slug: string;
  erp_type: number;
  status: string;
  contact_email: string;
  created_at: string;
}

interface FeatureFlag {
  flag_name: string;
  is_enabled: boolean;
  description: string | null;
  updated_at: string;
}

const erpTypeLabels: Record<number, string> = {
  1: 'Tally Prime',
  2: 'Zoho Books',
  3: 'SAP Business One',
};

export function Admin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'factories' | 'flags'>('factories');

  const factoriesQuery = useQuery({
    queryKey: ['admin', 'factories'],
    queryFn: () => api.get<{ data: Factory[]; total: number }>('/admin/factories?page=1&pageSize=50'),
    enabled: isAdmin(user),
  });

  const flagsQuery = useQuery({
    queryKey: ['admin', 'flags'],
    queryFn: () => api.get<{ data: FeatureFlag[] }>('/admin/feature-flags'),
    enabled: isAdmin(user),
  });

  const toggleFlag = useMutation({
    mutationFn: (args: { flag: string; enabled: boolean }) =>
      api.put(`/admin/feature-flags/${args.flag}`, { is_enabled: args.enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'flags'] }),
  });

  if (!isAdmin(user)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-xl font-semibold text-red-600">Access Denied</p>
          <p className="text-sm text-gray-500 mt-2">This page is only available to Platform Admins (fc_admin role).</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Admin Panel</h2>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('factories')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'factories' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Factories ({factoriesQuery.data?.total ?? 0})
        </button>
        <button
          onClick={() => setActiveTab('flags')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'flags' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Feature Flags ({flagsQuery.data?.data?.length ?? 0})
        </button>
      </div>

      {/* Factories tab */}
      {activeTab === 'factories' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {factoriesQuery.isLoading ? (
            <div className="p-8 text-center text-gray-500 animate-pulse">Loading factories...</div>
          ) : factoriesQuery.isError ? (
            <div className="p-8 text-center text-red-500">Failed to load factories: {factoriesQuery.error instanceof Error ? factoriesQuery.error.message : 'Unknown error'}</div>
          ) : !factoriesQuery.data?.data?.length ? (
            <div className="p-8 text-center text-gray-400">No factories found</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Factory Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ERP Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {factoriesQuery.data.data.map((factory) => (
                  <tr key={factory.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{factory.factory_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{factory.slug}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{erpTypeLabels[factory.erp_type] || `Type ${factory.erp_type}`}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{factory.contact_email}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(factory.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Feature Flags tab */}
      {activeTab === 'flags' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {flagsQuery.isLoading ? (
            <div className="p-8 text-center text-gray-500 animate-pulse">Loading feature flags...</div>
          ) : flagsQuery.isError ? (
            <div className="p-8 text-center text-red-500">Failed to load flags: {flagsQuery.error instanceof Error ? flagsQuery.error.message : 'Unknown error'}</div>
          ) : !flagsQuery.data?.data?.length ? (
            <div className="p-8 text-center text-gray-400">No feature flags configured</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Flag Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Updated</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {flagsQuery.data.data.map((flag) => (
                  <tr key={flag.flag_name} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 font-mono">{flag.flag_name}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        flag.is_enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {flag.is_enabled ? 'ON' : 'OFF'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{flag.description || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(flag.updated_at)}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleFlag.mutate({ flag: flag.flag_name, enabled: !flag.is_enabled })}
                        disabled={toggleFlag.isPending}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                          flag.is_enabled
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                        } disabled:opacity-50`}
                      >
                        {flag.is_enabled ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
