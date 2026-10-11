# Envoy-S logger (Raspberry Pi)

Leest je Enphase Envoy-S (firmware D7/D8, token vereist) lokaal uit, bewaart de historie en
geeft die aan de Zonnepanelen-app. Geen Enphase developer-account nodig.

## Installeren op de Pi

1. Zet Raspberry Pi OS Lite op de Pi (Raspberry Pi Imager), sluit hem aan op je netwerk en log in via SSH.
2. Haal de code op en draai het setup-script:
   ```bash
   sudo apt-get install -y git
   git clone --branch claude/pi-logger https://github.com/remcodik/Zonnepanelen.git
   bash Zonnepanelen/logger/setup.sh
   ```
3. Het script vraagt je Enlighten-e-mail en -wachtwoord (alleen op de Pi, wordt niet opgeslagen),
   haalt het Envoy-token op en start de service. Onderaan krijg je de **API key** voor in de app.

## Bereikbaar maken voor de app

De app staat op https, dus de logger moet ook via https bereikbaar zijn. De veiligste manier is Tailscale
(geen poorten open op je router):

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
sudo tailscale serve --bg 8787      # geeft een https://<pi>.<tailnet>.ts.net adres
```

Installeer Tailscale ook op je telefoon/laptop en log in met hetzelfde account. Vul het https-adres en de
API key in bij Instellingen → "Eigen logger" in de app.

## Onderhoud

| Wat | Commando |
|---|---|
| Status | `systemctl status envoy-logger` |
| Logs | `journalctl -u envoy-logger -n 50` |
| Token vernieuwen (± jaarlijks) | `cd Zonnepanelen/logger && set -a && . ~/.envoy/logger.env && set +a && node get-token.mjs && sudo systemctl restart envoy-logger` |
| Gezondheid | `curl -H "X-Api-Key: $APP_KEY" http://127.0.0.1:8787/api/health` |

Data staat in `~/envoy-data/` (`samples.jsonl` en `daily.json`). Maak daar af en toe een back-up van.

## Beperkingen

- De Envoy-S Standard heeft geen meter: je ziet productie, geen verbruik of teruglevering.
- De Envoy geeft lokaal geen historie. Die bouwt de logger op vanaf het moment dat hij draait.
- Uurwaarden worden afgeleid uit de dagteller; het eerste uur na een (her)start is onvolledig.
