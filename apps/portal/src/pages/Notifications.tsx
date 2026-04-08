import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { formatDate } from '../utils/date.js';
import { Bell, CheckCircle } from 'lucide-react';

interface Notification {
  id: string;
  event_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export function Notifications() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<{ data: Notification[]; total: number }>('/notifications'),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.post('/notifications/mark-all-read', {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const notifications = data?.data ?? [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
          {unreadCount > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
              {unreadCount} unread
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No notifications</p>
            <p className="text-gray-400 text-sm mt-1">You are all caught up.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 flex items-start justify-between gap-4 ${n.is_read ? 'bg-white' : 'bg-indigo-50'}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${n.is_read ? 'text-gray-900' : 'text-indigo-900'}`}>
                      {n.title ?? n.event_type}
                    </p>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0"></span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1 truncate">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(n.created_at)}</p>
                </div>
                {!n.is_read && (
                  <button
                    onClick={() => markReadMutation.mutate(n.id)}
                    disabled={markReadMutation.isPending}
                    className="flex-shrink-0 text-xs text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50"
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
