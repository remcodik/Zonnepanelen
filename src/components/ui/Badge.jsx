const VARIANTS = {
  ok:    { bg: "rgba(16,185,129,0.10)", color: "#10b981" },
  warn:  { bg: "rgba(245,158,11,0.12)", color: "#f59e0b" },
  err:   { bg: "rgba(239,68,68,0.10)",  color: "#ef4444" },
  demo:  { bg: "rgba(245,158,11,0.12)", color: "#f59e0b" },
  info:  { bg: "rgba(59,130,246,0.10)", color: "#3b82f6" },
};

export default function Badge({ variant = "info", children }) {
  const s = VARIANTS[variant] || VARIANTS.info;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", ...s }}>
      {children}
    </span>
  );
}
