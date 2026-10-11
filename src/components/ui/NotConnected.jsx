import { Key } from "lucide-react";

export default function NotConnected({ onSettings }) {
  return (
    <div className="fade-up" style={{ maxWidth: 520, margin: "0 auto", padding: "64px 20px", textAlign: "center" }}>
      <div className="card" style={{ padding: 32 }}>
        <Key size={28} style={{ color: "var(--txt-3)", marginBottom: 12 }} />
        <p className="section-title" style={{ marginBottom: 8 }}>Nog niet gekoppeld aan Enphase</p>
        <p style={{ fontSize: 13, color: "var(--txt-3)", lineHeight: 1.6, marginBottom: 20 }}>
          Vul bij Instellingen je access token, API key en System ID in om je echte productiedata te zien.
        </p>
        {onSettings && <button className="btn-primary" onClick={onSettings}>Naar instellingen</button>}
      </div>
    </div>
  );
}
