import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { formatDate } from '../utils/date.js';
import { TableLoading, TableEmpty, TableError } from '../components/common/TableStates.js';
import { ChevronDown, ActivitySquare, RotateCcw, Zap } from 'lucide-react';

interface BridgeAgent {
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

interface HealthProbe {
  check_name: string;
  status: 'PASS' | 'FAIL';
  duration_ms: number;
  error_message: string | null;
}

interface BridgeDetail extends BridgeAgent {
  health_probes: HealthProbe[];
  recent_syncs: Array<{
    id: string;
    status: string;
    record_count: number;
    started_at: string;
    completed_at: string;
    error: string | null;
  }>;
}

interface PaginatedResponse {
  data: BridgeAgent[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const statusColors: Record<string, string> = {
  CONNECTED: 'bg-green-100 text-green-700',
  DISCONNECTED: 'bg-gray-100 text-gray-700',
  ERROR: 'bg-red-100 text-red-700',
};

export function BridgeStatus() {
  const [page, setPage] = useState(1);
  const [selectedBridge, setSelectedBridge] = useState<BridgeDetail | null>(null);

  const bridgesQuery = useQuery({
    queryKey: ['bridges', page],
    queryFn: () => api.get<PaginatedResponse>(`/bridges?page=${page}&pageSize=20`),
  });

  const bridgeDetailQuery = useQuery<BridgeDetail | null, Error, BridgeDetail | null>({
    queryKey: ['bridge-detail', selectedBridge?.id],
    queryFn: () =>
      selectedBridge ? api.get<BridgeDetail>(`/bridges/${selectedBridge.id}`) : Promise.resolve(null),
    enabled: !!selectedBridge,
  });

  const resyncMutation = useMutation({
    mutationFn: (bridgeId: string) => api.post(`/bridges/${bridgeId}/resync`, {}),
    onSuccess: () => {
      bridgeDetailQuery.refetch();
      bridgesQuery.refetch();
    },
  });

  const restartMutation = useMutation({
    mutationFn: (bridgeId: string) => api.post(`/bridges/${bridgeId}/restart`, {}),
    onSuccess: () => {
      bridgeDetailQuery.refetch();
      bridgesQuery.refetch();
    },
  });

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Left: Bridges List */}
      <div className="col-span-2">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Bridge Agents</h2>
          <div className="flex items-center gap-2 px-3 py-1 text-xs text-gray-600 bg-gray-100 rounded-lg">
            <ActivitySquare size={14} />
            Live Status
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {bridgesQuery.isLoading ? (
            <TableLoading message="Loading bridge agents..." />
          ) : bridgesQuery.isError ? (
            <TableError
              message={bridgesQuery.error instanceof Error ? bridgesQuery.error.message : 'Unknown error'}
              onRetry={() => bridgesQuery.refetch()}
            />
          ) : !bridgesQuery.data?.data?.length ? (
            <TableEmpty entity="bridge agents" />
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Factory ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Queue Depth</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Sync</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {bridgesQuery.data.data.map((bridge) => (
                    <tr key={bridge.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{bridge.factory_id}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{bridge.bridge_version}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            statusColors[bridge.status] || 'bg-gray-100'
                          }`}
                        >
                          {bridge.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {bridge.queue_depth} records
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {bridge.last_sync_at ? formatDate(bridge.last_sync_at) : 'Never'}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedBridge(bridge as BridgeDetail)}
                          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {bridgesQuery.data.totalPages > 1 && (
                <div className="px-6 py-3 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    Page {bridgesQuery.data.page} of {bridgesQuery.data.totalPages} ({bridgesQuery.data.total} total)
                  </span>
                  <div className="space-x-2">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page >= bridgesQuery.data.totalPages}
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

      {/* Right: Detail Panel */}
      {selectedBridge && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col max-h-screen sticky top-6">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Bridge Details</h3>
            <button
              onClick={() => setSelectedBridge(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <ChevronDown size={20} className="rotate-180" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Status Info */}
            <div>
              <h4 className="text-xs font-semibold text-gray-700 uppercase mb-3">Status</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Factory ID:</span>
                  <span className="font-medium">{selectedBridge.factory_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      statusColors[selectedBridge.status] || 'bg-gray-100'
                    }`}
                  >
                    {selectedBridge.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Version:</span>
                  <span className="font-mono text-sm">{selectedBridge.bridge_version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Queue Depth:</span>
                  <span className="font-medium">{selectedBridge.queue_depth} records</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Syncs:</span>
                  <span className="font-medium">{selectedBridge.sync_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Heartbeat:</span>
                  <span className="text-sm">{formatDate(selectedBridge.last_heartbeat)}</span>
                </div>
              </div>
            </div>

            {/* Health Probes */}
            {bridgeDetailQuery.data && bridgeDetailQuery.data !== null && (bridgeDetailQuery.data as BridgeDetail).health_probes?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-700 uppercase mb-3">Health Checks</h4>
                <div className="space-y-2">
                  {((bridgeDetailQuery.data as unknown) as BridgeDetail).health_probes.map((probe, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-md border ${
                        (probe as typeof probe).status === 'PASS'
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className={`text-sm font-medium ${probe.status === 'PASS' ? 'text-green-900' : 'text-red-900'}`}>
                            {probe.check_name}
                          </p>
                          {probe.error_message && (
                            <p className="text-xs text-red-700 mt-1">{probe.error_message}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-600">{probe.duration_ms}ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Syncs */}
            {bridgeDetailQuery.data && bridgeDetailQuery.data !== null && (bridgeDetailQuery.data as BridgeDetail).recent_syncs?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-700 uppercase mb-3">Recent Syncs</h4>
                <div className="space-y-2 text-xs max-h-40 overflow-y-auto">
                  {((bridgeDetailQuery.data as unknown) as BridgeDetail).recent_syncs.map((sync) => (
                    <div key={sync.id} className="p-2 bg-gray-50 rounded border border-gray-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">
                            {sync.record_count} records
                            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                              sync.status === 'COMPLETED'
                                ? 'bg-green-100 text-green-700'
                                : sync.status === 'FAILED'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {sync.status}
                            </span>
                          </p>
                          <p className="text-gray-600 mt-1">{formatDate(sync.started_at)}</p>
                          {sync.error && <p className="text-red-600 mt-1">{sync.error}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={() => resyncMutation.mutate(selectedBridge.id)}
                disabled={resyncMutation.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <RotateCcw size={14} />
                Trigger Resync
              </button>
              <button
                onClick={() => restartMutation.mutate(selectedBridge.id)}
                disabled={restartMutation.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                <Zap size={14} />
                Restart Bridge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
