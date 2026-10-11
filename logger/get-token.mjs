#!/usr/bin/env node
/**
 * Haalt een Envoy-token (ongeveer 1 jaar geldig) op met je gewone Enlighten-account
 * en bewaart dat in ~/.envoy/token (alleen leesbaar voor jouw gebruiker).
 *
 * E-mail en wachtwoord worden alleen gevraagd in dit venster, nergens opgeslagen en
 * alleen naar Enphase zelf gestuurd (enlighten.enphaseenergy.com en entrez.enphaseenergy.com).
 *
 * Gebruik:  node get-token.mjs [envoy-serienummer]
 */
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import readline from "node:readline";

const host = process.env.ENVOY_HOST || "envoy.local";
const tokenFile = process.env.ENVOY_TOKEN_FILE || path.join(os.homedir(), ".envoy", "token");

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => { if (s.includes(question)) process.stdout.write(s); };
    }
    rl.question(question, (a) => { rl.close(); if (hidden) process.stdout.write("\n"); resolve(a.trim()); });
  });
}

function request(url, { method = "GET", headers = {}, body, insecure = false } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(new URL(url), { method, headers, rejectUnauthorized: !insecure, timeout: 20_000 }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function findSerial() {
  try {
    const r = await request(`https://${host}/info`, { insecure: true });
    return r.body.match(/<sn>(\d+)<\/sn>/)?.[1] ?? null;
  } catch { return null; }
}

let serial = process.argv[2] || (await findSerial());
if (serial) console.log(`Envoy serienummer: ${serial}`);
else serial = await ask("Serienummer van je Envoy (zie Enlighten-app of sticker): ");

const email = await ask("Enlighten e-mail: ");
const password = await ask("Enlighten wachtwoord: ", { hidden: true });

const login = await request("https://enlighten.enphaseenergy.com/login/login.json", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ "user[email]": email, "user[password]": password }).toString(),
});
let sessionId;
try { sessionId = JSON.parse(login.body).session_id; } catch { /* hieronder afgehandeld */ }
if (!sessionId) {
  console.error(`Inloggen mislukt (HTTP ${login.status}). Controleer e-mail en wachtwoord op enlighten.enphaseenergy.com.`);
  process.exit(1);
}

const tok = await request("https://entrez.enphaseenergy.com/tokens", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ session_id: sessionId, serial_num: serial, username: email }),
});
const token = tok.body.trim();
if (tok.status !== 200 || token.split(".").length !== 3) {
  console.error(`Token ophalen mislukt (HTTP ${tok.status}). Controleer het serienummer.`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(tokenFile), { recursive: true, mode: 0o700 });
fs.writeFileSync(tokenFile, token + "\n", { mode: 0o600 });

const exp = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).exp;
console.log(`Token opgeslagen in ${tokenFile}` + (exp ? ` (geldig tot ${new Date(exp * 1000).toLocaleDateString("nl-NL")})` : ""));
