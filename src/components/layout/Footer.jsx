/* global __APP_VERSION__, __BUILD_DATE__ */
import { GitBranch, Clock } from "lucide-react";

export default function Footer() {
  const v = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "2.0.0";
  const d = typeof __BUILD_DATE__ !== "undefined" ? __BUILD_DATE__ : new Date().toISOString();
  const fmt = (() => { try { return new Date(d).toLocaleString("nl-NL",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}); } catch { return d; } })();

  return (
    <footer style={{ borderTop: "1px solid var(--border)", marginTop: 40, padding: "16px 20px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 11, color: "var(--txt-4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 600, padding: "3px 10px", background: "var(--surface-2)", border: "1px solid var(--border-2)", borderRadius: 99, color: "var(--txt-3)" }}>
            <GitBranch size={10} /> v{v}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Clock size={10} /> {fmt}
          </span>
        </div>
        <span>Enphase Enlighten API v4</span>
      </div>
    </footer>
  );
}
