import { Circle } from 'lucide-react';

interface HealthIndicatorProps {
  status: 'healthy' | 'warning' | 'critical';
  label?: string;
  lastUpdated?: string;
  className?: string;
}

const statusStyles = {
  healthy: {
    dot: 'bg-green-500',
    text: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-200',
  },
  warning: {
    dot: 'bg-yellow-500',
    text: 'text-yellow-700',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
  },
  critical: {
    dot: 'bg-red-500',
    text: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
};

const statusLabels = {
  healthy: 'Healthy',
  warning: 'Warning',
  critical: 'Critical',
};

export function HealthIndicator({
  status,
  label,
  lastUpdated,
  className = '',
}: HealthIndicatorProps) {
  const styles = statusStyles[status];

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${styles.bg} ${styles.border} ${className}`}
      title={lastUpdated ? `Last updated: ${lastUpdated}` : undefined}
    >
      <Circle size={12} className={`${styles.dot} fill-current`} />
      <span className={`text-sm font-medium ${styles.text}`}>
        {label || statusLabels[status]}
      </span>
    </div>
  );
}
