/**
 * Enphase Enlighten API v4
 * https://developer.enphase.com/docs
 *
 * Authentication: OAuth 2.0 Bearer token
 */
const BASE = "https://api.enphaseenergy.com/api/v4";

class EnlightenApi {
  #token = null;
  #systemId = null;

  constructor() {
    this.#token    = localStorage.getItem("el_token")    || null;
    this.#systemId = localStorage.getItem("el_systemId") || null;
  }

  get isConfigured() { return !!(this.#token && this.#systemId); }
  get systemId()     { return this.#systemId; }

  setCredentials(token, systemId) {
    this.#token    = token;
    this.#systemId = systemId;
    localStorage.setItem("el_token",    token);
    localStorage.setItem("el_systemId", systemId);
  }

  clearCredentials() {
    this.#token    = null;
    this.#systemId = null;
    localStorage.removeItem("el_token");
    localStorage.removeItem("el_systemId");
  }

  async #req(path, params = {}) {
    if (!this.#token) throw new Error("Geen API token geconfigureerd.");
    const url = new URL(`${BASE}${path}`);
    Object.entries(params).forEach(([k,v]) => v != null && url.searchParams.set(k,v));

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.#token}`, Accept: "application/json" },
    });

    if (res.status === 401) throw new Error("Ongeldig token — vernieuw je access token.");
    if (res.status === 422) throw new Error("Systeem ID niet gevonden.");
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `API fout ${res.status}`);
    }
    return res.json();
  }

  /** GET /api/v4/systems */
  async getSystems()           { return this.#req("/systems"); }

  /** GET /api/v4/systems/{id}/summary */
  async getSummary(id = this.#systemId) {
    return this.#req(`/systems/${id}/summary`);
  }

  /**
   * GET /api/v4/systems/{id}/energy_lifetime
   * Returns daily production array: { production: [{end_date, wh_del}] }
   */
  async getEnergyLifetime(id = this.#systemId, startDate, endDate) {
    return this.#req(`/systems/${id}/energy_lifetime`, {
      start_date: startDate, end_date: endDate,
    });
  }

  /** GET /api/v4/systems/{id}/telemetry/production_micro (granularity: day|week|month) */
  async getTelemetry(id = this.#systemId, granularity = "day") {
    return this.#req(`/systems/${id}/telemetry/production_micro`, { granularity });
  }

  /** GET /api/v4/systems/{id}/devices */
  async getDevices(id = this.#systemId) { return this.#req(`/systems/${id}/devices`); }

  /** GET /api/v4/systems/{id}/alerts */
  async getAlerts(id = this.#systemId)  { return this.#req(`/systems/${id}/alerts`);  }

  /**
   * Map raw API summary response → internal shape.
   * The v4 API returns different field names depending on endpoint.
   */
  static mapSummary(raw) {
    return {
      system_id:       raw.system_id,
      system_name:     raw.system_public_name || raw.name || "Mijn Systeem",
      status:          raw.status || "normal",
      modules:         raw.modules ?? 0,
      size_w:          raw.size_w  ?? 0,
      current_power:   raw.current_power ?? 0,
      energy_today:    raw.energy_today ?? 0,
      energy_lifetime: raw.energy_lifetime ?? 0,
      last_report_at:  raw.last_report_at,
    };
  }

  /**
   * Map energy_lifetime response → [{date, wh_del}] array.
   */
  static mapDailyProduction(raw) {
    const prod = raw?.production ?? [];
    return prod.map(p => ({
      date:   p.end_date,
      wh_del: p.wh_del ?? 0,
    }));
  }
}

export const enlightenApi = new EnlightenApi();
