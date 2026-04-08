import { useNavigate } from 'react-router-dom';
import { formatDate } from '../utils/date.js';
import { DataTable, Column } from '../components/common/DataTable.js';

interface Shipment extends Record<string, unknown> {
  id: string;
  order_id: string;
  status: string;
  shipment_date: string;
  carrier_name: string | null;
  tracking_number: string | null;
  weight: string | null;
  weight_uom: string;
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  IN_TRANSIT: 'bg-blue-100 text-blue-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const columns: Column<Shipment>[] = [
  {
    key: 'tracking_number',
    label: 'Tracking #',
    sortable: true,
    render: (row) => String(row.tracking_number ?? '—'),
  },
  {
    key: 'order_id',
    label: 'Order',
    sortable: true,
    render: (row) => String(row.order_id ?? '—'),
  },
  {
    key: 'carrier_name',
    label: 'Carrier',
    render: (row) => String(row.carrier_name ?? '—'),
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    render: (row) => {
      const s = String(row.status ?? '');
      return (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[s] ?? 'bg-gray-100 text-gray-700'}`}>
          {s || '—'}
        </span>
      );
    },
  },
  {
    key: 'shipment_date',
    label: 'Ship Date',
    sortable: true,
    render: (row) => formatDate(String(row.shipment_date ?? '')),
  },
];

export function Shipments() {
  const navigate = useNavigate();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Shipments</h2>
      </div>
      <DataTable<Shipment>
        fetchUrl="/shipments"
        columns={columns}
        entityLabel="shipments"
        defaultSort="shipment_date"
        defaultOrder="desc"
        onRowClick={(row) => navigate(`/shipments/${row.id}`)}
      />
    </div>
  );
}
