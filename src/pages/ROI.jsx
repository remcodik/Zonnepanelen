import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import { useTheme } from "../context/ThemeContext";
import ChartTooltip from "../components/charts/Tooltip";
import { fmtEur } from "../utils/format";

function NumInput({ label, value, onChange, prefix, suffix, step=1, min=0 }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, padding:"10px 0", borderBottom:"1px solid var(--border)" }}>
      <span style={{ fontSize:13, color:"var(--txt-3)" }}>{label}</span>
      <div style={{ display:"flex", alignItems:"center", gap:4 }}>
        {prefix && <span style={{ fontSize:12, color:"var(--txt-4)" }}>{prefix}</span>}
        <input type="number" value={value} min={min} step={step}
          onChange={e => onChange(Number(e.target.value))}
          className="input-base"
          style={{ width:80, textAlign:"right", padding:"5px 8px", fontSize:13, fontWeight:600 }}
        />
        {suffix && <span style={{ fontSize:12, color:"var(--txt-4)" }}>{suffix}</span>}
      </div>
    </div>
  );
}

export default function ROI() {
  const { t } = useTheme();
  const [kosten,      setKosten]      = useState(8500);
  const [subsidie,    setSubsidie]    = useState(1500);
  const [tarief,      setTarief]      = useState(0.32);
  const [teruglever,  setTeruglever]  = useState(0.09);
  const [jaarProd,    setJaarProd]    = useState(5200);
  const [eigenPct,    setEigenPct]    = useState(40);
  const [inflatie,    setInflatie]    = useState(3);
  const [levensduur,  setLevensduur]  = useState(25);

  const netto   = kosten - subsidie;
  const eigenKwh= jaarProd * eigenPct / 100;
  const terugKwh= jaarProd * (1 - eigenPct/100);

  const jaren = Array.from({length: levensduur}, (_, i) => {
    const tarInfl = tarief * Math.pow(1 + inflatie/100, i);
    const jOpbrengst = eigenKwh * tarInfl + terugKwh * teruglever;
    return { jaar: i+1, cum: Math.round(jOpbrengst * (i+1) - netto), jaar_o: Math.round(jOpbrengst) };
  });

  const terugverdien = jaren.find(j => j.cum >= 0);
  const totaal = jaren.reduce((s,j) => s + j.jaar_o, 0);
  const roi = +((totaal - netto) / netto * 100).toFixed(0);

  return (
    <div className="fade-up" style={{ maxWidth:1280, margin:"0 auto", padding:"24px 20px", display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ display:"grid", gridTemplateColumns:"320px 1fr", gap:20 }}>

        {/* Inputs */}
        <div className="card" style={{ padding:20 }}>
          <p className="section-title" style={{ marginBottom:4 }}>Jouw situatie</p>
          <p style={{ fontSize:12, color:"var(--txt-4)", marginBottom:16 }}>Pas de waarden aan voor jouw systeem</p>
          <NumInput label="Systeemkosten"     value={kosten}     onChange={setKosten}     prefix="€" step={100} />
          <NumInput label="Subsidie / SDE"    value={subsidie}   onChange={setSubsidie}   prefix="€" step={100} />
          <NumInput label="Stroomtarief"      value={tarief}     onChange={setTarief}     prefix="€" suffix="/kWh" step={0.01} />
          <NumInput label="Teruglevertarief"  value={teruglever} onChange={setTeruglever} prefix="€" suffix="/kWh" step={0.01} />
          <NumInput label="Jaarproductie"     value={jaarProd}   onChange={setJaarProd}   suffix="kWh" step={100} />
          <NumInput label="Eigen verbruik"    value={eigenPct}   onChange={setEigenPct}   suffix="%" min={0} />
          <NumInput label="Tariefstijging"    value={inflatie}   onChange={setInflatie}   suffix="% /j" step={0.5} />
          <NumInput label="Levensduur"        value={levensduur} onChange={setLevensduur} suffix="jaar" min={5} max={40} />
        </div>

        {/* Results */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
            {[
              { label:"Netto investering",   value: fmtEur(netto),                                   color: "var(--c1)" },
              { label:"Terugverdientijd",    value: terugverdien ? `${terugverdien.jaar} jaar` : ">25j", color: "var(--c2)" },
              { label:`ROI (${levensduur}j)`,value: `${roi}%`,                                       color: "var(--c3)" },
              { label:"Totale opbrengst",    value: fmtEur(totaal),                                  color: "var(--c3)" },
            ].map(k => (
              <div key={k.label} className="card" style={{ padding:16, textAlign:"center" }}>
                <div style={{ fontSize:"clamp(1.1rem,2.5vw,1.5rem)", fontWeight:700, letterSpacing:"-0.03em", color:k.color }}>{k.value}</div>
                <div style={{ fontSize:11, color:"var(--txt-4)", marginTop:6 }}>{k.label}</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding:20 }}>
            <p className="section-title" style={{ marginBottom:4 }}>Cumulatieve opbrengst</p>
            <p style={{ fontSize:12, color:"var(--txt-4)", marginBottom:16 }}>Netto winst na aftrek investering (€)</p>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={jaren} margin={{ top:4, right:2, left:-8, bottom:0 }}>
                <defs>
                  <linearGradient id="roiG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={t.c3} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={t.c3} stopOpacity={0}   />
                  </linearGradient>
                </defs>
                {t.showGrid && <CartesianGrid strokeDasharray="2 4" stroke="var(--border-2)" vertical={false} />}
                <XAxis dataKey="jaar" tick={{ fontSize:10, fill:"var(--txt-4)" }} tickLine={false} axisLine={false} tickFormatter={v=>`J${v}`} interval={4} />
                <YAxis tick={{ fontSize:10, fill:"var(--txt-4)" }} tickLine={false} axisLine={false} tickFormatter={v=>`€${Math.round(v/1000)}k`} />
                <Tooltip content={<ChartTooltip formatter={v => fmtEur(v)} />} />
                <ReferenceLine y={0} stroke="var(--txt-4)" strokeDasharray="4 3" />
                <Area type="monotone" dataKey="cum" name="Netto" stroke={t.c3} strokeWidth={2} fill="url(#roiG)" animationDuration={t.animate ? 1000 : 0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
