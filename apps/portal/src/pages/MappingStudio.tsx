import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { useAuth, canWrite } from '../lib/auth.js';
import { formatDate } from '../utils/date.js';
import { TableLoading, TableEmpty, TableError } from '../components/common/TableStates.js';
import {
  ChevronDown,
  Copy,
  Zap,
  Save,
  Play,
} from 'lucide-react';

interface MappingField {
  name: string;
  type: string;
  required: boolean;
}

interface FieldMapping {
  source_field: string;
  target_field: string;
  transform_rule: string | null;
}

interface MappingConfig {
  id: string;
  mapping_name: string;
  source_type: string;
  target_type: string;
  field_mappings: FieldMapping[];
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface AvailableFields {
  source: MappingField[];
  target: MappingField[];
}

interface TestMappingPayload {
  sample_data: Record<string, unknown>;
  mapping_config: FieldMapping[];
}

interface TestMappingResponse {
  result: Record<string, unknown>;
  warnings: string[];
}

const transformRuleExamples: Record<string, string> = {
  UPPERCASE: 'Convert to uppercase',
  LOWERCASE: 'Convert to lowercase',
  TRIM: 'Trim whitespace',
  ROUND_2: 'Round to 2 decimals',
  DATE_ISO: 'Convert to ISO date',
  CONCAT_FIRST_LAST: 'Concatenate first and last name',
  GSTIN_FORMAT: 'Format as GSTIN',
  PAN_FORMAT: 'Format as PAN',
};

export function MappingStudio() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'gallery' | 'editor'>('gallery');
  const [, setSelectedMapping] = useState<MappingConfig | null>(null);
  const [currentMappings, setCurrentMappings] = useState<FieldMapping[]>([]);
  const [availableFields, setAvailableFields] = useState<AvailableFields>({ source: [], target: [] });
  const [testData, setTestData] = useState<Record<string, unknown>>({});
  const [testResult, setTestResult] = useState<TestMappingResponse | null>(null);
  const [showTest, setShowTest] = useState(false);
  const [newMappingName, setNewMappingName] = useState('');

  const mappingsQuery = useQuery({
    queryKey: ['mappings'],
    queryFn: () => api.get<{ data: MappingConfig[]; total: number }>('/mappings'),
  });

  const fieldsQuery = useQuery<AvailableFields, Error, AvailableFields>({
    queryKey: ['mappings', 'available-fields'],
    queryFn: () => api.get<AvailableFields>('/mappings/available-fields'),
  });

  // Update available fields when query succeeds
  useEffect(() => {
    if (fieldsQuery.data) {
      setAvailableFields(fieldsQuery.data);
    }
  }, [fieldsQuery.data]);

  const suggestMutation = useMutation({
    mutationFn: (sourceFields: string[]) =>
      api.post<{ suggestions: FieldMapping[] }>('/mappings/suggest', { source_fields: sourceFields }),
  });

  const saveMutation = useMutation({
    mutationFn: (args: { name: string; mappings: FieldMapping[] }) =>
      api.post(`/mappings`, {
        mapping_name: args.name,
        field_mappings: args.mappings
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mappings'] });
      setCurrentMappings([]);
      setSelectedMapping(null);
      setNewMappingName('');
    },
  });

  const testMutation = useMutation({
    mutationFn: (payload: TestMappingPayload) =>
      api.post<TestMappingResponse>('/mappings/test', payload),
    onSuccess: (data) => setTestResult(data),
  });

  const deleteMutation = useMutation({
    mutationFn: (mappingId: string) => api.delete(`/mappings/${mappingId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mappings'] });
      setSelectedMapping(null);
    },
  });

  const handleSelectMapping = (mapping: MappingConfig) => {
    setSelectedMapping(mapping);
    setCurrentMappings(mapping.field_mappings);
    setActiveTab('editor');
  };

  const handleAddMapping = (sourceField: string) => {
    const exists = currentMappings.find(m => m.source_field === sourceField);
    if (!exists) {
      setCurrentMappings([...currentMappings, {
        source_field: sourceField,
        target_field: '',
        transform_rule: null,
      }]);
    }
  };

  const handleUpdateMapping = (index: number, field: keyof FieldMapping, value: string | null) => {
    const updated = [...currentMappings];
    updated[index] = { ...updated[index], [field]: value };
    setCurrentMappings(updated);
  };

  const handleRemoveMapping = (index: number) => {
    setCurrentMappings(currentMappings.filter((_, i) => i !== index));
  };

  const handleSuggestMappings = () => {
    const sourceFields = availableFields.source.map(f => f.name);
    suggestMutation.mutate(sourceFields, {
      onSuccess: (data) => {
        setCurrentMappings(data.suggestions);
      },
    });
  };

  const handleTestMapping = () => {
    testMutation.mutate({
      sample_data: testData,
      mapping_config: currentMappings,
    });
  };

  const handleSaveMapping = () => {
    if (!newMappingName.trim() || currentMappings.length === 0) {
      alert('Please enter a mapping name and add field mappings');
      return;
    }
    saveMutation.mutate({
      name: newMappingName,
      mappings: currentMappings,
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Mapping Studio</h2>
        {canWrite(user) && (
          <button
            onClick={() => setActiveTab('editor')}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + New Mapping
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('gallery')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'gallery' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Mapping Gallery
        </button>
        <button
          onClick={() => setActiveTab('editor')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'editor' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Field Editor
        </button>
      </div>

      {/* Gallery Tab */}
      {activeTab === 'gallery' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {mappingsQuery.isLoading ? (
            <TableLoading message="Loading mapping configs..." />
          ) : mappingsQuery.isError ? (
            <TableError
              message={mappingsQuery.error instanceof Error ? mappingsQuery.error.message : 'Unknown error'}
              onRetry={() => mappingsQuery.refetch()}
            />
          ) : !mappingsQuery.data?.data?.length ? (
            <TableEmpty entity="mapping configurations" />
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fields Mapped</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Updated</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {mappingsQuery.data.data.map((mapping) => (
                  <tr key={mapping.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{mapping.mapping_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{mapping.source_type}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{mapping.target_type}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{mapping.field_mappings.length}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{mapping.created_by}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(mapping.updated_at)}</td>
                    <td className="px-6 py-4 text-sm flex gap-2">
                      <button
                        onClick={() => handleSelectMapping(mapping)}
                        className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                      >
                        Edit
                      </button>
                      {canWrite(user) && (
                        <button
                          onClick={() => deleteMutation.mutate(mapping.id)}
                          disabled={deleteMutation.isPending}
                          className="px-3 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Editor Tab */}
      {activeTab === 'editor' && (
        <div className="grid grid-cols-3 gap-6">
          {/* Left Panel: Source Fields */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Source Fields (ERP)</h3>
            </div>
            <div className="overflow-y-auto max-h-96">
              {fieldsQuery.isLoading ? (
                <div className="p-4 text-center text-gray-500 text-sm">Loading fields...</div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {availableFields.source.map((field) => (
                    <li
                      key={field.name}
                      className="px-6 py-3 hover:bg-gray-50 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{field.name}</p>
                          <p className="text-xs text-gray-500">{field.type}</p>
                        </div>
                        {!currentMappings.find(m => m.source_field === field.name) && (
                          <button
                            onClick={() => handleAddMapping(field.name)}
                            className="text-gray-400 group-hover:text-indigo-600 transition-colors"
                          >
                            <Copy size={16} />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Middle Panel: Field Mappings */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Mappings</h3>
              {canWrite(user) && (
                <button
                  onClick={handleSuggestMappings}
                  disabled={suggestMutation.isPending}
                  className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors disabled:opacity-50"
                  title="Use AI to suggest field mappings"
                >
                  <Zap size={14} />
                  Suggest AI
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {currentMappings.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-8">
                  <p>Select source fields from the left to create mappings</p>
                </div>
              ) : (
                currentMappings.map((mapping, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 mb-1">Source</p>
                        <p className="text-sm text-gray-900 font-medium">{mapping.source_field}</p>
                      </div>
                      {canWrite(user) && (
                        <button
                          onClick={() => handleRemoveMapping(idx)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <ChevronDown size={16} className="rotate-180" />
                        </button>
                      )}
                    </div>

                    <select
                      value={mapping.target_field}
                      onChange={(e) => handleUpdateMapping(idx, 'target_field', e.target.value)}
                      disabled={!canWrite(user)}
                      className="w-full mb-2 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select target field</option>
                      {availableFields.target.map((field) => (
                        <option key={field.name} value={field.name}>
                          {field.name} ({field.type})
                        </option>
                      ))}
                    </select>

                    <select
                      value={mapping.transform_rule || ''}
                      onChange={(e) => handleUpdateMapping(idx, 'transform_rule', e.target.value || null)}
                      disabled={!canWrite(user)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">No transformation</option>
                      {Object.entries(transformRuleExamples).map(([rule, label]) => (
                        <option key={rule} value={rule}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))
              )}
            </div>

            {canWrite(user) && currentMappings.length > 0 && (
              <div className="border-t border-gray-200 p-4 space-y-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mapping Name</label>
                  <input
                    type="text"
                    value={newMappingName}
                    onChange={(e) => setNewMappingName(e.target.value)}
                    placeholder="e.g., Tally to Canonical Order"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveMapping}
                    disabled={saveMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    <Save size={16} />
                    Save Config
                  </button>
                  <button
                    onClick={() => setShowTest(!showTest)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    <Play size={16} />
                    Test
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Target Fields & Preview */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Target Fields (Canonical)</h3>
            </div>
            <div className="overflow-y-auto max-h-96">
              {fieldsQuery.isLoading ? (
                <div className="p-4 text-center text-gray-500 text-sm">Loading fields...</div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {availableFields.target.map((field) => {
                    const mapped = currentMappings.find(m => m.target_field === field.name);
                    return (
                      <li
                        key={field.name}
                        className={`px-6 py-3 ${mapped ? 'bg-indigo-50' : 'hover:bg-gray-50'} transition-colors`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{field.name}</p>
                            <p className="text-xs text-gray-500">{field.type}</p>
                            {mapped && (
                              <p className="text-xs text-indigo-600 mt-0.5">
                                ← {mapped.source_field}
                                {mapped.transform_rule && ` (${mapped.transform_rule})`}
                              </p>
                            )}
                          </div>
                          {field.required && !mapped && (
                            <span className="text-xs text-red-600 font-medium">Required</span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Test Results Preview */}
            {showTest && (
              <div className="border-t border-gray-200 p-4">
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-2">Test Sample Data (JSON)</label>
                  <textarea
                    value={JSON.stringify(testData, null, 2)}
                    onChange={(e) => setTestData(JSON.parse(e.target.value || '{}'))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 max-h-32"
                    placeholder="{}"
                  />
                  <button
                    onClick={handleTestMapping}
                    disabled={testMutation.isPending || Object.keys(testData).length === 0}
                    className="mt-2 w-full px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors disabled:opacity-50"
                  >
                    Run Test
                  </button>
                </div>

                {testResult && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-xs font-medium text-green-800 mb-2">Result:</p>
                    <pre className="text-xs text-green-700 overflow-x-auto bg-white p-2 rounded border border-green-100 max-h-40">
                      {JSON.stringify(testResult.result, null, 2)}
                    </pre>
                    {testResult.warnings.length > 0 && (
                      <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                        <p className="text-xs font-medium text-yellow-800">Warnings:</p>
                        {testResult.warnings.map((w, i) => (
                          <p key={i} className="text-xs text-yellow-700">{w}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
