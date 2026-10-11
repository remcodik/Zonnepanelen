import { addDays, format, parseISO } from "date-fns";

/**
 * Enphase Enlighten API v4
 * https://developer-v4.enphase.com/docs/quickstart.html
 *
 * Elke call vereist twee dingen:
 *   - een OAuth 2.0 access token (Authorization: Bearer ...) — geldig 1 dag
 *   - de API key van je developer-applicatie (query param `key`)
 */
const DEFAULT_BASE = "https://api.enphaseenergy.com/api/v4";
const TZ = "Europe/Amsterdam";

const LS = {
  token:    "el_token",
  systemId: "el_systemId",
  apiKey:   "el_apiKey",
  baseUrl:  "el_baseUrl",
};

const hourFmt = new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: TZ });

class EnlightenApi {
  #token    = null;
  #systemId = null;
  #apiKey   = null;
  #baseUrl  = null;

  constructor() {
    this.#token    = localStorage.getItem(LS.token)    || null;
    this.#systemId = localStorage.getItem(LS.systemId) || null;
    this.#apiKey   = localStorage.getItem(LS.apiKey)   || null;
    this.#baseUrl  = localStorage.getItem(LS.baseUrl)  || null;
  }

  get isConfigured() { return !!(this.#token && this.#systemId && this.#apiKey); }
  get systemId()     { return this.#systemId; }
  get baseUrl()      { return this.#baseUrl; }
  get hasToken()     { return !!this.#token; }
  get hasApiKey()    { return !!this.#apiKey; }

  /** Lege waarden laten de bestaande waarde ongemoeid, zodat je bv. alleen het token kunt verversen. */
  setCredentials({ token, systemId, apiKey, baseUrl } = {}) {
    if (token?.trim())    this.#token    = token.trim();
    if (systemId?.trim()) this.#systemId = systemId.trim();
    if (apiKey?.trim())   this.#apiKey   = apiKey.trim();
    if (baseUrl !== undefined) this.#baseUrl = baseUrl.trim().replace(/\/+$/, "") || null;

    const store = (k, v) => (v ? localStorage.setItem(k, v) : localStorage.removeItem(k));
    store(LS.token,    this.#token);
    store(LS.systemId, this.#systemId);
    store(LS.apiKey,   this.#apiKey);
    store(LS.baseUrl,  this.#baseUrl);
  }

  clearCredentials() {
    this.#token = this.#systemId = this.#apiKey = this.#baseUrl = null;
    Object.values(LS).forEach(k => localStorage.removeItem(k));
  }

  async #req(path, params = {}) {
    if (!this.isConfigured) throw new Error("API niet geconfigureerd: token, System ID en API key zijn nodig.");

    const url = new URL(`${this.#baseUrl || DEFAULT_BASE}${path}`);
    url.searchParams.set("key", this.#apiKey);
    Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v));

    let res;
    try {
      res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${this.#token}`, Accept: "application/json" },
      });
    } catch {
      throw new Error(
        "Enphase is niet bereikbaar vanuit de browser (geen verbinding of CORS-blokkade). " +
        "Lukt het via een proxy wel? Vul dan bij Instellingen een proxy-URL in."
      );
    }

    if (res.status === 401) throw new Error("Token ongeldig of verlopen (een access token is 1 dag geldig). Vernieuw het token bij Instellingen.");
    if (res.status === 403) throw new Error("Toegang geweigerd: controleer de API key en of je app toegang heeft tot dit systeem.");
    if (res.status === 404 || res.status === 422) throw new Error("Systeem ID niet gevonden.");
    if (res.status === 429) throw new Error("Enphase rate limit bereikt — probeer het over een minuut opnieuw.");
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `API fout ${res.status}`);
    }
    return res.json();
  }

  getSummary(id = this.#systemId)  { return this.#req(`/systems/${id}/summary`); }
  getDevices(id = this.#systemId)  { return this.#req(`/systems/${id}/devices`); }
  getAlerts(id = this.#systemId)   { return this.#req(`/systems/${id}/alerts`); }

  /** Dagelijkse productie sinds ingebruikname (of vanaf startDate). */
  getEnergyLifetime(id = this.#systemId, startDate, endDate) {
    return this.#req(`/systems/${id}/energy_lifetime`, { start_date: startDate, end_date: endDate });
  }

  /** Productie-intervallen van vandaag (microinverters). */
  getTelemetry(id = this.#systemId, granularity = "day") {
    return this.#req(`/systems/${id}/telemetry/production_micro`, { granularity });
  }

  static #epochToIso(v) {
    if (v == null) return null;
    return typeof v === "number" ? new Date(v * 1000).toISOString() : v;
  }

  static mapSummary(raw) {
    return {
      system_id:       raw.system_id,
      system_name:     raw.system_public_name || raw.name || "Mijn systeem",
      status:          raw.status || "normal",
      modules:         raw.modules ?? 0,
      size_w:          raw.size_w ?? 0,
      current_power:   raw.current_power ?? 0,
      energy_today:    raw.energy_today ?? 0,
      energy_lifetime: raw.energy_lifetime ?? 0,
      last_report_at:  EnlightenApi.#epochToIso(raw.last_report_at),
    };
  }

  /**
   * energy_lifetime → [{date: "yyyy-MM-dd", wh_del}].
   * `production` is een array met één getal (Wh) per dag, beginnend op `start_date`.
   * Objecten met end_date/wh_del worden ook geaccepteerd.
   */
  static mapDailyProduction(raw) {
    const prod = raw?.production ?? [];
    if (!prod.length) return [];

    if (typeof prod[0] === "number") {
      if (!raw.start_date) return [];
      const start = parseISO(raw.start_date);
      return prod.map((wh, i) => ({ date: format(addDays(start, i), "yyyy-MM-dd"), wh_del: wh ?? 0 }));
    }
    return prod.map(p => ({ date: p.end_date, wh_del: p.wh_del ?? 0 }));
  }

  /** telemetry-intervallen (5/15 min) → [{hour: 0..23, watt}] voor vandaag, op Nederlandse tijd. */
  static mapHourly(raw) {
    const intervals = raw?.intervals ?? [];
    const wh = Array(24).fill(0);
    intervals.forEach(i => {
      if (i.end_at == null) return;
      // end_at is het einde van het interval; -1s plaatst het in het juiste uur
      const h = Number(hourFmt.format(new Date(i.end_at * 1000 - 1000)));
      wh[h] += i.enwh ?? 0;
    });
    // Wh in een uur = gemiddeld vermogen in W
    return wh.map((w, hour) => ({ hour, watt: Math.round(w) }));
  }

  static #list(raw, ...keys) {
    if (Array.isArray(raw)) return raw;
    for (const k of keys) if (Array.isArray(raw?.[k])) return raw[k];
    return [];
  }

  static countDevices(raw) {
    const direct = EnlightenApi.#list(raw, "items");
    if (direct.length) return direct.length;
    const groups = raw?.devices;
    if (Array.isArray(groups)) return groups.length;
    if (groups && typeof groups === "object") {
      return Object.values(groups).reduce((n, g) => n + (Array.isArray(g) ? g.length : 0), 0);
    }
    return 0;
  }

  static mapAlerts(raw) {
    return EnlightenApi.#list(raw, "alerts", "items");
  }
}

export const enlightenApi = new EnlightenApi();
export { EnlightenApi };
