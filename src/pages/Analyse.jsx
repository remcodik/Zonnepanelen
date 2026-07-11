import { useEffect, useMemo } from "react";
import {
  ComposedChart, Bar, Line, LineChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import { useSolar } from "../context/SolarContext";
import { useTheme } from "../context/ThemeContext";
import KpiCard from "../components/ui/KpiCard";
import ChartTooltip from "../components/charts/Tooltip";
import Spinner from "../components/ui/Spinner";
import { co2Kg } from "../utils/format";

export default function Analyse() {
  const { summary, daily, monthly, loadData, loading } = useSolar();
  const { t } = useTheme();

  useEffect(() => { loadData(); }, [loadData]);

  // Monthly chart data — last 24 months with rolling 3m avg
  const monthlyChart = useMemo(() => {
    return monthly.map((d, i, arr) => {
      const sl = arr.slice(Math.max(0, i-2), i+1);
      const avg = Math.round(sl.reduce((s,x) => s+x.kwh, 0)/sl.length);
      return { ...d, avg };
    });
  }, [monthly]);

  // Year comparison: this year vs last year (by month number)
  const yearComp = useMemo(() => {
    const byYearMonth = {};
    monthly.forEach(d => {
      const [y, m] = d.month.split("-");
      if (!byYearMonth[y]) byYearMonth[y] = {};
      byYearMonth[y][m] = d.kwh;
    });
    const years = Object.keys(byYearMonth).sort();
    const thisYear = years[years.length-1];
    const lastYear = years[years.length-2];
    const MONTHS = ["01","02","03","04","05","06","07","08","09","10","11","12"];
    const NL_M = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];
    return MONTHS.map((m,i) => ({
      month: NL_M[i],
      ditJaar:   byYearMonth[thisYear]?.[m] || 0,
      vorigJaar: byYearMonth[lastYear]?.[m] || 0,
    })).filter(d => d.ditJaar > 0 || d.vorigJaar > 0);
  }, [monthly]);

  // Weekday pattern from daily data
  const weekdayData = useMemo(() => {
    const DAYS = ["Zo","Ma","Di","Wo","Do","Vr","Za"];
    const sums = Array(7).fill(0), counts = Array(7).fill(0);
    daily.forEach(d => {
      const day = new Date(d.date).getDay();
      sums[day] += d.wh_del || 0;
      counts[day]++;
    });
    return DAYS.map((dag, i) => ({
      dag, gem: counts[i] ? Math.round(sums[i]/counts[i]/1000*10)/10 : 0,
    }));
  }, [daily]);

  // Stats
  const thisYearKwh = useMemo(() => monthly.filter(m => m.month?.startsWith(new Date().getFullYear().toString())).reduce((s,d) => s+d.kwh, 0), [monthly]);
  const best = useMemo(() => monthly.reduce((b,d) => d.kwh > (b?.kwh||0) ? d : b, null), [monthly]);
  const avgPerDay = useMemo(() => daily.length ? +(daily.reduce((s,d) => s+(d.wh_del||0), 0)/daily.length/1000).toFixed(1) : 0, [daily]);

  if (loading && !monthly.length) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height: 320 }}>
      <Spinner size={36} />
    </div>
  );

  return (
    <div className="fade-up" style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 20 }}>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
        <KpiCard label="Dit jaar"     value={`${thisYearKwh} kWh`}       icon="📅" accentColor="var(--c1)" />
        <KpiCard label="Beste maand"  value={best?.label || "—"}          icon="🏆" accentColor="var(--c1)" />
        <KpiCard label="Gem. per dag" value={`${avgPerDay} kWh`}          icon="📊" accentColor="var(--c2)" />
        <KpiCard label="CO₂ dit jaar" value={`${co2Kg(thisYearKwh*1000)} kg`} icon="🌿" accentColor="var(--c3)" />
      </div>

      {/* Monthly bars + avg line */}
      <div className="card" style={{ padding: 20 }}>
        <p className="section-title" style={{ marginBottom: 4 }}>Maandelijkse productie</p>
        <p style={{ fontSize: 12, color: "var(--txt-4)", marginBottom: 16 }}>kWh + 3-maands gemiddelde</p>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={monthlyChart} margin={{ top:2, right:2, left:-24, bottom:0 }}>
            {t.showGrid && <CartesianGrid strokeDasharray="2 4" stroke="var(--border-2)" vertical={false} />}
            <XAxis dataKey="label" tick={{ fontSize:10, fill:"var(--txt-4)" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize:10, fill:"var(--txt-4)" }} tickLine={false} axisLine={false} />
            <Tooltip content={<ChartTooltip formatter={(v,n) => n==="avg" ? `${v} kWh gem.` : `${v} kWh`} />} />
            <Legend wrapperStyle={{ fontSize:11, color:"var(--txt-4)" }} iconType="circle" iconSize={7} />
            <Bar dataKey="kwh" name="Productie" fill={t.c1} radius={[3,3,0,0]} opacity={0.85} animationDuration={t.animate ? 700 : 0} />
            <Line dataKey="avg" name="3m gemiddeld" type="monotone" stroke={t.c2} strokeWidth={2} dot={false} strokeDasharray="4 3" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Year comparison + weekday pattern */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>

        <div className="card" style={{ padding:20 }}>
          <p className="section-title" style={{ marginBottom:4 }}>Dit jaar vs vorig jaar</p>
          <p style={{ fontSize:12, color:"var(--txt-4)", marginBottom:16 }}>kWh per maand</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={yearComp} margin={{ top:2, right:2, left:-28, bottom:0 }}>
              {t.showGrid && <CartesianGrid strokeDasharray="2 4" stroke="var(--border-2)" vertical={false} />}
              <XAxis dataKey="month" tick={{ fontSize:10, fill:"var(--txt-4)" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize:10, fill:"var(--txt-4)" }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip formatter={v => `${v} kWh`} />} />
              <Legend wrapperStyle={{ fontSize:11, color:"var(--txt-4)" }} iconType="circle" iconSize={7} />
              <Line dataKey="ditJaar"   name="Dit jaar"   type="monotone" stroke={t.c1} strokeWidth={2.5} dot={{ r:3, fill:t.c1 }} animationDuration={t.animate ? 800 : 0} />
              <Line dataKey="vorigJaar" name="Vorig jaar" type="monotone" stroke={t.c2} strokeWidth={2} dot={false} strokeDasharray="5 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ padding:20 }}>
          <p className="section-title" style={{ marginBottom:4 }}>Gem. productie per weekdag</p>
          <p style={{ fontSize:12, color:"var(--txt-4)", marginBottom:16 }}>kWh gemiddeld</p>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={weekdayData} margin={{ top:2, right:2, left:-28, bottom:0 }}>
              {t.showGrid && <CartesianGrid strokeDasharray="2 4" stroke="var(--border-2)" vertical={false} />}
              <XAxis dataKey="dag" tick={{ fontSize:10, fill:"var(--txt-4)" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize:10, fill:"var(--txt-4)" }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip formatter={v => `${v} kWh`} />} />
              <Bar dataKey="gem" name="Gem. kWh" fill={t.c3} radius={[3,3,0,0]} animationDuration={t.animate ? 700 : 0} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Milieu impact */}
      <div className="card" style={{ padding:20 }}>
        <p className="section-title" style={{ marginBottom:16 }}>Milieu-impact (lifetime)</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:12 }}>
          {[
            { icon:"🌳", label:"Equivalent bomen",           value:`${Math.round(co2Kg(summary?.energy_lifetime||0)/21)}` },
            { icon:"🚗", label:"Auto km vermeden",            value:`${Math.round(co2Kg(summary?.energy_lifetime||0)/0.12).toLocaleString("nl-NL")} km` },
            { icon:"✈️", label:"Vluchten AMS–Barcelona",     value:`${Math.round(co2Kg(summary?.energy_lifetime||0)/115)}` },
            { icon:"🏭", label:"CO₂ totaal vermeden",         value:`${co2Kg(summary?.energy_lifetime||0).toLocaleString("nl-NL")} kg` },
          ].map(item => (
            <div key={item.label} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", background:"var(--surface-2)", borderRadius:"var(--r-sm)", border:"1px solid var(--border)" }}>
              <span style={{ fontSize:22 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize:18, fontWeight:700, letterSpacing:"-0.02em", color:"var(--txt)" }}>{item.value}</div>
                <div style={{ fontSize:11, color:"var(--txt-4)", marginTop:2 }}>{item.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
