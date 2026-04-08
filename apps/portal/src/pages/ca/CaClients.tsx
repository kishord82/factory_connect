import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Wifi, WifiOff, AlertCircle } from 'lucide-react';

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

interface ClientsResponse {
  data: Client[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
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

export function CaClients() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ client_name: '', gst_number: '', email: '' });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['ca-clients', page, search],
    queryFn: () => api.get<ClientsResponse>(`/ca/clients?page=${page}&pageSize=20${search ? `&search=${search}` : ''}`),
  });

  const createMutation = useMutation({
    mutationFn: (clientData: { client_name: string; gst_number: string; email: string }) =>
      api.post('/ca/clients', clientData),
    onSuccess: () => {
      setShowForm(false);
      setFormData({ client_name: '', gst_number: '', email: '' });
      refetch();
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
        />
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading clients...</div>
        ) : isError ? (
          <div className="p-8 text-center text-red-600">Failed to load clients</div>
        ) : !data?.data?.length ? (
          <div className="p-8 text-center text-gray-500">No clients found</div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">GST Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tally</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Health</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Filings</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Overdue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.data.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/ca/clients/${client.id}`)}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{client.client_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{client.gst_number || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{client.email}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {tallyStatusIcon(client.tally_status)}
                        <span className="text-sm capitalize">{client.tally_status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${healthColor(client.health_score)}`}>
                        {client.health_score}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{client.active_filings}</td>
                    <td className="px-6 py-4">
                      {client.overdue_documents > 0 ? (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                          {client.overdue_documents}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.totalPages > 1 && (
              <div className="px-6 py-3 border-t border-gray-200 flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  Page {data.page} of {data.totalPages} ({data.total} total)
                </span>
                <div className="space-x-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= data.totalPages}
                    className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
