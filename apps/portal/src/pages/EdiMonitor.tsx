import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { formatDate } from '../utils/date.js';
import { TableLoading, TableEmpty, TableError } from '../components/common/TableStates.js';
import { ChevronDown, Copy } from 'lucide-react';

interface EdiMessage {
  id: string;
  message_type: string; // 850, 855, 856, 810
  partner_id: string;
  status: string; // PENDING, SENT, DELIVERED, FAILED
  raw_content: string;
  created_at: string;
  updated_at: string;
  error_message: string | null;
}

interface PaginatedResponse {
  data: EdiMessage[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  SENT: 'bg-blue-100 text-blue-700',
  DELIVERED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  ACKNOWLEDGED: 'bg-indigo-100 text-indigo-700',
};

const messageTypeLabels: Record<string, string> = {
  '850': 'Purchase Order (850)',
  '855': 'Purchase Order Acknowledgment (855)',
  '856': 'Advance Ship Notice (856)',
  '810': 'Invoice (810)',
};

export function EdiMonitor() {
  const [page, setPage] = useState(1);
  const [messageTypeFilter, setMessageTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [partnerFilter, setPartnerFilter] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<EdiMessage | null>(null);

  const messagesQuery = useQuery({
    queryKey: ['edi-messages', page, messageTypeFilter, statusFilter, partnerFilter],
    queryFn: () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '20',
        ...(messageTypeFilter && { message_type: messageTypeFilter }),
        ...(statusFilter && { status: statusFilter }),
        ...(partnerFilter && { partner_id: partnerFilter }),
      });
      return api.get<PaginatedResponse>(`/edi/messages?${params}`);
    },
  });

  const handleResendMessage = async (messageId: string) => {
    try {
      await api.post(`/edi/messages/${messageId}/resend`, {});
      messagesQuery.refetch();
    } catch (error) {
      alert(`Failed to resend message: ${error}`);
    }
  };

  const handleCopyContent = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Left: Messages List */}
      <div className="col-span-2">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">EDI Message Monitor</h2>

        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <select
            value={messageTypeFilter}
            onChange={(e) => {
              setMessageTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All message types</option>
            {Object.entries(messageTypeLabels).map(([type, label]) => (
              <option key={type} value={type}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All statuses</option>
            {Object.keys(statusColors).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Filter by partner ID..."
            value={partnerFilter}
            onChange={(e) => {
              setPartnerFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {messagesQuery.isLoading ? (
            <TableLoading message="Loading EDI messages..." />
          ) : messagesQuery.isError ? (
            <TableError
              message={messagesQuery.error instanceof Error ? messagesQuery.error.message : 'Unknown error'}
              onRetry={() => messagesQuery.refetch()}
            />
          ) : !messagesQuery.data?.data?.length ? (
            <TableEmpty entity="EDI messages" />
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {messagesQuery.data.data.map((msg) => (
                    <tr key={msg.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {messageTypeLabels[msg.message_type] || msg.message_type}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{msg.partner_id}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            statusColors[msg.status] || 'bg-gray-100'
                          }`}
                        >
                          {msg.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatDate(msg.created_at)}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedMessage(msg)}
                          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {messagesQuery.data.totalPages > 1 && (
                <div className="px-6 py-3 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    Page {messagesQuery.data.page} of {messagesQuery.data.totalPages} ({messagesQuery.data.total} total)
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
                      disabled={page >= messagesQuery.data.totalPages}
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

      {/* Right: Message Detail */}
      {selectedMessage && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col max-h-screen sticky top-6">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Message Details</h3>
            <button
              onClick={() => setSelectedMessage(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <ChevronDown size={20} className="rotate-180" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Header Info */}
            <div>
              <h4 className="text-xs font-semibold text-gray-700 uppercase mb-3">Info</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium">
                    {messageTypeLabels[selectedMessage.message_type] || selectedMessage.message_type}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Partner:</span>
                  <span className="font-medium">{selectedMessage.partner_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      statusColors[selectedMessage.status] || 'bg-gray-100'
                    }`}
                  >
                    {selectedMessage.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span className="text-sm">{formatDate(selectedMessage.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Updated:</span>
                  <span className="text-sm">{formatDate(selectedMessage.updated_at)}</span>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {selectedMessage.error_message && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-xs font-semibold text-red-800 mb-1">Error</p>
                <p className="text-xs text-red-700">{selectedMessage.error_message}</p>
              </div>
            )}

            {/* Raw Content */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-gray-700 uppercase">Raw EDI Content</h4>
                <button
                  onClick={() => handleCopyContent(selectedMessage.raw_content)}
                  className="text-gray-400 hover:text-indigo-600 transition-colors"
                  title="Copy to clipboard"
                >
                  <Copy size={14} />
                </button>
              </div>
              <pre className="bg-gray-50 border border-gray-300 rounded-md p-3 text-xs overflow-x-auto max-h-48 text-gray-700 whitespace-pre-wrap break-words">
                {selectedMessage.raw_content}
              </pre>
            </div>

            {/* Actions */}
            {selectedMessage.status === 'FAILED' && (
              <button
                onClick={() => handleResendMessage(selectedMessage.id)}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Resend Message
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
