export default function KpiCard({ label, value, sub, trend, icon, accentColor, onClick }) {
  const color = accentColor || "var(--c1)";
  return (
    <div
      className="card card-hover"
      onClick={onClick}
      style={{ padding: "20px", cursor: onClick ? "pointer" : "default", position: "relative", overflow: "hidden" }}
    >
      {/* Top accent line */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: color, borderRadius: "var(--r-md) var(--r-md) 0 0" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <span className="label">{label}</span>
        {icon && <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>}
      </div>

      <div style={{ fontSize: "clamp(1.5rem,4vw,2rem)", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--txt)", lineHeight: 1, marginBottom: 8 }}>
        {value}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {trend != null && (
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "2px 6px", borderRadius: 6,
            background: trend >= 0 ? "rgba(16,185,129,0.10)" : "rgba(239,68,68,0.10)",
            color: trend >= 0 ? "#10b981" : "#ef4444",
          }}>
            {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
          </span>
        )}
        {sub && <span style={{ fontSize: 12, color: "var(--txt-4)" }}>{sub}</span>}
      </div>
    </div>
  );
}
