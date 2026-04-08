import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { Download } from 'lucide-react';

type ExportFormat = 'csv' | 'xlsx' | 'json';
type ExportEntity = 'orders' | 'shipments' | 'invoices' | 'connections';

interface ExportJob {
  job_id: string;
  status: string;
  download_url: string | null;
}

export function Export() {
  const [entity, setEntity] = useState<ExportEntity>('orders');
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [jobResult, setJobResult] = useState<ExportJob | null>(null);

  const exportMutation = useMutation({
    mutationFn: (params: { entity: ExportEntity; format: ExportFormat; date_from?: string; date_to?: string }) =>
      api.post<{ data: ExportJob }>('/export', params),
    onSuccess: (res) => {
      setJobResult(res.data);
    },
  });

  const handleExport = () => {
    setJobResult(null);
    exportMutation.mutate({
      entity,
      format,
      ...(dateFrom ? { date_from: dateFrom } : {}),
      ...(dateTo ? { date_to: dateTo } : {}),
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Export Data</h2>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data Entity</label>
            <select
              value={entity}
              onChange={(e) => setEntity(e.target.value as ExportEntity)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="orders">Orders</option>
              <option value="shipments">Shipments</option>
              <option value="invoices">Invoices</option>
              <option value="connections">Connections</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as ExportFormat)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="csv">CSV</option>
              <option value="xlsx">Excel (XLSX)</option>
              <option value="json">JSON</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date From (optional)</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date To (optional)</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <button
            onClick={handleExport}
            disabled={exportMutation.isPending}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {exportMutation.isPending ? 'Preparing export...' : 'Export'}
          </button>
        </div>

        {exportMutation.isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">Export failed. Please try again.</p>
          </div>
        )}

        {jobResult && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">Export ready</p>
              <p className="text-xs text-green-600 mt-1">Job ID: {jobResult.job_id}</p>
            </div>
            {jobResult.download_url && (
              <a
                href={jobResult.download_url}
                download
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
