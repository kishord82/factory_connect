import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { useState } from 'react';
import { Plus, AlertTriangle, Clock } from 'lucide-react';
import { DataTable } from '../../components/common/DataTable.js';
import type { Column } from '../../components/common/DataTable.js';

interface Notice {
  id: string;
  client_id: string;
  client_name: string;
  notice_type: string;
  title: string;
  notice_number: string;
  received_date: string;
  due_date: string;
  days_remaining: number;
  status: string;
  priority: string;
  assigned_to: string | null;
}

interface Dashboard {
  total_notices: number;
  in_progress: number;
  escalated: number;
  resolved: number;
  critical_notices: number;
  upcoming_deadlines: Array<{ title: string; due_in_days: number }>;
}

const noticeStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    received: 'bg-gray-100 text-gray-700',
    under_review: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    responded: 'bg-purple-100 text-purple-700',
    resolved: 'bg-green-100 text-green-700',
    escalated: 'bg-red-100 text-red-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};

const noticePriorityColor = (priority: string) => {
  const colors: Record<string, string> = {
    critical: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-blue-100 text-blue-700',
  };
  return colors[priority] || 'bg-gray-100 text-gray-700';
};

const daysRemainingColor = (days: number) => {
  if (days <= 5) return 'text-red-600 font-bold';
  if (days <= 14) return 'text-orange-600 font-bold';
  return 'text-gray-600';
};

const columns: Column<Notice>[] = [
  {
    key: 'title',
    label: 'Title',
    sortable: true,
    render: (row) => <span className="font-medium text-gray-900">{row.title as string}</span>,
  },
  {
    key: 'client_name',
    label: 'Client',
    sortable: true,
    render: (row) => <span className="text-gray-500">{row.client_name as string}</span>,
  },
  {
    key: 'notice_type',
    label: 'Type',
    sortable: true,
    render: (row) => (
      <span className="text-gray-500 uppercase">
        {(row.notice_type as string).replace('_', ' ')}
      </span>
    ),
  },
  {
    key: 'notice_number',
    label: 'Notice #',
    render: (row) => <span className="text-gray-500">{(row.notice_number as string) || '—'}</span>,
  },
  {
    key: 'priority',
    label: 'Priority',
    sortable: true,
    render: (row) => (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${noticePriorityColor(row.priority as string)}`}>
        {row.priority as string}
      </span>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    render: (row) => (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${noticeStatusColor(row.status as string)}`}>
        {row.status as string}
      </span>
    ),
  },
  {
    key: 'days_remaining',
    label: 'Days Left',
    sortable: true,
    render: (row) => (
      <span className={daysRemainingColor(row.days_remaining as number)}>
        {row.days_remaining as number}
      </span>
    ),
  },
  {
    key: 'due_date',
    label: 'Due Date',
    sortable: true,
    render: (row) => (
      <span className="text-gray-500">
        {new Date(row.due_date as string).toLocaleDateString()}
      </span>
    ),
  },
];

export function CaNotices() {
  const [showForm, setShowForm] = useState(false);

  const { data: dashboard } = useQuery({
    queryKey: ['ca-notices-dashboard'],
    queryFn: () => api.get<{ data: Dashboard }>('/ca/notices/dashboard'),
  });

  const db = dashboard?.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Notices</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Log Notice
        </button>
      </div>

      {/* Dashboard Stats */}
      {db && (
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Notices</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{db.total_notices}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">In Progress</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{db.in_progress}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Escalated</p>
            <p className="text-3xl font-bold text-red-600 mt-2">{db.escalated}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Resolved</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{db.resolved}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Critical</p>
            <div className="flex items-center mt-2">
              {db.critical_notices > 0 && <AlertTriangle className="w-6 h-6 text-red-600 mr-2" />}
              <p className="text-3xl font-bold text-red-600">{db.critical_notices}</p>
            </div>
          </div>
        </div>
      )}

      {/* Create Notice Form */}
      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Log New Notice</h3>
          <form className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option>Select a client...</option>
                  <option>Acme Corp</option>
                  <option>Ravi Trading</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notice Type</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option>Income Tax</option>
                  <option>GST</option>
                  <option>TDS</option>
                  <option>Audit</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., Income Tax Assessment Notice"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Received Date</label>
                <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                Create Notice
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Upcoming Deadlines */}
      {db && db.upcoming_deadlines.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5" /> Upcoming Deadlines
          </h3>
          <ul className="space-y-2">
            {db.upcoming_deadlines.map((deadline, i) => (
              <li key={i} className="text-sm text-red-700">
                <strong>{deadline.title}</strong> — Due in {deadline.due_in_days} days
              </li>
            ))}
          </ul>
        </div>
      )}

      <DataTable<Notice>
        fetchUrl="/ca/notices"
        columns={columns}
        entityLabel="notices"
        defaultSort="days_remaining"
        defaultOrder="asc"
      />
    </div>
  );
}
