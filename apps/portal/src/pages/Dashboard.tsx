import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';

interface DashboardStats {
  data: {
    orders: { total: string; draft: string; confirmed: string };
    shipments: { total: string };
    invoices: { total: string };
    connections: { total: string; active: string };
  };
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-sm text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardStats>('/analytics/dashboard'),
  });

  if (isLoading) return <div className="animate-pulse">Loading dashboard...</div>;
  const stats = data?.data;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Orders" value={stats?.orders?.total ?? '0'} sub={`${stats?.orders?.draft ?? '0'} draft`} />
        <StatCard label="Confirmed Orders" value={stats?.orders?.confirmed ?? '0'} />
        <StatCard label="Shipments" value={stats?.shipments?.total ?? '0'} />
        <StatCard label="Invoices" value={stats?.invoices?.total ?? '0'} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <StatCard label="Connections" value={stats?.connections?.total ?? '0'} sub={`${stats?.connections?.active ?? '0'} active`} />
      </div>
    </div>
  );
}
