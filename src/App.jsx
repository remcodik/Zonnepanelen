import { useState } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { SolarProvider } from "./context/SolarContext";
import TopBar from "./components/layout/TopBar";
import NavTabs from "./components/layout/NavTabs";
import Footer from "./components/layout/Footer";
import Dashboard from "./pages/Dashboard";
import Analyse from "./pages/Analyse";
import ROI from "./pages/ROI";
import Instellingen from "./pages/Instellingen";
import "./index.css";

const PAGES = { dashboard: Dashboard, analyse: Analyse, roi: ROI, instellingen: Instellingen };

export default function App() {
  const [page, setPage] = useState("dashboard");
  const Page = PAGES[page] || Dashboard;
  return (
    <ThemeProvider>
      <SolarProvider>
        <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
          <TopBar onSettings={() => setPage("instellingen")} />
          <NavTabs active={page} onChange={setPage} />
          <div style={{ flex: 1 }}>
            <Page key={page} />
          </div>
          <Footer />
        </div>
      </SolarProvider>
    </ThemeProvider>
  );
}
