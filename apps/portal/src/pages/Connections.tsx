import { formatDate } from '../utils/date.js';
import { useAuth, canWrite } from '../lib/auth.js';
import { DataTable } from '../components/common/DataTable.js';
import type { Column } from '../components/common/DataTable.js';

interface Connection {
  id: string;
  buyer_id: string;
  source_type: string;
  mode: string;
  status: string;
  created_at: string;
  circuit_breaker_state: string | null;
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-700',
  SUSPENDED: 'bg-yellow-100 text-yellow-700',
  DISCONNECTED: 'bg-red-100 text-red-700',
};

const circuitBreakerColors: Record<string, string> = {
  CLOSED: 'text-green-600',
  HALF_OPEN: 'text-yellow-600',
  OPEN: 'text-red-600',
};

const columns: Column<Connection>[] = [
  { key: 'source_type', label: 'Source Type', sortable: true },
  { key: 'mode', label: 'Mode', sortable: true },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    render: (row) => (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[row.status?.toUpperCase()] ?? 'bg-gray-100'}`}>
        {row.status}
      </span>
    ),
  },
  {
    key: 'circuit_breaker_state',
    label: 'Circuit Breaker',
    render: (row) => {
      const state = (row.circuit_breaker_state ?? 'CLOSED').toString().toUpperCase();
      return (
        <span className={`font-medium ${circuitBreakerColors[state] ?? 'text-gray-500'}`}>
          {state}
        </span>
      );
    },
  },
  {
    key: 'created_at',
    label: 'Created',
    sortable: true,
    render: (row) => <span className="text-gray-500">{formatDate(row.created_at as string)}</span>,
  },
];

export function Connections() {
  const { user } = useAuth();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Connections</h2>
      </div>
      <DataTable<Connection>
        fetchUrl="/connections"
        columns={columns}
        entityLabel="connections"
        defaultSort="created_at"
        defaultOrder="desc"
        headerActions={
          canWrite(user) ? (
            <button
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              disabled
            >
              + New Connection
            </button>
          ) : undefined
        }
      />
    </div>
  );
}
