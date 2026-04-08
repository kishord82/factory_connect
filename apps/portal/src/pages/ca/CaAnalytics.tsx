import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- recharts not installed yet
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Analytics {
  overall_health_score: number;
  clients_by_health: Record<string, number>;
  compliance_health: Record<string, number>;
  team_utilization: number;
  most_active_staff: Array<{ name: string; activities: number }>;
  total_revenue_ytd: number;
  top_clients_by_revenue: Array<{ client_name: string; revenue: number; margin: number }>;
}

export function CaAnalytics() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['ca-analytics-firm'],
    queryFn: () => api.get<{ data: Analytics }>('/ca/analytics/firm'),
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  const data = analytics?.data;

  const healthData = data
    ? Object.entries(data.clients_by_health).map(([status, count]) => ({
        name: status,
        value: count,
      }))
    : [];

  const complianceData = data
    ? Object.entries(data.compliance_health).map(([type, score]) => ({
        name: type,
        score,
      }))
    : [];

  const COLORS = ['#16a34a', '#eab308', '#ef4444', '#9ca3af'];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>

      {/* Overall Health */}
      {data && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Overall Health Score</h2>
            <div className="flex items-center justify-center">
              <div className="relative w-48 h-48">
                <svg className="transform -rotate-90 w-full h-full">
                  <circle cx="96" cy="96" r="88" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    fill="none"
                    stroke="#16a34a"
                    strokeWidth="10"
                    strokeDasharray={`${(data.overall_health_score / 100) * 552.92} 552.92`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-gray-900">{data.overall_health_score.toFixed(1)}</p>
                    <p className="text-sm text-gray-500">Score</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Clients by Health</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={healthData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }: { name?: string; value?: number }) => `${name ?? ''}: ${value ?? 0}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {healthData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Compliance Health by Type */}
      {data && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Compliance Health by Type</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={complianceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="score" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Staff Productivity */}
      {data && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Most Active Staff</h2>
          <div className="space-y-4">
            {data.most_active_staff.map((staff, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium text-gray-900">{staff.name}</p>
                  <p className="text-sm text-gray-500">{staff.activities} activities</p>
                </div>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{
                      width: `${(staff.activities / (data.most_active_staff[0]?.activities || 100)) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revenue */}
      {data && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Total Revenue (YTD)</h2>
            <p className="text-4xl font-bold text-green-600">
              ₹{(data.total_revenue_ytd / 100000).toFixed(2)}L
            </p>
            <p className="text-sm text-gray-500 mt-2">Year-to-Date</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Clients by Revenue</h2>
            <div className="space-y-3">
              {data.top_clients_by_revenue.map((client, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{client.client_name}</p>
                    <p className="text-xs text-gray-500">{client.margin}% margin</p>
                  </div>
                  <p className="font-semibold text-gray-900">₹{(client.revenue / 1000).toFixed(1)}K</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
