#!/usr/bin/env node
/**
 * Envoy-S logger voor op een Raspberry Pi (of elke always-on machine in je netwerk).
 *
 * - Leest elke POLL_SECONDS (standaard 300) de lokale Envoy-API uit (firmware D7+/D8, token vereist)
 * - Bewaart metingen en dagtotalen op schijf (historie bouwt zich zo vanzelf op)
 * - Serveert dit aan de Zonnepanelen-app via een kleine JSON-API, beveiligd met een API key
 *
 * Geen externe dependencies; Node 18+.
 */
import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const env = process.env;
const cfg = {
  host:       env.ENVOY_HOST || "envoy.local",          // mag host:port zijn
  scheme:     env.ENVOY_SCHEME || "https",
  tokenFile:  env.ENVOY_TOKEN_FILE || path.join(os.homedir(), ".envoy", "token"),
  dataDir:    env.DATA_DIR || path.join(os.homedir(), "envoy-data"),
  port:       Number(env.PORT || 8787),
  bind:       env.BIND || "127.0.0.1",                  // 127.0.0.1 = alleen lokaal (bv. achter Tailscale)
  apiKey:     env.APP_KEY,
  origin:     env.ALLOWED_ORIGIN || "*",                // zet dit op de URL van je app
  intervalMs: Number(env.POLL_SECONDS || 300) * 1000,
  name:       env.SYSTEM_NAME || "Mijn systeem",
  sizeW:      Number(env.SYSTEM_WP || 0),               // optioneel: piekvermogen in Wp
};

if (!cfg.apiKey || cfg.apiKey.length < 16) {
  console.error("APP_KEY ontbreekt of is te kort (minimaal 16 tekens). Zie logger/README.md.");
  process.exit(1);
}

const TZ = "Europe/Amsterdam";
const dayFmt  = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });                              // yyyy-mm-dd
const hourFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "numeric", hourCycle: "h23" });

fs.mkdirSync(cfg.dataDir, { recursive: true });
const samplesFile = path.join(cfg.dataDir, "samples.jsonl");
const dailyFile   = path.join(cfg.dataDir, "daily.json");

// ---------- state ----------
const state = {
  daily: {},          // { "yyyy-mm-dd": Wh }
  today: { date: null, samples: [] },
  last: null,         // laatste sample
  inverters: null,
  lastError: null,
};

function loadState() {
  try { state.daily = JSON.parse(fs.readFileSync(dailyFile, "utf8")); } catch { /* eerste start */ }
  try {
    const todayStr = dayFmt.format(new Date());
    state.today.date = todayStr;
    for (const line of fs.readFileSync(samplesFile, "utf8").split("\n")) {
      if (!line) continue;
      try {
        const s = JSON.parse(line);
        if (dayFmt.format(new Date(s.t)) === todayStr) state.today.samples.push(s);
      } catch { /* kapotte regel overslaan */ }
    }
    state.last = state.today.samples.at(-1) ?? null;
  } catch { /* nog geen samples */ }
}

function saveDaily() {
  const tmp = `${dailyFile}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state.daily));
  fs.renameSync(tmp, dailyFile);
}

// ---------- Envoy ----------
function readToken() {
  return fs.readFileSync(cfg.tokenFile, "utf8").trim();
}

function tokenDaysLeft() {
  try {
    const payload = JSON.parse(Buffer.from(readToken().split(".")[1], "base64url").toString());
    return payload.exp ? Math.floor((payload.exp * 1000 - Date.now()) / 86_400_000) : null;
  } catch { return null; }
}

function envoyGet(p) {
  return new Promise((resolve, reject) => {
    const mod = cfg.scheme === "http" ? http : https;
    const req = mod.get(
      new URL(`${cfg.scheme}://${cfg.host}${p}`),
      {
        headers: { Authorization: `Bearer ${readToken()}`, Accept: "application/json" },
        rejectUnauthorized: false, // de Envoy gebruikt een zelfgetekend certificaat; alleen lokaal netwerk
        timeout: 15_000,
      },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          if (res.statusCode === 401) return reject(new Error("Envoy weigert het token (401): vernieuw het token met get-token.mjs"));
          if (res.statusCode !== 200) return reject(new Error(`Envoy ${p}: HTTP ${res.statusCode}`));
          try { resolve(JSON.parse(body)); } catch { reject(new Error(`Envoy ${p}: geen geldige JSON`)); }
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error("Envoy timeout")));
    req.on("error", reject);
  });
}

async function poll() {
  try {
    const prod = await envoyGet("/api/v1/production");
    const now = new Date();
    const date = dayFmt.format(now);
    if (state.today.date !== date) state.today = { date, samples: [] };

    const sample = {
      t: now.getTime(),
      w: Number(prod.wattsNow) || 0,
      today: Number(prod.wattHoursToday) || 0,
      life: Number(prod.wattHoursLifetime) || 0,
    };
    state.today.samples.push(sample);
    state.last = sample;
    fs.appendFileSync(samplesFile, JSON.stringify(sample) + "\n");

    state.daily[date] = Math.max(state.daily[date] || 0, sample.today);
    saveDaily();

    try {
      const inv = await envoyGet("/api/v1/production/inverters");
      if (Array.isArray(inv)) state.inverters = inv.length;
    } catch { /* optioneel */ }

    state.lastError = null;
  } catch (e) {
    state.lastError = e.message;
    console.error(`[${new Date().toISOString()}] poll mislukt: ${e.message}`);
  }
}

// ---------- afgeleide data ----------
function hourly() {
  const out = Array.from({ length: 24 }, (_, hour) => ({ hour, watt: 0 }));
  const samples = state.today.samples;
  if (!samples.length) return out;

  const firstHour = Number(hourFmt.format(new Date(samples[0].t)));
  const base = samples[0].today;     // productie vóór de eerste meting is onbekend per uur
  const cum = Array(24).fill(null);  // hoogste dagteller per uur
  for (const s of samples) {
    const h = Number(hourFmt.format(new Date(s.t)));
    cum[h] = Math.max(cum[h] ?? 0, s.today);
  }
  let prev = base;
  for (let h = firstHour; h < 24; h++) {
    if (cum[h] == null) continue; // gat in de metingen: Wh wordt aan het volgende uur met data toegekend
    out[h].watt = Math.max(0, Math.round(cum[h] - prev)); // Wh in een uur = gemiddeld vermogen in W
    prev = cum[h];
  }
  return out;
}

function summary() {
  const last = state.last;
  const ageMin = last ? (Date.now() - last.t) / 60_000 : Infinity;
  return {
    system_name: cfg.name,
    status: ageMin < 20 && !state.lastError ? "normal" : "comm",
    modules: state.inverters ?? 0,
    size_w: cfg.sizeW,
    current_power: last?.w ?? 0,
    energy_today: last?.today ?? 0,
    energy_lifetime: last?.life ?? 0,
    last_report_at: last ? new Date(last.t).toISOString() : null,
    devices: state.inverters,
  };
}

function dailyList() {
  return Object.entries(state.daily)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, wh_del]) => ({ date, wh_del }));
}

// ---------- HTTP API ----------
const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", cfg.origin);
  res.setHeader("Access-Control-Allow-Headers", "X-Api-Key");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Vary", "Origin");
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }

  const send = (code, obj) => {
    res.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify(obj));
  };

  if (req.headers["x-api-key"] !== cfg.apiKey) return send(401, { message: "Ongeldige API key" });

  const route = new URL(req.url, "http://x").pathname;
  switch (route) {
    case "/api/health":  return send(200, { ok: !state.lastError, lastSampleAt: state.last ? new Date(state.last.t).toISOString() : null, lastError: state.lastError, tokenDaysLeft: tokenDaysLeft(), days: Object.keys(state.daily).length });
    case "/api/summary": return send(200, summary());
    case "/api/daily":   return send(200, dailyList());
    case "/api/hourly":  return send(200, hourly());
    default:             return send(404, { message: "Niet gevonden" });
  }
});

loadState();
server.listen(cfg.port, cfg.bind, () => {
  console.log(`Logger draait op http://${cfg.bind}:${cfg.port} — Envoy: ${cfg.scheme}://${cfg.host}, interval ${cfg.intervalMs / 1000}s`);
  const d = tokenDaysLeft();
  if (d != null && d < 30) console.warn(`Let op: token verloopt over ${d} dagen. Draai get-token.mjs opnieuw.`);
});
poll();
setInterval(poll, cfg.intervalMs);
