import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';

interface AnalyticsData {
  data: {
    orders_by_status: Record<string, number>;
    shipments_by_status: Record<string, number>;
    revenue_by_month: Record<string, number>;
    top_buyers: Array<{ name: string; total_orders: number }>;
  };
}

export function Analytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => api.get<AnalyticsData>('/analytics/overview'),
  });

  if (isLoading) return <div className="animate-pulse">Loading analytics...</div>;

  const analyticsData = data?.data;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Analytics</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Orders by Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Orders by Status</h3>
          <div className="space-y-3">
            {analyticsData?.orders_by_status && Object.entries(analyticsData.orders_by_status).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{status}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 bg-indigo-200 rounded-full" style={{ width: `${Math.min((count / 10) * 100, 150)}px` }}></div>
                  <span className="text-sm font-medium text-gray-900 w-12 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shipments by Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Shipments by Status</h3>
          <div className="space-y-3">
            {analyticsData?.shipments_by_status && Object.entries(analyticsData.shipments_by_status).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{status}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 bg-green-200 rounded-full" style={{ width: `${Math.min((count / 10) * 100, 150)}px` }}></div>
                  <span className="text-sm font-medium text-gray-900 w-12 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Buyers */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Buyers</h3>
          <div className="space-y-3">
            {analyticsData?.top_buyers && analyticsData.top_buyers.map((buyer) => (
              <div key={buyer.name} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{buyer.name}</span>
                <span className="text-sm font-medium text-gray-900">{buyer.total_orders} orders</span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue by Month */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Month</h3>
          <div className="space-y-3">
            {analyticsData?.revenue_by_month && Object.entries(analyticsData.revenue_by_month).map(([month, revenue]) => (
              <div key={month} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{month}</span>
                <span className="text-sm font-medium text-gray-900">INR {Number(revenue).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
