export const fmtW   = (w)   => w >= 1000 ? `${(w/1000).toFixed(2)} kW` : `${Math.round(w)} W`;
export const fmtKwh = (wh)  => {
  if (wh >= 1_000_000) return `${(wh/1_000_000).toFixed(2)} MWh`;
  if (wh >= 1_000)     return `${(wh/1_000).toFixed(1)} kWh`;
  return `${Math.round(wh)} Wh`;
};
export const fmtEur = (n)   => new Intl.NumberFormat("nl-NL",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);
export const fmtPct = (n)   => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
export const co2Kg  = (wh)  => +((wh/1000)*0.4).toFixed(0);
export const savings= (wh)  => +((wh/1000)*0.32).toFixed(2);
export const fmtDate= (s)   => { try { return new Date(s).toLocaleDateString("nl-NL",{day:"numeric",month:"short"}); } catch { return s; } };
