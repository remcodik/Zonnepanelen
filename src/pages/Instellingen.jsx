import { useState } from "react";
import { Key, Palette, BarChart2, Download, Trash2, RotateCcw, CheckCircle } from "lucide-react";
import { useSolar } from "../context/SolarContext";
import { useTheme } from "../context/ThemeContext";
import { enlightenApi } from "../services/enlightenApi";
import { loggerApi } from "../services/loggerApi";
import { format } from "date-fns";

function Section({ title, icon: Icon, children }) {
  return (
    <div className="card" style={{ padding:24 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20 }}>
        <Icon size={15} style={{ color:"var(--txt-3)" }} />
        <p className="section-title">{title}</p>
      </div>
      {children}
    </div>
  );
}

function ColorRow({ label, themeKey }) {
  const { t, update } = useTheme();
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid var(--border)" }}>
      <span style={{ fontSize:13, color:"var(--txt-3)" }}>{label}</span>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:11, fontFamily:"monospace", color:"var(--txt-4)" }}>{t[themeKey]}</span>
        <div style={{ position:"relative", width:32, height:32 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:t[themeKey], border:"2px solid var(--border-2)", cursor:"pointer" }} />
          <input type="color" value={t[themeKey]} onChange={e => update({ [themeKey]:e.target.value })}
            style={{ position:"absolute", inset:0, opacity:0, width:"100%", height:"100%", cursor:"pointer" }} />
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, sub, themeKey }) {
  const { t, update } = useTheme();
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid var(--border)" }}>
      <div>
        <p style={{ fontSize:13, color:"var(--txt-2)" }}>{label}</p>
        {sub && <p style={{ fontSize:11, color:"var(--txt-4)", marginTop:2 }}>{sub}</p>}
      </div>
      <button className={`toggle ${t[themeKey] ? "on" : ""}`} onClick={() => update({ [themeKey]: !t[themeKey] })} />
    </div>
  );
}

export default function Instellingen() {
  const { connect, disconnect, connectLogger, disconnectLogger, daily } = useSolar();
  const cloudOk = enlightenApi.isConfigured;
  const loggerOk = loggerApi.isConfigured;
  const { t, update, reset } = useTheme();
  const [token,    setToken]    = useState("");
  const [apiKey,   setApiKey]   = useState("");
  const [systemId, setSystemId] = useState(enlightenApi.systemId || "");
  const [baseUrl,  setBaseUrl]  = useState(enlightenApi.baseUrl || "");
  const [lgUrl,    setLgUrl]    = useState(loggerApi.url || "");
  const [lgKey,    setLgKey]    = useState("");
  const [lgSaved,  setLgSaved]  = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [exDone,   setExDone]   = useState(false);

  function handleConnect(e) {
    e.preventDefault();
    // Bij een bestaande koppeling mogen velden leeg blijven (bv. alleen token verversen)
    const missing = !(token.trim() || enlightenApi.hasToken) || !(apiKey.trim() || enlightenApi.hasApiKey) || !(systemId.trim() || enlightenApi.systemId);
    if (missing) return;
    connect({ token, apiKey, systemId, baseUrl });
    setToken(""); setApiKey("");
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function handleLogger(e) {
    e.preventDefault();
    if (!(lgUrl.trim() || loggerApi.url) || !(lgKey.trim() || loggerApi.hasKey)) return;
    connectLogger({ url: lgUrl, key: lgKey });
    setLgKey("");
    setLgSaved(true);
    setTimeout(() => setLgSaved(false), 3000);
  }

  function handleExport() {
    const rows = [["Datum","Productie (Wh)","Productie (kWh)"],
      ...daily.map(d => [d.date, d.wh_del, (d.wh_del/1000).toFixed(2)])];
    const csv = rows.map(r => r.join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type:"text/csv;charset=utf-8;" }));
    a.download = `zonnepanelen_${format(new Date(),"yyyy-MM-dd")}.csv`;
    a.click();
    setExDone(true);
    setTimeout(() => setExDone(false), 2500);
  }

  return (
    <div className="fade-up" style={{ maxWidth:800, margin:"0 auto", padding:"24px 20px", display:"flex", flexDirection:"column", gap:20 }}>

      <Section title="Enphase Enlighten API" icon={Key}>
        <div style={{ padding:"12px 14px", borderRadius:10, marginBottom:20, fontSize:13, border:"1px solid", ...(cloudOk ? { background:"rgba(16,185,129,0.07)", borderColor:"rgba(16,185,129,0.2)", color:"#10b981" } : { background:"rgba(245,158,11,0.07)", borderColor:"rgba(245,158,11,0.2)", color:"#d97706" }) }}>
          {cloudOk
            ? "✓ Gekoppeld — gegevens staan in je browser. Een access token is 1 dag geldig: vernieuw alleen het token als de data stopt met laden."
            : "Nog niet gekoppeld. Vul token, API key en System ID in — wordt opgeslagen in localStorage."}
        </div>

        <form onSubmit={handleConnect} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--txt-4)", display:"block", marginBottom:6 }}>
              Access Token (Bearer)
            </label>
            <input type="password" className="input-base" value={token} onChange={e => setToken(e.target.value)}
              placeholder={cloudOk ? "••••••• (reeds opgeslagen)" : "eyJ0eXAiOiJKV1Q..."} />
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--txt-4)", display:"block", marginBottom:6 }}>
              API key (van je developer-applicatie)
            </label>
            <input type="password" className="input-base" value={apiKey} onChange={e => setApiKey(e.target.value)}
              placeholder={enlightenApi.hasApiKey ? "••••••• (reeds opgeslagen)" : "API key"} />
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--txt-4)", display:"block", marginBottom:6 }}>
              System ID
            </label>
            <input type="text" className="input-base" value={systemId} onChange={e => setSystemId(e.target.value)} placeholder="12345" />
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--txt-4)", display:"block", marginBottom:6 }}>
              Proxy-URL (optioneel)
            </label>
            <input type="text" className="input-base" value={baseUrl} onChange={e => setBaseUrl(e.target.value)}
              placeholder="https://api.enphaseenergy.com/api/v4 (standaard)" />
          </div>
          <div style={{ display:"flex", gap:8, paddingTop:4 }}>
            <button type="submit" className="btn-primary">
              {saved ? <><CheckCircle size={14} /> Opgeslagen</> : cloudOk ? "Bijwerken" : "Verbinden"}
            </button>
            {cloudOk && (
              <button type="button" className="btn-ghost" onClick={disconnect}>
                <Trash2 size={13} /> Ontkoppelen
              </button>
            )}
          </div>
        </form>

        <div style={{ marginTop:20, padding:"14px 16px", background:"var(--surface-2)", borderRadius:10, fontSize:12, color:"var(--txt-3)", lineHeight:1.7 }}>
          <strong style={{ color:"var(--txt-2)" }}>Hoe je de token krijgt:</strong><br />
          1. Maak een account op <strong>developer.enphase.com</strong><br />
          2. Maak een applicatie aan → kies OAuth 2.0<br />
          3. Kopieer de <strong>API key</strong> van je applicatie<br />
          4. Autoriseer de app voor je systeem en kopieer het access token (1 dag geldig)<br />
          5. Je System ID vind je in de URL van enlightenmanager.enphaseenergy.com
        </div>
      </Section>

      <Section title="Eigen logger (Raspberry Pi)" icon={Key}>
        <p style={{ fontSize:13, color:"var(--txt-3)", marginBottom:16, lineHeight:1.6 }}>
          Lees je Envoy lokaal uit via een eigen logger — geen Enphase developer-account nodig. Zie <strong>logger/README.md</strong>.
          Is de logger gekoppeld, dan gebruikt de app die in plaats van de Enphase-cloud.
        </p>
        <form onSubmit={handleLogger} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--txt-4)", display:"block", marginBottom:6 }}>
              Logger-URL (https)
            </label>
            <input type="text" className="input-base" value={lgUrl} onChange={e => setLgUrl(e.target.value)} placeholder="https://pi.jouw-tailnet.ts.net" />
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--txt-4)", display:"block", marginBottom:6 }}>
              API key
            </label>
            <input type="password" className="input-base" value={lgKey} onChange={e => setLgKey(e.target.value)}
              placeholder={loggerApi.hasKey ? "••••••• (reeds opgeslagen)" : "API key uit setup.sh"} />
          </div>
          <div style={{ display:"flex", gap:8, paddingTop:4 }}>
            <button type="submit" className="btn-primary">
              {lgSaved ? <><CheckCircle size={14} /> Opgeslagen</> : loggerOk ? "Bijwerken" : "Verbinden"}
            </button>
            {loggerOk && (
              <button type="button" className="btn-ghost" onClick={disconnectLogger}>
                <Trash2 size={13} /> Ontkoppelen
              </button>
            )}
          </div>
        </form>
      </Section>

      <Section title="Kleuren" icon={Palette}>
        <ColorRow label="Primair (productie)"     themeKey="c1" />
        <ColorRow label="Secundair (vergelijking)" themeKey="c2" />
        <ColorRow label="Tertiair (besparing)"    themeKey="c3" />
        <ColorRow label="Kwartair (projectie)"    themeKey="c4" />
      </Section>

      <Section title="Weergave" icon={BarChart2}>
        <ToggleRow label="Dark mode"         sub="Donkere achtergrond" themeKey="dark" />
        <ToggleRow label="Grafiek animaties" sub="Animeer bij laden"   themeKey="animate" />
        <ToggleRow label="Rasterlijnen"      sub="Grid in grafieken"   themeKey="showGrid" />
        <ToggleRow label="Vloeiende lijnen"  sub="Smooth vs recht"     themeKey="smoothLines" />
        <div style={{ padding:"10px 0", borderBottom:"1px solid var(--border)" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
            <div>
              <p style={{ fontSize:13, color:"var(--txt-2)" }}>Kaart-afronding</p>
              <p style={{ fontSize:11, color:"var(--txt-4)", marginTop:2 }}>{t.cardRadius}px</p>
            </div>
            <input type="range" min={0} max={32} value={t.cardRadius} onChange={e => update({ cardRadius: +e.target.value })}
              style={{ width:120, accentColor:"var(--accent)" }} />
          </div>
        </div>
        <div style={{ paddingTop:16 }}>
          <button className="btn-ghost" onClick={reset}>
            <RotateCcw size={13} /> Herstel standaard
          </button>
        </div>
      </Section>

      <Section title="Exporteren" icon={Download}>
        <p style={{ fontSize:13, color:"var(--txt-3)", marginBottom:16 }}>Download je productiedata als CSV voor gebruik in Excel of andere tools.</p>
        <button className="btn-ghost" onClick={handleExport}>
          <Download size={13} /> {exDone ? "Gedownload ✓" : "Exporteer CSV"}
        </button>
      </Section>
    </div>
  );
}
