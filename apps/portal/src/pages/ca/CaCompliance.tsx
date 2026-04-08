import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { useState } from 'react';
import { Filter } from 'lucide-react';

interface Filing {
  id: string;
  client_id: string;
  client_name: string;
  type: string;
  subtype: string;
  period: string;
  status: string;
  due_date: string;
  filed_date: string | null;
  document_count: number;
  exceptions: string[];
}

interface Exception {
  id: string;
  client_id: string;
  client_name: string;
  severity: string;
  type: string;
  description: string;
  due_date: string;
  assigned_to: string | null;
  status: string;
}

interface FilingsResponse {
  data: Filing[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface ExceptionsResponse {
  data: Exception[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const statusColor = (status: string | undefined) => {
  const colors: Record<string, string> = {
    filed: 'bg-green-100 text-green-700',
    in_progress: 'bg-blue-100 text-blue-700',
    pending: 'bg-yellow-100 text-yellow-700',
    rejected: 'bg-red-100 text-red-700',
    overdue: 'bg-red-100 text-red-700',
  };
  return colors[status ?? ''] || 'bg-gray-100 text-gray-700';
};

const severityColor = (severity: string | undefined) => {
  const colors: Record<string, string> = {
    critical: 'text-red-600 bg-red-50 border-red-200',
    high: 'text-orange-600 bg-orange-50 border-orange-200',
    medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    low: 'text-blue-600 bg-blue-50 border-blue-200',
  };
  return colors[severity ?? ''] || 'text-gray-600 bg-gray-50 border-gray-200';
};

export function CaCompliance() {
  const [filingPage, setFilingPage] = useState(1);
  const [exceptionPage, setExceptionPage] = useState(1);
  const [filingType, setFilingType] = useState('');

  const { data: filings, isLoading: loadingFilings } = useQuery({
    queryKey: ['ca-filings', filingPage, filingType],
    queryFn: () =>
      api.get<FilingsResponse>(
        `/ca/compliance/filings?page=${filingPage}&pageSize=10${filingType ? `&type=${filingType}` : ''}`,
      ),
  });

  const { data: exceptions } = useQuery({
    queryKey: ['ca-exceptions', exceptionPage],
    queryFn: () => api.get<ExceptionsResponse>(`/ca/compliance/exceptions?page=${exceptionPage}&pageSize=10`),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Compliance</h1>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          + New Filing
        </button>
      </div>

      {/* Filings Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Filings</h2>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filingType}
              onChange={(e) => {
                setFilingType(e.target.value);
                setFilingPage(1);
              }}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All Types</option>
              <option value="gst">GST</option>
              <option value="tds">TDS</option>
              <option value="mca">MCA</option>
              <option value="income_tax">Income Tax</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {loadingFilings ? (
            <div className="p-8 text-center text-gray-500">Loading filings...</div>
          ) : !filings?.data?.length ? (
            <div className="p-8 text-center text-gray-500">No filings found</div>
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documents</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filings.data.map((filing) => (
                    <tr key={filing.id} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{filing.client_name ?? '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 uppercase">{filing.type ?? '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{filing.period ?? '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColor(filing.status)}`}>
                          {filing.status ?? '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{filing.due_date ? new Date(filing.due_date).toLocaleDateString() : '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{filing.document_count ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filings.totalPages > 1 && (
                <div className="px-6 py-3 border-t border-gray-200 flex justify-between">
                  <span className="text-sm text-gray-500">
                    Page {filings.page} of {filings.totalPages}
                  </span>
                  <div className="space-x-2">
                    <button
                      onClick={() => setFilingPage(Math.max(1, filingPage - 1))}
                      disabled={filingPage === 1}
                      className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setFilingPage(filingPage + 1)}
                      disabled={filingPage >= filings.totalPages}
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

      {/* Exceptions Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Exceptions Queue</h2>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {!exceptions?.data?.length ? (
            <div className="p-8 text-center text-gray-500">No exceptions</div>
          ) : (
            <>
              <div className="divide-y divide-gray-200">
                {exceptions.data.map((exc) => (
                  <div key={exc.id} className={`p-4 border-l-4 ${severityColor(exc.severity)}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{exc.description ?? '—'}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {exc.client_name ?? '—'} • Due: {exc.due_date ? new Date(exc.due_date).toLocaleDateString() : '—'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize`}>
                          {exc.severity ?? '—'}
                        </span>
                        <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                          Assign →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {exceptions.totalPages > 1 && (
                <div className="px-6 py-3 border-t border-gray-200 flex justify-between">
                  <span className="text-sm text-gray-500">
                    Page {exceptions.page} of {exceptions.totalPages}
                  </span>
                  <div className="space-x-2">
                    <button
                      onClick={() => setExceptionPage(Math.max(1, exceptionPage - 1))}
                      disabled={exceptionPage === 1}
                      className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setExceptionPage(exceptionPage + 1)}
                      disabled={exceptionPage >= exceptions.totalPages}
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
