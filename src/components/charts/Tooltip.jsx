export default function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card" style={{ padding: "10px 14px", minWidth: 130, pointerEvents: "none" }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--txt-2)", marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0 }} />
          <span style={{ color: "var(--txt-3)" }}>{p.name}:</span>
          <span style={{ fontWeight: 600, color: "var(--txt)" }}>
            {formatter ? formatter(p.value, p.name) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}
