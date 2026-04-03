/** Reusable empty state, error state, and loading state for data tables */

export function TableLoading({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="p-12 text-center">
      <div className="inline-flex items-center gap-2 text-gray-500">
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm">{message}</span>
      </div>
    </div>
  );
}

export function TableEmpty({ entity = 'records' }: { entity?: string }) {
  return (
    <div className="p-12 text-center">
      <p className="text-gray-400 text-sm">No {entity} found</p>
      <p className="text-gray-300 text-xs mt-1">Data will appear here once {entity} are created.</p>
    </div>
  );
}

export function TableError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="p-12 text-center">
      <p className="text-red-500 text-sm font-medium">Failed to load data</p>
      <p className="text-red-400 text-xs mt-1">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 px-4 py-1.5 text-sm bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
