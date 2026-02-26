/** Format an ISO 8601 timestamp as relative time (e.g. "2 minutes ago") or local date. */
export function timeAgo(iso: string): string {
  const date = new Date(iso);
  const now = Date.now();
  const diffMs = now - date.getTime();

  if (isNaN(diffMs)) return iso;

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  // Older than a week — show local date
  return date.toLocaleDateString();
}

/** Format an ISO 8601 timestamp as a full local datetime string. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

/** Format a duration in seconds as a human-readable string, e.g. "2m 34s", "1h 5m". */
export function formatDuration(seconds: number): string {
  if (seconds < 1) return "< 1s";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hours}h ${remainMins}m` : `${hours}h`;
}

/** Compute elapsed seconds from an ISO timestamp to now. */
export function elapsedSince(iso: string): number {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return 0;
  return Math.max(0, (Date.now() - date.getTime()) / 1000);
}
