/**
 * Integratietest: nagebootste Envoy + echte logger-proces.
 * Draaien:  node logger/test/test.mjs
 */
import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "envoy-test-"));
const tokenFile = path.join(tmp, "token");
const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 86400 * 200 })).toString("base64url");
const TOKEN = `aaa.${payload}.ccc`;
fs.writeFileSync(tokenFile, TOKEN);

// --- nagebootste Envoy ---
let calls = 0;
const envoy = http.createServer((req, res) => {
  if (req.headers.authorization !== `Bearer ${TOKEN}`) { res.writeHead(401); return res.end(); }
  res.setHeader("Content-Type", "application/json");
  if (req.url === "/api/v1/production") {
    calls++;
    return res.end(JSON.stringify({ wattsNow: 1500 + calls, wattHoursToday: 1000 * calls, wattHoursSevenDays: 99999, wattHoursLifetime: 5_000_000 + 1000 * calls }));
  }
  if (req.url === "/api/v1/production/inverters") {
    return res.end(JSON.stringify(Array.from({ length: 12 }, (_, i) => ({ serialNumber: `1${i}`, lastReportWatts: 100 }))));
  }
  res.writeHead(404); res.end();
});
await new Promise(r => envoy.listen(0, "127.0.0.1", r));
const envoyPort = envoy.address().port;

// --- logger starten ---
const KEY = "test-key-0123456789abcdef";
const loggerPort = 18787;
const child = spawn("node", [path.resolve("logger/logger.mjs")], {
  env: {
    ...process.env, APP_KEY: KEY, ENVOY_HOST: `127.0.0.1:${envoyPort}`, ENVOY_SCHEME: "http",
    ENVOY_TOKEN_FILE: tokenFile, DATA_DIR: path.join(tmp, "data"), PORT: String(loggerPort),
    POLL_SECONDS: "0.3", SYSTEM_NAME: "Testsysteem",
  },
  stdio: ["ignore", "inherit", "inherit"],
});

const get = async (p, key = KEY) => {
  const r = await fetch(`http://127.0.0.1:${loggerPort}${p}`, { headers: key ? { "X-Api-Key": key } : {} });
  return { status: r.status, body: await r.json().catch(() => null) };
};

try {
  await new Promise(r => setTimeout(r, 1800)); // enkele polls laten lopen

  // auth
  assert.equal((await get("/api/summary", "fout")).status, 401, "foute key moet 401 geven");
  assert.equal((await get("/api/summary", null)).status, 401, "geen key moet 401 geven");

  // summary
  const s = (await get("/api/summary")).body;
  assert.equal(s.system_name, "Testsysteem");
  assert.equal(s.status, "normal");
  assert.equal(s.modules, 12);
  assert.ok(s.current_power >= 1500, "wattsNow doorgegeven");
  assert.ok(s.energy_today >= 2000, "wattHoursToday doorgegeven");
  assert.ok(s.energy_lifetime > 5_000_000);
  assert.match(s.last_report_at, /^\d{4}-\d\d-\d\dT/);

  // daily
  const d = (await get("/api/daily")).body;
  assert.equal(d.length, 1);
  assert.match(d[0].date, /^\d{4}-\d\d-\d\d$/);
  assert.ok(d[0].wh_del >= 2000);

  // hourly: 24 uren, som = productie sinds eerste meting
  const h = (await get("/api/hourly")).body;
  assert.equal(h.length, 24);
  const sum = h.reduce((a, x) => a + x.watt, 0);
  assert.ok(sum >= 1000 && sum <= s.energy_today, `uursom ${sum} binnen bereik`);

  // health + tokenverval
  const hc = (await get("/api/health")).body;
  assert.equal(hc.ok, true);
  assert.ok(hc.tokenDaysLeft >= 199 && hc.tokenDaysLeft <= 200);

  // persistentie: herstart behoudt dagtotaal
  child.kill();
  await new Promise(r => setTimeout(r, 300));
  const daily = JSON.parse(fs.readFileSync(path.join(tmp, "data", "daily.json"), "utf8"));
  assert.ok(Object.values(daily)[0] >= 2000, "daily.json bewaard");
  assert.ok(fs.readFileSync(path.join(tmp, "data", "samples.jsonl"), "utf8").trim().split("\n").length >= 3, "samples bewaard");

  console.log("OK — alle logger-tests geslaagd");
} finally {
  child.kill();
  envoy.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
