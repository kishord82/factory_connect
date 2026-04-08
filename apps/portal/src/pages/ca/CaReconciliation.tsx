import { useState } from 'react';
import { Plus } from 'lucide-react';
import { DataTable, Column } from '../../components/common/DataTable.js';

interface ReconSession extends Record<string, unknown> {
  id: string;
  client_name: string;
  type: 'bank' | 'gstr2b';
  period: string;
  status: string;
  match_rate: number;
  matched_items: number;
  unmatched_items: number;
}

const statusColor = (status: string | undefined) => {
  const colors: Record<string, string> = {
    completed: 'bg-green-100 text-green-700',
    in_progress: 'bg-blue-100 text-blue-700',
    pending: 'bg-yellow-100 text-yellow-700',
  };
  return colors[status ?? ''] || 'bg-gray-100 text-gray-700';
};

const columns: Column<ReconSession>[] = [
  {
    key: 'client_name',
    label: 'Client',
    sortable: true,
    render: (row) => (
      <span className="font-medium text-gray-900">{String(row.client_name ?? '—')}</span>
    ),
  },
  {
    key: 'type',
    label: 'Source',
    sortable: true,
    render: (row) => (
      <span className="uppercase text-sm text-gray-500">{String(row.type ?? '—')}</span>
    ),
  },
  {
    key: 'period',
    label: 'Period',
    sortable: true,
    render: (row) => String(row.period ?? '—'),
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
    key: 'match_rate',
    label: 'Match Rate',
    sortable: true,
    render: (row) => {
      const rate = Number(row.match_rate ?? 0);
      return (
        <div className="flex items-center gap-2">
          <div className="w-24 bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${rate}%` }} />
          </div>
          <span className="text-sm font-medium text-gray-900">{rate.toFixed(1)}%</span>
        </div>
      );
    },
  },
  {
    key: 'matched_items',
    label: 'Matched',
    render: (row) => String(row.matched_items ?? 0),
  },
  {
    key: 'unmatched_items',
    label: 'Unmatched',
    render: (row) => {
      const count = Number(row.unmatched_items ?? 0);
      return (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${count > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
          {count}
        </span>
      );
    },
  },
];

export function CaReconciliation() {
  const [showNewSession, setShowNewSession] = useState(false);
  const [sessionType, setSessionType] = useState('bank');

  const headerActions = (
    <button
      onClick={() => setShowNewSession(!showNewSession)}
      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
    >
      <Plus className="w-5 h-5" /> New Recon Session
    </button>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Reconciliation</h1>

      {/* New Session Form */}
      {showNewSession && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Start Reconciliation</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="bank">Bank Reconciliation</option>
                <option value="gstr2b">GSTR-2B Reconciliation</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option>Select a client...</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
                <input type="month" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                Start Session
              </button>
              <button
                onClick={() => setShowNewSession(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <DataTable<ReconSession>
        fetchUrl="/ca/recon/sessions"
        columns={columns}
        entityLabel="sessions"
        defaultSort="created_at"
        defaultOrder="desc"
        headerActions={headerActions}
      />
    </div>
  );
}
