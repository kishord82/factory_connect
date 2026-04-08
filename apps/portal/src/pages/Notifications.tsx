import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { formatDate } from '../utils/date.js';
import { CheckCircle } from 'lucide-react';
import { DataTable, Column } from '../components/common/DataTable.js';

interface NotificationRow extends Record<string, unknown> {
  id: string;
  event_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export function Notifications() {
  const qc = useQueryClient();

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.post('/notifications/mark-all-read', {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/notifications'] });
    },
  });

  const columns: Column<NotificationRow>[] = [
    {
      key: 'title',
      label: 'Title',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className={`text-sm ${row.is_read ? 'text-gray-700' : 'font-medium text-indigo-900'}`}>
            {String(row.title ?? row.event_type ?? '—')}
          </span>
          {!row.is_read && <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />}
        </div>
      ),
    },
    {
      key: 'event_type',
      label: 'Type',
      sortable: true,
      render: (row) => (
        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {String(row.event_type ?? '—')}
        </span>
      ),
    },
    {
      key: 'message',
      label: 'Message',
      render: (row) => (
        <span className="text-sm text-gray-600 truncate max-w-xs block">
          {String(row.message ?? '—')}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Date',
      sortable: true,
      render: (row) => formatDate(String(row.created_at ?? '')),
    },
    {
      key: 'is_read',
      label: 'Read',
      render: (row) =>
        row.is_read ? (
          <span className="text-xs text-gray-400">Read</span>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              markReadMutation.mutate(String(row.id));
            }}
            disabled={markReadMutation.isPending}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50"
          >
            Mark read
          </button>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
        <button
          onClick={() => markAllReadMutation.mutate()}
          disabled={markAllReadMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50"
        >
          <CheckCircle className="w-4 h-4" />
          Mark all read
        </button>
      </div>

      <DataTable<NotificationRow>
        fetchUrl="/notifications"
        columns={columns}
        entityLabel="notifications"
        defaultSort="created_at"
        defaultOrder="desc"
      />
    </div>
  );
}
