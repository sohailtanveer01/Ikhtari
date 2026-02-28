export type ActiveStatus = "now" | "today" | "week" | "old" | null;

export interface LastActiveInfo {
  label: string;       // e.g. "Active now", "Active 3h ago"
  status: ActiveStatus; // drives dot colour
  dotColor: string;
}

export function formatLastActive(lastActiveAt: string | null | undefined): LastActiveInfo | null {
  if (!lastActiveAt) return null;

  const diff = Date.now() - new Date(lastActiveAt).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 5) {
    return { label: "Active now", status: "now", dotColor: "#22C55E" };
  }
  if (minutes < 60) {
    return { label: `Active ${minutes}m ago`, status: "now", dotColor: "#22C55E" };
  }
  if (hours < 24) {
    return { label: `Active ${hours}h ago`, status: "today", dotColor: "#F59E0B" };
  }
  if (days < 7) {
    return { label: `Active ${days}d ago`, status: "week", dotColor: "#9CA3AF" };
  }
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return { label: `Active ${weeks}w ago`, status: "old", dotColor: "#D1D5DB" };
  }
  // Older than a month — omit to avoid putting users off
  return null;
}
