#!/usr/bin/env bash
# Passwortgeschützte Vorschau der TPM-Webseite auf einem eigenen Server (Ubuntu/Debian, z. B. Hetzner Cloud).
# Richtet nginx mit Benutzername/Passwort (Basic Auth), kostenlosem SSL-Zertifikat (Let's Encrypt) und Ablaufdatum ein.
#
# Vorher: DNS-Eintrag (A-Record) für die Vorschau-Adresse auf die IP dieses Servers, ZIP nach /root/ hochladen.
# Aufruf als root:
#   bash vorschau-einrichten.sh vorschau.deine-domain.de BENUTZER [BIS JJJJ-MM-TT] [E-MAIL für Let's Encrypt]
# Das Passwort wird während der Einrichtung zweimal abgefragt (es steht danach nirgends im Klartext).
# Erneut ausführen: verlängert das Ablaufdatum bzw. spielt eine neue ZIP ein (Passwort wird dann neu gesetzt).
#
# Bricht ab, ohne etwas zu verändern, wenn die Ports 80/443 schon von einem anderen Programm belegt sind
# (z. B. Docker mit Traefik/Caddy für n8n).
set -euo pipefail

DOMAIN="${1:-}"
NUTZER="${2:-}"
BIS="${3:-$(date -d '+14 days' +%F)}"
EMAIL="${4:-}"
ZIP="${ZIP:-/root/TPM-Bau-Webseite.zip}"
ZIEL=/var/www/vorschau
PASSDATEI=/etc/nginx/vorschau.htpasswd
SPERRE=/etc/nginx/vorschau-abgelaufen
KONF=/etc/nginx/sites-available/vorschau

fehler() { echo; echo "FEHLER: $*" >&2; exit 1; }
schritt() { echo; echo "── $*"; }

[ "$(id -u)" = 0 ] || fehler "Bitte als root ausführen (oder mit: sudo bash $0 …)."
[[ "$DOMAIN" =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$ ]] ||
  fehler "Bitte die Vorschau-Adresse angeben, z. B.: bash $0 vorschau.deine-domain.de tpm"
[[ "$NUTZER" =~ ^[A-Za-z0-9._-]{2,32}$ ]] || fehler "Bitte einen Benutzernamen angeben (Buchstaben/Zahlen), z. B. tpm"
[[ "$BIS" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] && date -d "$BIS" >/dev/null 2>&1 || fehler "Datum bitte als JJJJ-MM-TT, z. B. 2026-11-25"
[ -f "$ZIP" ] || fehler "Die Datei $ZIP fehlt. Bitte TPM-Bau-Webseite.zip nach /root/ hochladen."
command -v apt-get >/dev/null || fehler "Dieses Skript ist für Ubuntu/Debian gedacht (apt-get fehlt)."

schritt "1/7 · Prüfe, ob die Webports frei sind"
belegt="$( (ss -ltnpH '( sport = :80 or sport = :443 )' 2>/dev/null || true) | grep -v nginx || true)"
if [ -n "$belegt" ]; then
  echo "$belegt"
  fehler "Port 80 oder 443 wird schon von einem anderen Programm benutzt (siehe oben, z. B. docker-proxy für n8n).
Es wurde nichts verändert. Bitte diese Ausgabe weitergeben, dann wird die Vorschau dort eingehängt."
fi
echo "ok"

schritt "2/7 · Prüfe, ob $DOMAIN auf diesen Server zeigt"
server_ips="$(hostname -I 2>/dev/null || true)"
dns_ip="$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk 'NR==1{print $1}')"
if [ -z "$dns_ip" ]; then
  echo "WARNUNG: $DOMAIN ist (noch) nicht im DNS zu finden. Das SSL-Zertifikat kann dann nicht ausgestellt werden."
  echo "         Bitte den A-Record prüfen und ggf. ein paar Minuten warten."
elif ! grep -qw "$dns_ip" <<<"$server_ips"; then
  echo "WARNUNG: $DOMAIN zeigt auf $dns_ip, dieser Server hat aber: $server_ips"
else
  echo "ok ($dns_ip)"
fi

schritt "3/7 · Installiere nginx, Zertifikatswerkzeug und Hilfsprogramme"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
pakete=(nginx apache2-utils unzip)
[ -n "${OHNE_SSL:-}" ] || pakete+=(certbot python3-certbot-nginx)
apt-get install -y -qq "${pakete[@]}" >/dev/null
echo "ok"

schritt "4/7 · Spiele die Webseite ein"
rm -rf "$ZIEL.neu"
mkdir -p "$ZIEL.neu"
unzip -q "$ZIP" -d "$ZIEL.neu"
[ -f "$ZIEL.neu/index.html" ] || fehler "In der ZIP liegt keine index.html auf oberster Ebene."
rm -f "$ZIEL.neu/.htaccess" "$ZIEL.neu/_headers"
[ -f "$ZIEL.neu/abgelaufen.html" ] || cat >"$ZIEL.neu/abgelaufen.html" <<'HTML'
<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Vorschau nicht mehr verfügbar</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0a1626;color:#f3f1ec;font:16px/1.5 system-ui,sans-serif;text-align:center;padding:2rem"><div><h1 style="font-size:1.6rem">Vorschau nicht mehr verfügbar</h1><p>Diese Vorschau ist abgelaufen.</p></div></body></html>
HTML
find "$ZIEL.neu" -type d -exec chmod 755 {} + && find "$ZIEL.neu" -type f -exec chmod 644 {} +
rm -rf "$ZIEL.alt"
[ -d "$ZIEL" ] && mv "$ZIEL" "$ZIEL.alt"
mv "$ZIEL.neu" "$ZIEL"
rm -rf "$ZIEL.alt"
echo "ok ($(find "$ZIEL" -name '*.html' | wc -l) Seiten)"

schritt "5/7 · Benutzername und Passwort"
if [ -n "${VORSCHAU_PASSWORT:-}" ]; then
  htpasswd -cbB "$PASSDATEI" "$NUTZER" "$VORSCHAU_PASSWORT" 2>/dev/null
else
  echo "Bitte jetzt das Passwort für den Benutzer „$NUTZER“ eingeben (zweimal, die Eingabe bleibt unsichtbar):"
  htpasswd -cB "$PASSDATEI" "$NUTZER"
fi
chown root:www-data "$PASSDATEI" && chmod 640 "$PASSDATEI"

schritt "6/7 · nginx einrichten"
rm -f "$SPERRE"
ipv6=""
[ -s /proc/net/if_inet6 ] && ipv6=1
# Bestehende SSL-Einträge von certbot bei erneutem Aufruf behalten
ssl_zeilen=""
if [ -f "$KONF" ] && grep -q 'managed by Certbot' "$KONF"; then
  ssl_zeilen="$(grep -E 'ssl_certificate|ssl_certificate_key|include /etc/letsencrypt|ssl_dhparam' "$KONF" | sort -u || true)"
fi
cat >"$KONF" <<NGINX
# TPM-Webseite · passwortgeschützte Vorschau (eingerichtet mit deploy/vorschau-einrichten.sh)
server {
    listen 80;
$( [ -n "$ipv6" ] && echo '    listen [::]:80;' )
    server_name $DOMAIN;
$(if [ -n "$ssl_zeilen" ]; then
  echo '    listen 443 ssl;'
  [ -n "$ipv6" ] && echo '    listen [::]:443 ssl;'
  sed 's/^ */    /' <<<"$ssl_zeilen"
  echo '    if ($scheme = http) { return 301 https://$host$request_uri; }'
fi)
    root $ZIEL;
    index index.html;
    charset utf-8;

    # Ohne Benutzername und Passwort wird keine Datei ausgeliefert
    auth_basic "TPM Bau GmbH";
    auth_basic_user_file $PASSDATEI;

    add_header X-Robots-Tag "noindex, nofollow" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Cache-Control "private, no-cache" always;

    error_page 404 /404.html;
    location = /abgelaufen.html { }
    location = /site.webmanifest { default_type application/manifest+json; }

    location / {
        # Nach dem Ablaufdatum legt ein Zeitplan diese Datei an; dann nur noch „Vorschau nicht mehr verfügbar“
        if (-f $SPERRE) { return 302 /abgelaufen.html; }
        try_files \$uri \$uri/ =404;
    }
}
NGINX
ln -sf "$KONF" /etc/nginx/sites-enabled/vorschau
nginx -t 2>/dev/null || { nginx -t; fehler "Die nginx-Konfiguration ist fehlerhaft (siehe oben). Die alte Einrichtung bleibt aktiv."; }
if [ -d /run/systemd/system ]; then
  systemctl enable nginx >/dev/null 2>&1 || true
  systemctl reload-or-restart nginx
else
  nginx -s reload 2>/dev/null || nginx
fi
# Firewall auf dem Server (falls aktiv) für Web öffnen
if command -v ufw >/dev/null && ufw status 2>/dev/null | grep -q 'Status: active'; then
  ufw allow 'Nginx Full' >/dev/null && echo "Firewall (ufw): Ports 80/443 geöffnet"
fi

# Ablaufdatum: Zeitplan prüft stündlich und sperrt nach dem Tag
cat >/etc/cron.d/tpm-vorschau <<CRON
# TPM-Vorschau: nach dem $BIS nur noch „Vorschau nicht mehr verfügbar“
5 * * * * root [ "\$(date +\%F)" \> "$BIS" ] && touch $SPERRE
CRON
chmod 644 /etc/cron.d/tpm-vorschau
[ "$(date +%F)" \> "$BIS" ] && touch "$SPERRE"
echo "ok (gültig bis einschließlich $(date -d "$BIS" +%d.%m.%Y))"

schritt "7/7 · SSL-Zertifikat (https)"
if [ -n "${OHNE_SSL:-}" ]; then
  echo "übersprungen (OHNE_SSL gesetzt)"
elif [ -n "$ssl_zeilen" ]; then
  echo "ok (vorhandenes Zertifikat weiter genutzt)"
else
  certbot_mail=(--register-unsafely-without-email)
  [ -n "$EMAIL" ] && certbot_mail=(-m "$EMAIL")
  if certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos "${certbot_mail[@]}" --redirect; then
    echo "ok"
  else
    echo "WARNUNG: Das Zertifikat konnte nicht ausgestellt werden (meist: DNS zeigt noch nicht auf diesen Server,"
    echo "         oder Port 80 ist in der Hetzner-Firewall gesperrt). Die Vorschau läuft vorerst nur über http."
    echo "         Später einfach dasselbe Kommando noch einmal ausführen."
  fi
fi

echo
echo "════════════════════════════════════════════════════════════════"
echo "  Fertig. Vorschau:  https://$DOMAIN"
echo "  Benutzer:          $NUTZER  (Passwort wie eben eingegeben)"
echo "  Gültig bis:        $(date -d "$BIS" +%d.%m.%Y), danach „Vorschau nicht mehr verfügbar“"
echo "════════════════════════════════════════════════════════════════"
