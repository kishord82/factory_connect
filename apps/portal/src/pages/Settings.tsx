import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { useAuth, isAdmin } from '../lib/auth.js';
import { formatDate } from '../utils/date.js';
import { TableLoading, TableError } from '../components/common/TableStates.js';
import { Plus, Bell, Lock } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  factory_id: string | null;
  created_at: string;
}

interface FeatureFlag {
  flag_name: string;
  is_enabled: boolean;
  description: string | null;
  updated_at: string;
}

interface TenantConfig {
  tenant_id: string;
  config_name: string;
  config_value: string;
  created_at: string;
  updated_at: string;
}

interface NotificationPreference {
  id: string;
  event_type: string;
  channel: string; // EMAIL, SMS, IN_APP
  enabled: boolean;
}

interface AuditLog {
  id: string;
  action: string;
  actor: string;
  resource_type: string;
  resource_id: string;
  changes: Record<string, unknown>;
  created_at: string;
}

const roleLabels: Record<string, string> = {
  fc_admin: 'Platform Admin',
  factory_admin: 'Factory Admin',
  factory_operator: 'Operator',
  factory_viewer: 'Viewer',
};

export function Settings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'users' | 'flags' | 'config' | 'notifications' | 'audit'>('users');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('factory_viewer');
  const [auditPage, setAuditPage] = useState(1);

  // Queries
  const usersQuery = useQuery({
    queryKey: ['settings', 'users'],
    queryFn: () => api.get<{ data: User[]; total: number }>('/settings/users'),
  });

  const flagsQuery = useQuery({
    queryKey: ['settings', 'flags'],
    queryFn: () => api.get<{ data: FeatureFlag[] }>('/settings/feature-flags'),
    enabled: isAdmin(user),
  });

  const configQuery = useQuery({
    queryKey: ['settings', 'config'],
    queryFn: () => api.get<{ data: TenantConfig[] }>('/settings/config'),
  });

  const notificationsQuery = useQuery({
    queryKey: ['settings', 'notifications'],
    queryFn: () => api.get<{ data: NotificationPreference[] }>('/settings/notifications'),
  });

  const auditQuery = useQuery({
    queryKey: ['settings', 'audit', auditPage],
    queryFn: () => api.get<{ data: AuditLog[]; total: number; totalPages: number }>(
      `/settings/audit?page=${auditPage}&pageSize=20`
    ),
  });

  // Mutations
  const inviteUserMutation = useMutation({
    mutationFn: (args: { email: string; role: string }) =>
      api.post('/settings/users/invite', args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'users'] });
      setInviteEmail('');
      setInviteRole('factory_viewer');
      setShowInviteForm(false);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/settings/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'users'] });
    },
  });

  const toggleFlagMutation = useMutation({
    mutationFn: (args: { flag: string; enabled: boolean }) =>
      api.put(`/settings/feature-flags/${args.flag}`, { is_enabled: args.enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'flags'] });
    },
  });

  useMutation({
    mutationFn: (args: { name: string; value: string }) =>
      api.post('/settings/config', args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'config'] });
    },
  });

  const updateNotificationMutation = useMutation({
    mutationFn: (args: { preference_id: string; enabled: boolean }) =>
      api.patch(`/settings/notifications/${args.preference_id}`, { enabled: args.enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'notifications'] });
    },
  });

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings</h2>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg overflow-x-auto">
        {[
          { id: 'users', label: `Users (${usersQuery.data?.total ?? 0})`, icon: '👤' },
          { id: 'notifications', label: 'Notifications', icon: '🔔' },
          { id: 'config', label: 'Configuration', icon: '⚙️' },
          ...(isAdmin(user)
            ? [
                { id: 'flags', label: `Feature Flags (${flagsQuery.data?.data?.length ?? 0})`, icon: '🚩' },
                { id: 'audit', label: 'Audit Log', icon: '📋' },
              ]
            : []),
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === tab.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
            {isAdmin(user) && (
              <button
                onClick={() => setShowInviteForm(!showInviteForm)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus size={16} />
                Invite User
              </button>
            )}
          </div>

          {showInviteForm && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Invite New User</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.entries(roleLabels).map(([roleId, label]) => (
                      <option key={roleId} value={roleId}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => inviteUserMutation.mutate({ email: inviteEmail, role: inviteRole })}
                    disabled={inviteUserMutation.isPending || !inviteEmail}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    Send Invite
                  </button>
                  <button
                    onClick={() => setShowInviteForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {usersQuery.isLoading ? (
              <TableLoading message="Loading users..." />
            ) : usersQuery.isError ? (
              <TableError
                message={usersQuery.error instanceof Error ? usersQuery.error.message : 'Unknown error'}
                onRetry={() => usersQuery.refetch()}
              />
            ) : !usersQuery.data?.data?.length ? (
              <div className="p-8 text-center text-gray-500">No users found</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    {isAdmin(user) && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {usersQuery.data.data.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{u.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{u.email}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700">
                          {roleLabels[u.role] || u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatDate(u.created_at)}</td>
                      {isAdmin(user) && (
                        <td className="px-6 py-4">
                          <button
                            onClick={() => deleteUserMutation.mutate(u.id)}
                            disabled={deleteUserMutation.isPending || u.id === user?.sub}
                            className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Bell size={20} />
            Notification Preferences
          </h3>

          {notificationsQuery.isLoading ? (
            <TableLoading message="Loading preferences..." />
          ) : notificationsQuery.isError ? (
            <TableError
              message={notificationsQuery.error instanceof Error ? notificationsQuery.error.message : 'Unknown error'}
              onRetry={() => notificationsQuery.refetch()}
            />
          ) : (
            <div className="space-y-4">
              {notificationsQuery.data?.data?.map((pref) => (
                <div key={pref.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{pref.event_type}</p>
                    <p className="text-xs text-gray-500">Channel: {pref.channel}</p>
                  </div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={pref.enabled}
                      onChange={(e) =>
                        updateNotificationMutation.mutate({
                          preference_id: pref.id,
                          enabled: e.target.checked,
                        })
                      }
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-600">Enabled</span>
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Configuration Tab */}
      {activeTab === 'config' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Lock size={20} />
            Tenant Configuration
          </h3>

          {configQuery.isLoading ? (
            <TableLoading message="Loading configuration..." />
          ) : configQuery.isError ? (
            <TableError
              message={configQuery.error instanceof Error ? configQuery.error.message : 'Unknown error'}
              onRetry={() => configQuery.refetch()}
            />
          ) : (
            <div className="space-y-4">
              {configQuery.data?.data?.map((cfg) => (
                <div key={cfg.config_name} className="p-4 border border-gray-200 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 mb-1">{cfg.config_name}</p>
                  <p className="font-mono text-sm bg-gray-50 p-2 rounded mb-2 break-all">{cfg.config_value}</p>
                  <p className="text-xs text-gray-500">Updated: {formatDate(cfg.updated_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Feature Flags Tab (Admin Only) */}
      {activeTab === 'flags' && isAdmin(user) && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {flagsQuery.isLoading ? (
            <TableLoading message="Loading feature flags..." />
          ) : flagsQuery.isError ? (
            <TableError
              message={flagsQuery.error instanceof Error ? flagsQuery.error.message : 'Unknown error'}
              onRetry={() => flagsQuery.refetch()}
            />
          ) : !flagsQuery.data?.data?.length ? (
            <div className="p-8 text-center text-gray-500">No feature flags configured</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Flag Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {flagsQuery.data.data.map((flag) => (
                  <tr key={flag.flag_name} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 font-mono">{flag.flag_name}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          flag.is_enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {flag.is_enabled ? 'ON' : 'OFF'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{flag.description || '—'}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() =>
                          toggleFlagMutation.mutate({
                            flag: flag.flag_name,
                            enabled: !flag.is_enabled,
                          })
                        }
                        disabled={toggleFlagMutation.isPending}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                          flag.is_enabled
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                        } disabled:opacity-50`}
                      >
                        {flag.is_enabled ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Audit Log Tab (Admin Only) */}
      {activeTab === 'audit' && isAdmin(user) && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Audit Log</h3>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {auditQuery.isLoading ? (
              <TableLoading message="Loading audit log..." />
            ) : auditQuery.isError ? (
              <TableError
                message={auditQuery.error instanceof Error ? auditQuery.error.message : 'Unknown error'}
                onRetry={() => auditQuery.refetch()}
              />
            ) : !auditQuery.data?.data?.length ? (
              <div className="p-8 text-center text-gray-500">No audit logs</div>
            ) : (
              <>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resource</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {auditQuery.data.data.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{log.action}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{log.actor}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {log.resource_type}#{log.resource_id}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{formatDate(log.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {auditQuery.data.totalPages > 1 && (
                  <div className="px-6 py-3 border-t border-gray-200 flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                      Page {auditPage} of {auditQuery.data.totalPages}
                    </span>
                    <div className="space-x-2">
                      <button
                        onClick={() => setAuditPage(Math.max(1, auditPage - 1))}
                        disabled={auditPage === 1}
                        className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                      >
                        Prev
                      </button>
                      <button
                        onClick={() => setAuditPage(auditPage + 1)}
                        disabled={auditPage >= auditQuery.data.totalPages}
                        className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
