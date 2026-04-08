import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { DataTable, Column } from '../../components/common/DataTable.js';

interface DocumentRequest extends Record<string, unknown> {
  id: string;
  client_name: string;
  document_type: string;
  description: string;
  status: 'pending' | 'submitted' | 'verified' | 'rejected' | 'overdue';
  due_date: string;
  verified_date: string | null;
  priority: string;
}

interface Dashboard {
  total_requests: number;
  verified: number;
  pending: number;
  overdue: number;
  verification_rate: number;
}

const statusColor = (status: string) => {
  const colors: Record<string, string> = {
    verified: 'bg-green-100 text-green-700',
    submitted: 'bg-blue-100 text-blue-700',
    pending: 'bg-yellow-100 text-yellow-700',
    rejected: 'bg-red-100 text-red-700',
    overdue: 'bg-red-100 text-red-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};

const priorityColor = (priority: string) => {
  const colors: Record<string, string> = {
    critical: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-blue-100 text-blue-700',
  };
  return colors[priority] || 'bg-gray-100 text-gray-700';
};

const columns: Column<DocumentRequest>[] = [
  {
    key: 'client_name',
    label: 'Client',
    sortable: true,
    render: (row) => (
      <span className="font-medium text-gray-900">{String(row.client_name ?? '—')}</span>
    ),
  },
  {
    key: 'document_type',
    label: 'Type',
    sortable: true,
    render: (row) => (
      <span className="capitalize">{String(row.document_type ?? '—')}</span>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    render: (row) => {
      const s = String(row.status ?? '');
      return (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColor(s)}`}>
          {s || '—'}
        </span>
      );
    },
  },
  {
    key: 'priority',
    label: 'Priority',
    sortable: true,
    render: (row) => {
      const p = String(row.priority ?? '');
      return (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${priorityColor(p)}`}>
          {p || '—'}
        </span>
      );
    },
  },
  {
    key: 'due_date',
    label: 'Due Date',
    sortable: true,
    render: (row) =>
      row.due_date ? new Date(String(row.due_date)).toLocaleDateString() : '—',
  },
  {
    key: 'verified_date',
    label: 'Verified',
    render: (row) =>
      row.verified_date ? new Date(String(row.verified_date)).toLocaleDateString() : '—',
  },
];

export function CaDocuments() {
  const [showBulkRequest, setShowBulkRequest] = useState(false);

  const { data: dashboard } = useQuery({
    queryKey: ['ca-documents-dashboard'],
    queryFn: () => api.get<{ data: Dashboard }>('/ca/documents/dashboard'),
  });

  const db = dashboard?.data;

  const headerActions = (
    <button
      onClick={() => setShowBulkRequest(!showBulkRequest)}
      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
    >
      <Plus className="w-5 h-5" /> New Request
    </button>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Document Requests</h1>

      {/* Dashboard Stats */}
      {db && (
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Requests</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{db.total_requests}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Verified</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{db.verified}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">{db.pending}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Overdue</p>
            <p className="text-3xl font-bold text-red-600 mt-2">{db.overdue}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Verification Rate</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {db.verification_rate.toFixed(1)}%
            </p>
          </div>
        </div>
      )}

      {/* Bulk Request Form */}
      {showBulkRequest && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Bulk Document Request</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option>Select a client...</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Document Type</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option>Invoice</option>
                  <option>Receipt</option>
                  <option>Bank Passbook</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
                <input type="month" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Count</label>
                <input type="number" defaultValue="1" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" defaultChecked className="rounded border-gray-300" />
              <label className="text-sm text-gray-700">Auto-chase if not submitted</label>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                Create Requests
              </button>
              <button
                onClick={() => setShowBulkRequest(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <DataTable<DocumentRequest>
        fetchUrl="/ca/documents/requests"
        columns={columns}
        entityLabel="document requests"
        defaultSort="due_date"
        defaultOrder="asc"
        headerActions={headerActions}
      />
    </div>
  );
}
