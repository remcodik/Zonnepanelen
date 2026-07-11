import { Sun, RefreshCw, Moon } from "lucide-react";
import { Settings } from "lucide-react";
import { useSolar } from "../../context/SolarContext";
import { useTheme } from "../../context/ThemeContext";
import Badge from "../ui/Badge";

export default function TopBar({ onSettings }) {
  const { demo, loading, loadData, summary } = useSolar();
  const { t, update } = useTheme();

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50,
      background: t.dark ? "rgba(13,15,20,0.85)" : "rgba(255,255,255,0.85)",
      backdropFilter: "blur(16px) saturate(1.8)",
      borderBottom: "1px solid var(--border)",
    }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 20px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>

        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--c1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sun size={17} color="#fff" strokeWidth={2.5} />
          </div>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--txt)", letterSpacing: "-0.02em" }}>
              {summary?.system_name || "Zonnepanelen"}
            </div>
            {demo && <Badge variant="demo">DEMO</Badge>}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {!demo && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 8 }}>
              <div className="pulse-dot" />
              <span style={{ fontSize: 11, fontWeight: 500, color: "var(--txt-4)" }}>Live</span>
            </div>
          )}
          <IconBtn onClick={() => loadData(true)} title="Vernieuwen">
            <RefreshCw size={15} className={loading ? "spin" : ""} />
          </IconBtn>
          <IconBtn onClick={() => update({ dark: !t.dark })} title={t.dark ? "Licht" : "Donker"}>
            {t.dark ? <Sun size={15} /> : <Moon size={15} />}
          </IconBtn>
          <IconBtn onClick={onSettings} title="Instellingen">
            <Settings size={15} />
          </IconBtn>
        </div>
      </div>
    </header>
  );
}

function IconBtn({ children, onClick, title }) {
  return (
    <button onClick={onClick} title={title}
      style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid var(--border-2)", background: "transparent", color: "var(--txt-3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s, color 0.15s" }}
      onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.color = "var(--txt)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--txt-3)"; }}
    >
      {children}
    </button>
  );
}
