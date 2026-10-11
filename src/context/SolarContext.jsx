import { createContext, useContext, useState, useCallback, useRef } from "react";
import { enlightenApi, EnlightenApi } from "../services/enlightenApi";

const Ctx = createContext(null);

// Enphase heeft rate limits; vernieuwen kan altijd handmatig via de knop in de balk.
const THROTTLE_MS = 5 * 60_000;

export function SolarProvider({ children }) {
  const [configured, setConfigured] = useState(enlightenApi.isConfigured);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [warnings,   setWarnings]   = useState([]);
  const [summary,     setSummary]     = useState(null);
  const [daily,       setDaily]       = useState([]);
  const [monthly,     setMonthly]     = useState([]);
  const [hourly,      setHourly]      = useState([]);
  const [alerts,      setAlerts]      = useState([]);
  const [deviceCount, setDeviceCount] = useState(null);
  const lastLoad = useRef(0);

  const reset = useCallback(() => {
    setSummary(null); setDaily([]); setMonthly([]); setHourly([]);
    setAlerts([]); setDeviceCount(null); setWarnings([]); setError(null);
  }, []);

  const loadData = useCallback(async (force = false) => {
    if (!enlightenApi.isConfigured) return;
    const now = Date.now();
    if (!force && now - lastLoad.current < THROTTLE_MS) return;
    lastLoad.current = now;

    setLoading(true);
    setError(null);
    try {
      const [sumRes, lifeRes, hourRes, devRes, alertRes] = await Promise.allSettled([
        enlightenApi.getSummary(),
        enlightenApi.getEnergyLifetime(),
        enlightenApi.getTelemetry(),
        enlightenApi.getDevices(),
        enlightenApi.getAlerts(),
      ]);

      // Zonder summary is er niets betrouwbaars te tonen
      if (sumRes.status === "rejected") throw sumRes.reason;

      const warn = [];
      const take = (res, label, fn, fallback) => {
        if (res.status === "fulfilled") return fn(res.value);
        warn.push(`${label}: ${res.reason?.message || "mislukt"}`);
        return fallback;
      };

      const dailyArr = take(lifeRes, "Dagproductie", EnlightenApi.mapDailyProduction, []);

      const byMonth = {};
      dailyArr.forEach(d => {
        const m = d.date?.slice(0, 7);
        if (m) byMonth[m] = (byMonth[m] || 0) + (d.wh_del || 0);
      });
      const monthlyArr = Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, wh]) => ({
          month,
          label: new Date(`${month}-01T12:00:00`).toLocaleDateString("nl-NL", { month: "short", year: "2-digit" }),
          kwh: Math.round(wh / 1000),
        }));

      setSummary(EnlightenApi.mapSummary(sumRes.value));
      setDaily(dailyArr);
      setMonthly(monthlyArr);
      setHourly(take(hourRes, "Uurproductie", EnlightenApi.mapHourly, []));
      setDeviceCount(take(devRes, "Apparaten", EnlightenApi.countDevices, null));
      setAlerts(take(alertRes, "Meldingen", EnlightenApi.mapAlerts, []));
      setWarnings(warn);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const connect = useCallback((creds) => {
    enlightenApi.setCredentials(creds);
    lastLoad.current = 0; // direct opnieuw laden met de nieuwe gegevens
    reset();
    setConfigured(enlightenApi.isConfigured);
  }, [reset]);

  const disconnect = useCallback(() => {
    enlightenApi.clearCredentials();
    setConfigured(false);
    reset();
  }, [reset]);

  return (
    <Ctx.Provider value={{
      configured, loading, error, warnings,
      summary, daily, monthly, hourly, alerts, deviceCount,
      loadData, connect, disconnect,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useSolar = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSolar outside SolarProvider");
  return c;
};
