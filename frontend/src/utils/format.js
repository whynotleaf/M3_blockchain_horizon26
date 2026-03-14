export const fmtINR = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n || 0);

export const fmtNum = (n) =>
  new Intl.NumberFormat("en-IN").format(n || 0);

export const fmtPct = (n) =>
  `${n >= 0 ? "+" : ""}${(n || 0).toFixed(2)}%`;

export const fmtTime = (ms) => {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

export const shortHash = (h) => h ? `${h.substring(0, 8)}...${h.slice(-6)}` : "—";

export const statusColor = (s) => {
  const map = {
    SETTLED: "badge-green", PENDING: "badge-yellow", SETTLING: "badge-blue",
    FAILED: "badge-red", FLAGGED: "badge-red", MATCHED: "badge-blue",
    NO_MATCH: "badge-gray"
  };
  return map[s] || "badge-gray";
};

export const timeSince = (dateStr) => {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  return `${Math.floor(diff/3600)}h ago`;
};
