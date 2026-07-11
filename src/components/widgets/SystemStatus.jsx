import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { useSolar } from "../../context/SolarContext";
import { fmtW } from "../../utils/format";

const STATUS = {
  normal: { icon: CheckCircle, color: "#10b981", label: "Optimaal" },
  meter:  { icon: AlertTriangle, color: "#f59e0b", label: "Meetfout" },
  micro:  { icon: AlertTriangle, color: "#f97316", label: "Omvormer" },
  power:  { icon: XCircle,      color: "#ef4444", label: "Geen stroom" },
};

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontSize: 13, color: "var(--txt-3)" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--txt-2)" }}>{value ?? "—"}</span>
    </div>
  );
}

export default function SystemStatus() {
  const { summary, devices, alerts } = useSolar();
  const cfg = STATUS[summary?.status] || STATUS.normal;
  const Icon = cfg.icon;

  return (
    <div className="card" style={{ padding: 20, height: "100%" }}>
      <p className="section-title" style={{ marginBottom: 16 }}>Systeemstatus</p>

      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, marginBottom: 16, background: `${cfg.color}14` }}>
        <Icon size={15} style={{ color: cfg.color, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
      </div>

      <div>
        <Row label="Vermogen nu"  value={fmtW(summary?.current_power || 0)} />
        <Row label="Capaciteit"   value={summary ? `${(summary.size_w/1000).toFixed(1)} kWp` : "—"} />
        <Row label="Panelen"      value={summary?.modules} />
        <Row label="Apparaten"    value={devices.length || "—"} />
        <Row label="Type"         value="IQ Gateway" />
      </div>

      {alerts.length > 0 && (
        <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(59,130,246,0.08)", borderRadius: 8, fontSize: 12, color: "#3b82f6" }}>
          {alerts[0]?.message || alerts[0]}
        </div>
      )}
    </div>
  );
}
