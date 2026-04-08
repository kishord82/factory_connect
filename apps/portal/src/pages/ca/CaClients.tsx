import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { DataTable } from '../../components/common/DataTable.js';
import type { Column } from '../../components/common/DataTable.js';

interface Client {
  id: string;
  client_name: string;
  gst_number: string;
  email: string;
  tally_status: 'connected' | 'pending' | 'error';
  health_score: number;
  active_filings: number;
  overdue_documents: number;
  created_at: string;
}

const healthColor = (score: number) => {
  if (score >= 80) return 'bg-green-100 text-green-700';
  if (score >= 60) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
};

const tallyStatusIcon = (status: string) => {
  if (status === 'connected') return <Wifi className="w-4 h-4 text-green-600" />;
  if (status === 'error') return <WifiOff className="w-4 h-4 text-red-600" />;
  return <AlertCircle className="w-4 h-4 text-yellow-600" />;
};

const columns: Column<Client>[] = [
  {
    key: 'client_name',
    label: 'Client Name',
    sortable: true,
    render: (row) => <span className="font-medium text-gray-900">{row.client_name as string}</span>,
  },
  {
    key: 'gst_number',
    label: 'GST Number',
    render: (row) => <span className="text-gray-500">{(row.gst_number as string) || '—'}</span>,
  },
  {
    key: 'email',
    label: 'Email',
    sortable: true,
    render: (row) => <span className="text-gray-500">{row.email as string}</span>,
  },
  {
    key: 'tally_status',
    label: 'Tally',
    render: (row) => (
      <div className="flex items-center gap-2">
        {tallyStatusIcon(row.tally_status as string)}
        <span className="text-sm capitalize">{row.tally_status as string}</span>
      </div>
    ),
  },
  {
    key: 'health_score',
    label: 'Health',
    sortable: true,
    render: (row) => (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${healthColor(row.health_score as number)}`}>
        {row.health_score as number}%
      </span>
    ),
  },
  {
    key: 'active_filings',
    label: 'Filings',
    sortable: true,
    render: (row) => <span className="text-gray-900">{row.active_filings as number}</span>,
  },
  {
    key: 'overdue_documents',
    label: 'Overdue',
    sortable: true,
    render: (row) => {
      const count = row.overdue_documents as number;
      return count > 0 ? (
        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">{count}</span>
      ) : (
        <span className="text-sm text-gray-500">0</span>
      );
    },
  },
];

export function CaClients() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ client_name: '', gst_number: '', email: '' });
  const [tableKey, setTableKey] = useState(0);

  const createMutation = useMutation({
    mutationFn: (clientData: { client_name: string; gst_number: string; email: string }) =>
      api.post('/ca/clients', clientData),
    onSuccess: () => {
      setShowForm(false);
      setFormData({ client_name: '', gst_number: '', email: '' });
      setTableKey(k => k + 1); // remount DataTable to refresh
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Clients</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Add Client
        </button>
      </div>

      {/* Add Client Form */}
      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Add New Client</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
              <input
                type="text"
                required
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                placeholder="e.g., Acme Corp"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GST Number (optional)</label>
              <input
                type="text"
                value={formData.gst_number}
                onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                placeholder="e.g., 27AACCT9999X1Z0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                placeholder="e.g., contact@acme.com"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {createMutation.isPending ? 'Adding...' : 'Add Client'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <DataTable<Client>
        key={tableKey}
        fetchUrl="/ca/clients"
        columns={columns}
        entityLabel="clients"
        defaultSort="client_name"
        defaultOrder="asc"
        onRowClick={(row) => navigate(`/ca/clients/${row.id as string}`)}
      />
    </div>
  );
}
