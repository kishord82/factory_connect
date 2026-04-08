/**
 * React Query hooks for FactoryConnect API calls
 * Used across all pages and components
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';

/* ========== MAPPING QUERIES ========== */

export interface MappingConfig {
  id: string;
  mapping_name: string;
  source_type: string;
  target_type: string;
  field_mappings: Array<{
    source_field: string;
    target_field: string;
    transform_rule: string | null;
  }>;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export const useMappings = () =>
  useQuery({
    queryKey: ['mappings'],
    queryFn: () => api.get<{ data: MappingConfig[]; total: number }>('/mappings'),
  });

export const useAvailableFields = () =>
  useQuery({
    queryKey: ['mappings', 'available-fields'],
    queryFn: () =>
      api.get<{
        source: Array<{ name: string; type: string; required: boolean }>;
        target: Array<{ name: string; type: string; required: boolean }>;
      }>('/mappings/available-fields'),
  });

export const useSuggestMappings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sourceFields: string[]) =>
      api.post<{ suggestions: MappingConfig['field_mappings'] }>(
        '/mappings/suggest',
        { source_fields: sourceFields }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mappings'] });
    },
  });
};

export const useTestMapping = () =>
  useMutation({
    mutationFn: (payload: {
      sample_data: Record<string, unknown>;
      mapping_config: MappingConfig['field_mappings'];
    }) => api.post<{ result: Record<string, unknown>; warnings: string[] }>('/mappings/test', payload),
  });

export const useSaveMapping = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      name: string;
      mappings: MappingConfig['field_mappings'];
    }) => api.post('/mappings', args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mappings'] });
    },
  });
};

export const useDeleteMapping = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mappingId: string) => api.delete(`/mappings/${mappingId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mappings'] });
    },
  });
};

/* ========== ORDER QUERIES ========== */

export interface CanonicalOrder {
  id: string;
  buyer_po_number: string;
  factory_order_number: string | null;
  status: string;
  total_amount: string;
  currency: string;
  created_at: string;
  buyer_id: string;
}

export interface OrderDetail extends CanonicalOrder {
  line_items: Array<{
    id: string;
    sku: string;
    description: string;
    quantity: string;
    unit_price: string;
  }>;
  saga_timeline: Array<{
    step: number;
    state: string;
    timestamp: string;
    duration_ms: number;
    error: string | null;
  }>;
  audit_trail: Array<{
    action: string;
    actor: string;
    timestamp: string;
    details: Record<string, unknown>;
  }>;
}

export const useOrders = (page: number, status?: string) =>
  useQuery({
    queryKey: ['orders', page, status],
    queryFn: () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '20',
        ...(status && { status }),
      });
      return api.get<{
        data: CanonicalOrder[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      }>(`/orders?${params}`);
    },
  });

export const useOrderDetail = (orderId: string) =>
  useQuery({
    queryKey: ['order-detail', orderId],
    queryFn: () => api.get<OrderDetail>(`/orders/${orderId}`),
    enabled: !!orderId,
  });

export const useRetryOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => api.post(`/orders/${orderId}/retry`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-detail'] });
    },
  });
};

export const useExportOrders = () =>
  useMutation({
    mutationFn: (orders: CanonicalOrder[]) => {
      const csv = [
        ['ID', 'PO Number', 'Factory Order', 'Status', 'Amount', 'Currency', 'Created'].join(','),
        ...orders.map((o) =>
          [o.id, o.buyer_po_number, o.factory_order_number || '', o.status, o.total_amount, o.currency, o.created_at].join(',')
        ),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return Promise.resolve();
    },
  });

/* ========== EDI QUERIES ========== */

export interface EdiMessage {
  id: string;
  message_type: string;
  partner_id: string;
  status: string;
  raw_content: string;
  created_at: string;
  updated_at: string;
  error_message: string | null;
}

export const useEdiMessages = (
  page: number,
  messageType?: string,
  status?: string,
  partnerId?: string
) =>
  useQuery({
    queryKey: ['edi-messages', page, messageType, status, partnerId],
    queryFn: () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '20',
        ...(messageType && { message_type: messageType }),
        ...(status && { status }),
        ...(partnerId && { partner_id: partnerId }),
      });
      return api.get<{
        data: EdiMessage[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      }>(`/edi/messages?${params}`);
    },
  });

export const useResendEdiMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => api.post(`/edi/messages/${messageId}/resend`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edi-messages'] });
    },
  });
};

/* ========== BRIDGE QUERIES ========== */

export interface BridgeAgent {
  id: string;
  factory_id: string;
  bridge_version: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  last_heartbeat: string;
  queue_depth: number;
  sync_count: number;
  last_sync_at: string;
  created_at: string;
}

export interface BridgeDetail extends BridgeAgent {
  health_probes: Array<{
    check_name: string;
    status: 'PASS' | 'FAIL';
    duration_ms: number;
    error_message: string | null;
  }>;
  recent_syncs: Array<{
    id: string;
    status: string;
    record_count: number;
    started_at: string;
    completed_at: string;
    error: string | null;
  }>;
}

export const useBridges = (page: number) =>
  useQuery({
    queryKey: ['bridges', page],
    queryFn: () =>
      api.get<{
        data: BridgeAgent[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      }>(`/bridges?page=${page}&pageSize=20`),
  });

export const useBridgeDetail = (bridgeId: string) =>
  useQuery({
    queryKey: ['bridge-detail', bridgeId],
    queryFn: () => api.get<BridgeDetail>(`/bridges/${bridgeId}`),
    enabled: !!bridgeId,
  });

export const useTriggerBridgeResync = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bridgeId: string) => api.post(`/bridges/${bridgeId}/resync`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bridges'] });
      queryClient.invalidateQueries({ queryKey: ['bridge-detail'] });
    },
  });
};

export const useRestartBridge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bridgeId: string) => api.post(`/bridges/${bridgeId}/restart`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bridges'] });
      queryClient.invalidateQueries({ queryKey: ['bridge-detail'] });
    },
  });
};

/* ========== SETTINGS QUERIES ========== */

export const useSettingsUsers = () =>
  useQuery({
    queryKey: ['settings', 'users'],
    queryFn: () =>
      api.get<{
        data: Array<{
          id: string;
          email: string;
          name: string;
          role: string;
          factory_id: string | null;
          created_at: string;
        }>;
        total: number;
      }>('/settings/users'),
  });

export const useInviteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { email: string; role: string }) => api.post('/settings/users/invite', args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'users'] });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.delete(`/settings/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'users'] });
    },
  });
};

export const useFeatureFlags = () =>
  useQuery({
    queryKey: ['settings', 'flags'],
    queryFn: () =>
      api.get<{
        data: Array<{
          flag_name: string;
          is_enabled: boolean;
          description: string | null;
          updated_at: string;
        }>;
      }>('/settings/feature-flags'),
  });

export const useToggleFeatureFlag = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { flag: string; enabled: boolean }) =>
      api.put(`/settings/feature-flags/${args.flag}`, { is_enabled: args.enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'flags'] });
    },
  });
};

export const useTenantConfig = () =>
  useQuery({
    queryKey: ['settings', 'config'],
    queryFn: () =>
      api.get<{
        data: Array<{
          tenant_id: string;
          config_name: string;
          config_value: string;
          created_at: string;
          updated_at: string;
        }>;
      }>('/settings/config'),
  });

export const useNotificationPreferences = () =>
  useQuery({
    queryKey: ['settings', 'notifications'],
    queryFn: () =>
      api.get<{
        data: Array<{
          id: string;
          event_type: string;
          channel: string;
          enabled: boolean;
        }>;
      }>('/settings/notifications'),
  });

export const useUpdateNotificationPreference = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { preference_id: string; enabled: boolean }) =>
      api.patch(`/settings/notifications/${args.preference_id}`, { enabled: args.enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'notifications'] });
    },
  });
};

export const useAuditLog = (page: number) =>
  useQuery({
    queryKey: ['settings', 'audit', page],
    queryFn: () =>
      api.get<{
        data: Array<{
          id: string;
          action: string;
          actor: string;
          resource_type: string;
          resource_id: string;
          changes: Record<string, unknown>;
          created_at: string;
        }>;
        total: number;
        page: number;
        totalPages: number;
      }>(`/settings/audit?page=${page}&pageSize=20`),
  });

/* ========== CONNECTION QUERIES ========== */

export interface Connection {
  id: string;
  buyer_id: string;
  source_type: string;
  mode: string;
  status: string;
  created_at: string;
  circuit_breaker_state: string | null;
}

export const useConnections = (page: number, status?: string) =>
  useQuery({
    queryKey: ['connections', page, status],
    queryFn: () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '20',
        ...(status && { status }),
      });
      return api.get<{
        data: Connection[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      }>(`/connections?${params}`);
    },
  });

export const useTestConnection = () =>
  useMutation({
    mutationFn: (connectionId: string) => api.post(`/connections/${connectionId}/test`, {}),
  });
