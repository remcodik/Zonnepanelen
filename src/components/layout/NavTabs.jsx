import { LayoutDashboard, BarChart3, Calculator, Settings2 } from "lucide-react";

const TABS = [
  { id: "dashboard",   label: "Dashboard",   icon: LayoutDashboard },
  { id: "analyse",     label: "Analyse",     icon: BarChart3 },
  { id: "roi",         label: "Terugverdien",icon: Calculator },
  { id: "instellingen",label: "Instellingen",icon: Settings2 },
];

export default function NavTabs({ active, onChange }) {
  return (
    <nav style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", overflowX: "auto" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 20px", display: "flex", gap: 2 }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`nav-tab ${active === id ? "active" : ""}`} onClick={() => onChange(id)}>
            <Icon size={14} strokeWidth={active === id ? 2.5 : 2} />
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}
