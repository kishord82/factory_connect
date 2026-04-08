import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { useState } from 'react';
import { Plus, Search } from 'lucide-react';

interface DocumentRequest {
  id: string;
  client_id: string;
  client_name: string;
  document_type: string;
  description: string;
  status: 'pending' | 'submitted' | 'verified' | 'rejected' | 'overdue';
  due_date: string;
  verified_date: string | null;
  priority: string;
  created_at: string;
}

interface RequestsResponse {
  data: DocumentRequest[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface Dashboard {
  total_requests: number;
  verified: number;
  pending: number;
  overdue: number;
  verification_rate: number;
  status_breakdown: Array<{ status: string; count: number; percentage: number }>;
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

export function CaDocuments() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showBulkRequest, setShowBulkRequest] = useState(false);

  const { data: dashboard } = useQuery({
    queryKey: ['ca-documents-dashboard'],
    queryFn: () => api.get<{ data: Dashboard }>('/ca/documents/dashboard'),
  });

  const { data: requests, isLoading } = useQuery({
    queryKey: ['ca-document-requests', page, search],
    queryFn: () =>
      api.get<RequestsResponse>(
        `/ca/documents/requests?page=${page}&pageSize=10${search ? `&type=${search}` : ''}`,
      ),
  });

  const db = dashboard?.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Document Requests</h1>
        <button
          onClick={() => setShowBulkRequest(!showBulkRequest)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> New Request
        </button>
      </div>

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
            <p className="text-3xl font-bold text-blue-600 mt-2">{db.verification_rate.toFixed(1)}%</p>
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
                  <option>Acme Corp</option>
                  <option>Ravi Trading</option>
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
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-gray-300"
              />
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

      {/* Requests List */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by type..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading requests...</div>
          ) : !requests?.data?.length ? (
            <div className="p-8 text-center text-gray-500">No document requests</div>
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Verified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {requests.data.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{req.client_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 capitalize">{req.document_type}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColor(req.status)}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${priorityColor(req.priority)}`}>
                          {req.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{new Date(req.due_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {req.verified_date ? new Date(req.verified_date).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {requests.totalPages > 1 && (
                <div className="px-6 py-3 border-t border-gray-200 flex justify-between">
                  <span className="text-sm text-gray-500">
                    Page {requests.page} of {requests.totalPages}
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
                      disabled={page >= requests.totalPages}
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
    </div>
  );
}
