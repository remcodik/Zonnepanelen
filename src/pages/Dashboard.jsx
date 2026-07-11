import { useEffect } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useSolar } from "../context/SolarContext";
import { useTheme } from "../context/ThemeContext";
import KpiCard from "../components/ui/KpiCard";
import SystemStatus from "../components/widgets/SystemStatus";
import ChartTooltip from "../components/charts/Tooltip";
import Spinner from "../components/ui/Spinner";
import { fmtW, fmtKwh, fmtEur, co2Kg, savings } from "../utils/format";

export default function Dashboard() {
  const { summary, daily, hourly, loadData, loading, error } = useSolar();
  const { t } = useTheme();

  useEffect(() => { loadData(); }, [loadData]);

  if (loading && !summary) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 320 }}>
      <Spinner size={36} />
    </div>
  );

  if (error) return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: 24 }}>
      <div style={{ padding: 16, borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 14 }}>
        <strong>Fout bij laden:</strong> {error}
      </div>
    </div>
  );

  const lf = summary?.energy_lifetime || 0;

  // Prep chart data — last 30 days
  const dailyChart = daily.slice(-30).map(d => ({ date: d.date?.slice(5), wh: d.wh_del || 0 }));
  const hourlyChart = hourly;
  const peakW = Math.max(...hourlyChart.map(h => h.watt), 1);

  return (
    <div className="fade-up" style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 20 }}>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <KpiCard label="Nu opgewekt"     value={fmtW(summary?.current_power || 0)} sub="huidig vermogen" icon="⚡" accentColor="var(--c1)" trend={null} />
        <KpiCard label="Vandaag"          value={fmtKwh(summary?.energy_today || 0)} sub="totaal vandaag"   icon="☀️" accentColor="var(--c1)" trend={12} />
        <KpiCard label="CO₂ bespaard"    value={`${co2Kg(lf).toLocaleString("nl-NL")} kg`} sub="lifetime" icon="🌿" accentColor="var(--c3)" />
        <KpiCard label="Totale besparing" value={fmtEur(savings(lf))} sub="lifetime"            icon="💶" accentColor="var(--c3)" />
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Daily production area */}
        <div className="card" style={{ padding: 20 }}>
          <p className="section-title" style={{ marginBottom: 4 }}>Productie afgelopen 30 dagen</p>
          <p style={{ fontSize: 12, color: "var(--txt-4)", marginBottom: 16 }}>kWh per dag</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dailyChart} margin={{ top: 2, right: 2, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={t.c1} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={t.c1} stopOpacity={0}   />
                </linearGradient>
              </defs>
              {t.showGrid && <CartesianGrid strokeDasharray="2 4" stroke="var(--border-2)" vertical={false} />}
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--txt-4)" }} tickLine={false} axisLine={false} interval={5} />
              <YAxis tick={{ fontSize: 10, fill: "var(--txt-4)" }} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip formatter={(v) => `${(v/1000).toFixed(1)} kWh`} />} />
              <Area type={t.smoothLines ? "monotone" : "linear"} dataKey="wh" name="Productie" stroke={t.c1} strokeWidth={2} fill="url(#g1)" animationDuration={t.animate ? 800 : 0} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly bar */}
        <div className="card" style={{ padding: 20 }}>
          <p className="section-title" style={{ marginBottom: 4 }}>Vandaag per uur</p>
          <p style={{ fontSize: 12, color: "var(--txt-4)", marginBottom: 16 }}>Watt productie</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hourlyChart} margin={{ top: 2, right: 2, left: -28, bottom: 0 }}>
              {t.showGrid && <CartesianGrid strokeDasharray="2 4" stroke="var(--border-2)" vertical={false} />}
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "var(--txt-4)" }} tickLine={false} axisLine={false} tickFormatter={v => `${v}h`} interval={3} />
              <YAxis tick={{ fontSize: 10, fill: "var(--txt-4)" }} tickLine={false} axisLine={false} tickFormatter={v => `${v}W`} />
              <Tooltip content={<ChartTooltip formatter={(v) => `${v} W`} />} />
              <Bar dataKey="watt" name="Vermogen" radius={[3,3,0,0]} animationDuration={t.animate ? 800 : 0}>
                {hourlyChart.map((e, i) => (
                  <Cell key={i} fill={t.c1} fillOpacity={e.watt === 0 ? 0.08 : 0.2 + (e.watt/peakW)*0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row: lifetime + system */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "start" }}>
        {/* Lifetime summary */}
        <div className="card" style={{ padding: 24, background: `linear-gradient(135deg, ${t.c1}0a, ${t.c3}07)`, border: `1px solid ${t.c1}25` }}>
          <p className="label" style={{ marginBottom: 20 }}>Lifetime overzicht</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
            {[
              { label: "Totaal geproduceerd", value: fmtKwh(lf) },
              { label: "Kostenbesparing",     value: fmtEur(savings(lf)) },
              { label: "CO₂ vermeden",        value: `${co2Kg(lf).toLocaleString("nl-NL")} kg` },
            ].map(k => (
              <div key={k.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "clamp(1.2rem,3vw,1.6rem)", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--txt)" }}>{k.value}</div>
                <div style={{ fontSize: 11, color: "var(--txt-4)", marginTop: 4 }}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ minWidth: 240, maxWidth: 300 }}>
          <SystemStatus />
        </div>
      </div>
    </div>
  );
}
