import { formatDate } from '../utils/date.js';
import { DataTable } from '../components/common/DataTable.js';
import type { Column } from '../components/common/DataTable.js';

interface CalendarEntry {
  id: string;
  title: string;
  entry_type: string;
  entry_date: string;
  source: string | null;
  priority: string | null;
  metadata: Record<string, unknown> | null;
}

const eventTypeColors: Record<string, string> = {
  ORDER_CREATED: 'bg-blue-100 text-blue-700',
  ORDER_CONFIRMED: 'bg-green-100 text-green-700',
  SHIPMENT_SCHEDULED: 'bg-purple-100 text-purple-700',
  SHIPMENT_DISPATCHED: 'bg-yellow-100 text-yellow-700',
  INVOICE_ISSUED: 'bg-indigo-100 text-indigo-700',
  PAYMENT_DUE: 'bg-red-100 text-red-700',
};

const columns: Column<CalendarEntry>[] = [
  {
    key: 'title',
    label: 'Title',
    sortable: true,
    render: (row) => <span className="font-medium text-gray-900">{row.title as string}</span>,
  },
  {
    key: 'entry_type',
    label: 'Type',
    sortable: true,
    render: (row) => (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${eventTypeColors[row.entry_type as string] ?? 'bg-gray-100 text-gray-700'}`}>
        {row.entry_type as string}
      </span>
    ),
  },
  {
    key: 'entry_date',
    label: 'Date',
    sortable: true,
    render: (row) => <span className="text-gray-500">{formatDate(row.entry_date as string)}</span>,
  },
  {
    key: 'source',
    label: 'Source',
    render: (row) => <span className="text-gray-500">{(row.source as string | null) ?? '—'}</span>,
  },
];

export function Calendar() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Calendar</h2>
      </div>
      <DataTable<CalendarEntry>
        fetchUrl="/calendar"
        columns={columns}
        entityLabel="calendar events"
        defaultSort="entry_date"
        defaultOrder="desc"
      />
    </div>
  );
}
