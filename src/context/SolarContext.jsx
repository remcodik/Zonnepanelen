import { createContext, useContext, useState, useCallback, useRef } from "react";
import { enlightenApi } from "../services/enlightenApi";
import {
  MOCK_SUMMARY, MOCK_ALERTS, MOCK_DEVICES,
  genDailyProduction, genMonthlyProduction, genHourlyProduction,
} from "../services/mockData";

const Ctx = createContext(null);

export function SolarProvider({ children }) {
  const [demo,    setDemo]    = useState(!enlightenApi.isConfigured);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [summary,  setSummary]  = useState(null);
  const [daily,    setDaily]    = useState([]);
  const [monthly,  setMonthly]  = useState([]);
  const [hourly,   setHourly]   = useState([]);
  const [alerts,   setAlerts]   = useState([]);
  const [devices,  setDevices]  = useState([]);
  const lastLoad = useRef(0);

  const loadData = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastLoad.current < 60_000) return; // throttle 1 min
    lastLoad.current = now;
    setLoading(true);
    setError(null);
    try {
      if (demo || !enlightenApi.isConfigured) {
        await new Promise(r => setTimeout(r, 500));
        setSummary(MOCK_SUMMARY);
        setDaily(genDailyProduction(90));
        setMonthly(genMonthlyProduction(24));
        setHourly(genHourlyProduction());
        setAlerts(MOCK_ALERTS);
        setDevices(MOCK_DEVICES);
      } else {
        // Real API — parallel fetch
        const [sumRaw, lifeRaw, devRaw, alertRaw] = await Promise.allSettled([
          enlightenApi.getSummary(),
          enlightenApi.getEnergyLifetime(),
          enlightenApi.getDevices(),
          enlightenApi.getAlerts(),
        ]);

        if (sumRaw.status === "rejected") throw sumRaw.reason;

        const sum     = enlightenApi.constructor.mapSummary(sumRaw.value);
        const dailyArr= lifeRaw.status === "fulfilled"
          ? enlightenApi.constructor.mapDailyProduction(lifeRaw.value)
          : genDailyProduction(90);

        // Build monthly from daily data
        const byMonth = {};
        dailyArr.forEach(d => {
          const m = d.date?.slice(0,7);
          if (m) byMonth[m] = (byMonth[m] || 0) + (d.wh_del || 0);
        });
        const monthlyArr = Object.entries(byMonth)
          .sort(([a],[b]) => a.localeCompare(b))
          .map(([month, wh]) => ({
            month,
            label: new Date(month+"-01").toLocaleDateString("nl-NL",{month:"short",year:"2-digit"}),
            kwh: Math.round(wh / 1000),
          }));

        setSummary(sum);
        setDaily(dailyArr.slice(-90));
        setMonthly(monthlyArr);
        setHourly(genHourlyProduction()); // hourly needs telemetry v4 — use mock until endpoint available
        setAlerts(alertRaw.status === "fulfilled" ? alertRaw.value?.items || [] : []);
        setDevices(devRaw.status  === "fulfilled" ? devRaw.value?.items  || [] : []);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [demo]);

  const connect = useCallback((token, systemId) => {
    enlightenApi.setCredentials(token, systemId);
    setDemo(false);
  }, []);

  const disconnect = useCallback(() => {
    enlightenApi.clearCredentials();
    setDemo(true);
    setSummary(null); setDaily([]); setMonthly([]); setHourly([]); setAlerts([]); setDevices([]);
  }, []);

  return (
    <Ctx.Provider value={{ demo, loading, error, summary, daily, monthly, hourly, alerts, devices, loadData, connect, disconnect }}>
      {children}
    </Ctx.Provider>
  );
}

export const useSolar = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSolar outside SolarProvider");
  return c;
};
