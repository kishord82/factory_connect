import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { useAuth, isAdmin } from '../lib/auth.js';
import { useState } from 'react';
import { formatDate } from '../utils/date.js';
import { DataTable } from '../components/common/DataTable.js';
import type { Column } from '../components/common/DataTable.js';

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

const factoryColumns: Column<Factory>[] = [
  {
    key: 'factory_name',
    label: 'Factory Name',
    sortable: true,
    render: (row) => <span className="font-medium text-gray-900">{row.factory_name as string}</span>,
  },
  {
    key: 'slug',
    label: 'Slug',
    sortable: true,
    render: (row) => <span className="text-gray-500">{row.slug as string}</span>,
  },
  {
    key: 'erp_type',
    label: 'ERP Type',
    render: (row) => (
      <span className="text-gray-500">
        {erpTypeLabels[row.erp_type as number] ?? `Type ${row.erp_type as number}`}
      </span>
    ),
  },
  {
    key: 'contact_email',
    label: 'Contact Email',
    render: (row) => <span className="text-gray-500">{row.contact_email as string}</span>,
  },
  {
    key: 'created_at',
    label: 'Created',
    sortable: true,
    render: (row) => <span className="text-gray-500">{formatDate(row.created_at as string)}</span>,
  },
];

export function Admin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'factories' | 'flags'>('factories');

  const toggleFlag = useMutation({
    mutationFn: (args: { flag: string; enabled: boolean }) =>
      api.put(`/admin/feature-flags/${args.flag}`, { is_enabled: args.enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/admin/feature-flags'] }),
  });

  const flagColumns: Column<FeatureFlag>[] = [
    {
      key: 'flag_name',
      label: 'Flag Name',
      sortable: true,
      render: (row) => <code className="text-sm font-mono text-gray-900">{row.flag_name as string}</code>,
    },
    {
      key: 'is_enabled',
      label: 'Status',
      sortable: true,
      render: (row) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          row.is_enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {row.is_enabled ? 'ON' : 'OFF'}
        </span>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      render: (row) => <span className="text-gray-500">{(row.description as string | null) ?? '—'}</span>,
    },
    {
      key: 'updated_at',
      label: 'Updated',
      sortable: true,
      render: (row) => <span className="text-gray-500">{formatDate(row.updated_at as string)}</span>,
    },
    {
      key: 'flag_name',
      label: 'Action',
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFlag.mutate({ flag: row.flag_name as string, enabled: !(row.is_enabled as boolean) });
          }}
          disabled={toggleFlag.isPending}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            row.is_enabled
              ? 'bg-red-50 text-red-600 hover:bg-red-100'
              : 'bg-green-50 text-green-600 hover:bg-green-100'
          } disabled:opacity-50`}
        >
          {row.is_enabled ? 'Disable' : 'Enable'}
        </button>
      ),
    },
  ];

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
          Factories
        </button>
        <button
          onClick={() => setActiveTab('flags')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'flags' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Feature Flags
        </button>
      </div>

      {/* Factories tab */}
      {activeTab === 'factories' && (
        <DataTable<Factory>
          fetchUrl="/admin/factories"
          columns={factoryColumns}
          entityLabel="factories"
          defaultSort="created_at"
          defaultOrder="desc"
        />
      )}

      {/* Feature Flags tab */}
      {activeTab === 'flags' && (
        <DataTable<FeatureFlag>
          fetchUrl="/admin/feature-flags"
          columns={flagColumns}
          entityLabel="feature flags"
          defaultSort="flag_name"
          defaultOrder="asc"
        />
      )}
    </div>
  );
}
