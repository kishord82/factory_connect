/**
 * Date formatting utility — Indian locale (dd/MM/yyyy).
 */

/** Format a date value to dd/MM/yyyy. Returns '—' for invalid/null dates. */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
