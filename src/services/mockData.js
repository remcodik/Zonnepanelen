import { subDays, format, eachDayOfInterval, getMonth } from "date-fns";

const today = new Date();

const SEASON = [0.18,0.28,0.48,0.68,0.88,1.0,0.97,0.90,0.68,0.46,0.26,0.17];

export function genDailyProduction(days = 90) {
  return eachDayOfInterval({ start: subDays(today, days - 1), end: today }).map((date) => {
    const s = SEASON[getMonth(date)];
    const base = 12 + s * 18;
    const cloud = Math.random() > 0.65 ? Math.random() * 0.55 : 1;
    const wh = Math.max(0, Math.round((base + (Math.random()-0.5)*6) * cloud * 1000));
    return { date: format(date, "yyyy-MM-dd"), wh_del: wh };
  });
}

export function genHourlyProduction() {
  return Array.from({length:24},(_,h) => {
    if (h < 6 || h > 21) return { hour: h, watt: 0 };
    const bell = Math.exp(-0.5*((h-13)/3.5)**2);
    const watt = Math.round(bell * 3400 * (0.7 + Math.random()*0.45));
    return { hour: h, watt };
  });
}

export function genMonthlyProduction(months = 24) {
  return Array.from({length:months},(_,i) => {
    const d = new Date(today.getFullYear(), today.getMonth()-(months-1-i), 1);
    const s = SEASON[getMonth(d)];
    const kwh = Math.round((180 + s*320)*(0.80+Math.random()*0.38));
    return { month: format(d,"yyyy-MM"), label: format(d,"MMM ''yy"), kwh };
  });
}

export const MOCK_SUMMARY = {
  system_id: 12345,
  system_name: "Thuis — Zonnepanelen",
  status: "normal",
  modules: 18,
  size_w: 6480,
  current_power: 2840,
  energy_today: 14200,
  energy_lifetime: 12_450_000,
  last_report_at: new Date().toISOString(),
};

export const MOCK_ALERTS  = [];
export const MOCK_DEVICES = Array.from({length:18},(_,i)=>({
  sn: `122300${String(10000+i).padStart(5,"0")}`,
  model: "IQ8M-72-2-US",
  status: "normal",
}));
