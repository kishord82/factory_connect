import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { AlertCircle, TrendingUp, Users, FileText, CheckCircle } from 'lucide-react';

interface DashboardData {
  total_clients: number;
  active_filings: number;
  overdue_documents: number;
  average_health_score: number;
  recent_exceptions: number;
  upcoming_deadlines: number;
  compliance_status: Record<string, string>;
  quick_stats: Array<{ label: string; value: string; trend: string }>;
}

export function CaDashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['ca-dashboard'],
    queryFn: () => api.get<{ data: DashboardData }>('/ca/firms/me/dashboard'),
  });

  const dashboard = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse w-1/3"></div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !dashboard) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-red-600" />
        <p className="text-red-700">Failed to load dashboard</p>
      </div>
    );
  }

  const avgHealthScore = dashboard.average_health_score ?? 0;
  const healthColor = avgHealthScore >= 80 ? 'text-green-600' : avgHealthScore >= 60 ? 'text-yellow-600' : 'text-red-600';
  const complianceColors: Record<string, string> = {
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    red: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">CA Dashboard</h1>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          + Quick Action
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Clients</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{dashboard.total_clients ?? 0}</p>
            </div>
            <Users className="w-10 h-10 text-blue-500 opacity-10" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Filings</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{dashboard.active_filings ?? 0}</p>
            </div>
            <FileText className="w-10 h-10 text-purple-500 opacity-10" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Overdue Documents</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{dashboard.overdue_documents ?? 0}</p>
            </div>
            <AlertCircle className="w-10 h-10 text-red-500 opacity-10" />
          </div>
        </div>

        <div className={`bg-white rounded-lg border border-gray-200 p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Avg Health Score</p>
              <p className={`text-3xl font-bold mt-2 ${healthColor}`}>{avgHealthScore}%</p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-500 opacity-10" />
          </div>
        </div>
      </div>

      {/* Compliance Status Grid */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Compliance Status</h2>
        <div className="grid grid-cols-4 gap-4">
          {Object.entries(dashboard.compliance_status ?? {}).map(([type, status]) => (
            <div key={type} className={`rounded-lg p-4 ${complianceColors[status] || 'bg-gray-100 text-gray-700'}`}>
              <p className="text-sm font-medium capitalize">{type.replace('_', ' ')}</p>
              <p className="text-lg font-semibold mt-2 capitalize">{status}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        {(dashboard.quick_stats ?? []).map((stat, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              {stat.trend === 'up' && <TrendingUp className="w-5 h-5 text-green-500" />}
              {stat.trend === 'down' && <TrendingUp className="w-5 h-5 text-green-500 rotate-180" />}
              {stat.trend === 'stable' && <div className="w-5 h-1 bg-gray-400 rounded"></div>}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Exceptions & Deadlines */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Exceptions</h3>
          <div className="text-4xl font-bold text-red-600">{dashboard.recent_exceptions ?? 0}</div>
          <p className="text-sm text-gray-500 mt-2">Requiring attention</p>
          <button className="mt-4 text-indigo-600 hover:text-indigo-700 text-sm font-medium">
            View all →
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Deadlines</h3>
          <div className="text-4xl font-bold text-orange-600">{dashboard.upcoming_deadlines ?? 0}</div>
          <p className="text-sm text-gray-500 mt-2">In next 30 days</p>
          <button className="mt-4 text-indigo-600 hover:text-indigo-700 text-sm font-medium">
            View calendar →
          </button>
        </div>
      </div>
    </div>
  );
}
