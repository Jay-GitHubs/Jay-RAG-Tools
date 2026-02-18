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
