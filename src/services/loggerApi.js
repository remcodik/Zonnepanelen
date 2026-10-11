/**
 * Client voor de eigen Envoy-logger (zie /logger). Alleen url + API key nodig.
 */
const LS = { url: "lg_url", key: "lg_key" };

class LoggerApi {
  #url = null;
  #key = null;

  constructor() {
    this.#url = localStorage.getItem(LS.url) || null;
    this.#key = localStorage.getItem(LS.key) || null;
  }

  get isConfigured() { return !!(this.#url && this.#key); }
  get url()          { return this.#url; }
  get hasKey()       { return !!this.#key; }

  /** Lege waarden laten de bestaande waarde ongemoeid. */
  setCredentials({ url, key } = {}) {
    if (url?.trim()) this.#url = url.trim().replace(/\/+$/, "");
    if (key?.trim()) this.#key = key.trim();
    if (this.#url) localStorage.setItem(LS.url, this.#url);
    if (this.#key) localStorage.setItem(LS.key, this.#key);
  }

  clearCredentials() {
    this.#url = this.#key = null;
    Object.values(LS).forEach(k => localStorage.removeItem(k));
  }

  async #get(path) {
    if (!this.isConfigured) throw new Error("Logger niet geconfigureerd.");
    let res;
    try {
      res = await fetch(`${this.#url}${path}`, { headers: { "X-Api-Key": this.#key }, cache: "no-store" });
    } catch {
      throw new Error(
        "Logger niet bereikbaar. Staat de Pi aan, ben je verbonden met Tailscale, en gebruik je het https-adres? " +
        "Een https-app kan geen http-adres aanroepen."
      );
    }
    if (res.status === 401) throw new Error("Logger weigert de API key.");
    if (!res.ok) throw new Error(`Logger fout ${res.status}`);
    return res.json();
  }

  getSummary() { return this.#get("/api/summary"); }
  getDaily()   { return this.#get("/api/daily"); }
  getHourly()  { return this.#get("/api/hourly"); }
  getHealth()  { return this.#get("/api/health"); }
}

export const loggerApi = new LoggerApi();
