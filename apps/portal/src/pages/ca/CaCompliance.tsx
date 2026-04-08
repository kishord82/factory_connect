import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { useState } from 'react';
import { Filter } from 'lucide-react';
import { DataTable } from '../../components/common/DataTable.js';
import type { Column } from '../../components/common/DataTable.js';

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

interface ExceptionsResponse {
  data: Exception[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const filingStatusColor = (status: string | undefined) => {
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

const filingColumns: Column<Filing>[] = [
  {
    key: 'client_name',
    label: 'Client',
    sortable: true,
    render: (row) => <span className="font-medium text-gray-900">{(row.client_name as string) ?? '—'}</span>,
  },
  {
    key: 'type',
    label: 'Type',
    sortable: true,
    render: (row) => <span className="text-gray-500 uppercase">{(row.type as string) ?? '—'}</span>,
  },
  {
    key: 'period',
    label: 'Period',
    render: (row) => <span className="text-gray-500">{(row.period as string) ?? '—'}</span>,
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    render: (row) => (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${filingStatusColor(row.status as string)}`}>
        {(row.status as string) ?? '—'}
      </span>
    ),
  },
  {
    key: 'due_date',
    label: 'Due Date',
    sortable: true,
    render: (row) => (
      <span className="text-gray-500">
        {row.due_date ? new Date(row.due_date as string).toLocaleDateString() : '—'}
      </span>
    ),
  },
  {
    key: 'document_count',
    label: 'Documents',
    render: (row) => <span className="text-gray-900">{(row.document_count as number) ?? 0}</span>,
  },
];

export function CaCompliance() {
  const [filingType, setFilingType] = useState('');
  const [exceptionPage, setExceptionPage] = useState(1);

  const { data: exceptions } = useQuery({
    queryKey: ['ca-exceptions', exceptionPage],
    queryFn: () => api.get<ExceptionsResponse>(`/ca/compliance/exceptions?page=${exceptionPage}&pageSize=10`),
  });

  const extraParams: Record<string, string> = {};
  if (filingType) extraParams['type'] = filingType;

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
              onChange={(e) => setFilingType(e.target.value)}
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

        <DataTable<Filing>
          key={filingType}
          fetchUrl="/ca/compliance/filings"
          columns={filingColumns}
          entityLabel="filings"
          defaultSort="due_date"
          defaultOrder="asc"
          extraParams={extraParams}
        />
      </div>

      {/* Exceptions Section — card list (not a table) */}
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
                        <span className="px-2 py-1 text-xs font-medium rounded-full capitalize">
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
