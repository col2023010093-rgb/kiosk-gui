#!/usr/bin/env bash
# One-shot setup of the kiosk local database + nightly sync on the Raspberry Pi.
#
# Run from the folder that contains local-db/ and deploy/ (copied from your laptop):
#     sudo bash deploy/pi-setup.sh
#
# Safe to run again: it updates the code and services, keeps your existing
# /etc/kiosk/kiosk.env, and never touches the database in /var/lib/kiosk.
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Please run with sudo:  sudo bash deploy/pi-setup.sh" >&2
  exit 1
fi

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
[[ -d "$SRC/local-db" && -d "$SRC/deploy" ]] || {
  echo "Could not find local-db/ and deploy/ next to this script ($SRC)." >&2
  exit 1
}

echo "== 1/6  System packages"
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y python3-venv python3-pip sqlite3 curl >/dev/null

echo "== 2/6  Service user and folders"
id kiosk &>/dev/null || useradd --system --create-home --shell /usr/sbin/nologin kiosk
mkdir -p /opt/kiosk/local-db /etc/kiosk

echo "== 3/6  Application code (root-owned, read-only for the service user)"
cp -r "$SRC/local-db/." /opt/kiosk/local-db/
# Never carry a laptop test database or caches onto the kiosk.
rm -f /opt/kiosk/local-db/*.db /opt/kiosk/local-db/*.db-wal /opt/kiosk/local-db/*.db-shm
find /opt/kiosk/local-db -name '__pycache__' -type d -prune -exec rm -rf {} + 2>/dev/null || true
find /opt/kiosk/local-db -name '*.bak' -delete 2>/dev/null || true

[[ -d /opt/kiosk/venv ]] || python3 -m venv /opt/kiosk/venv
/opt/kiosk/venv/bin/pip install -q --upgrade pip
/opt/kiosk/venv/bin/pip install -q flask flask-cors requests
chown -R root:root /opt/kiosk
chmod -R a+rX /opt/kiosk

echo "== 4/6  Settings file /etc/kiosk/kiosk.env"
ENV_FILE=/etc/kiosk/kiosk.env
if [[ -f "$ENV_FILE" ]]; then
  echo "   Keeping your existing $ENV_FILE (delete it and rerun to enter new values)."
else
  echo "   Enter the values. Secrets are hidden as you type or paste."
  read -rp   "   Supabase URL (https://xxxx.supabase.co): " SUPABASE_URL
  read -rsp  "   Supabase anon key: " SUPABASE_ANON_KEY; echo
  read -rp   "   Kiosk ID (uuid from the kiosks table): " KIOSK_ID
  read -rsp  "   Kiosk sync key (43 characters): " KIOSK_SYNC_KEY; echo

  [[ "$SUPABASE_URL" =~ ^https://[A-Za-z0-9.-]+$ ]] || { echo "Supabase URL looks wrong." >&2; exit 1; }
  [[ -n "$SUPABASE_ANON_KEY" ]] || { echo "Anon key is empty." >&2; exit 1; }
  [[ "$KIOSK_ID" =~ ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$ ]] \
    || { echo "Kiosk ID must be a uuid." >&2; exit 1; }
  if [[ ${#KIOSK_SYNC_KEY} -ne 43 || "$KIOSK_SYNC_KEY" =~ [[:space:]] ]]; then
    echo "The sync key must be exactly 43 characters with no spaces (yours is ${#KIOSK_SYNC_KEY})." >&2
    exit 1
  fi

  ( umask 077
    cat > "$ENV_FILE" <<EOF
KIOSK_DB_PATH=/var/lib/kiosk/kiosk.db
KIOSK_SYNC_LOCK=/var/lib/kiosk/sync.lock
LOCAL_API_PORT=5003
SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
KIOSK_ID=$KIOSK_ID
KIOSK_SYNC_KEY=$KIOSK_SYNC_KEY
KIOSK_ADMIN_TOKEN=
EOF
  )
  unset SUPABASE_ANON_KEY KIOSK_SYNC_KEY
fi
chown root:root "$ENV_FILE"
chmod 600 "$ENV_FILE"

echo "== 5/6  Services and nightly timer"
cp "$SRC/deploy/kiosk-local-api.service" "$SRC/deploy/kiosk-sync.service" \
   "$SRC/deploy/kiosk-sync.timer" /etc/systemd/system/
systemctl daemon-reload
systemctl enable kiosk-local-api.service kiosk-sync.timer >/dev/null
systemctl restart kiosk-local-api.service
systemctl start kiosk-sync.timer

echo "== 6/6  Checks"
for _ in 1 2 3 4 5 6 7 8 9 10; do
  curl -fsS http://127.0.0.1:5003/api/local/health >/dev/null 2>&1 && break
  sleep 1
done
if curl -fsS http://127.0.0.1:5003/api/local/health >/dev/null 2>&1; then
  echo "   Local API: running on 127.0.0.1:5003"
else
  echo "   Local API did not start. See:  journalctl -u kiosk-local-api.service -n 30 --no-pager" >&2
  exit 1
fi
systemctl list-timers kiosk-sync.timer --no-pager | sed 's/^/   /'

read -rp "Run a first sync now? [y/N] " ANSWER
if [[ "${ANSWER:-N}" =~ ^[Yy]$ ]]; then
  if systemctl start kiosk-sync.service; then
    echo "   Sync finished."
  else
    echo "   Sync reported an error." >&2
  fi
  journalctl -u kiosk-sync.service -n 5 --no-pager | sed 's/^/   /'
fi

echo
echo "Done. Useful commands:"
echo "  curl http://127.0.0.1:5003/api/local/sync/status     # pending / synced / failed counts"
echo "  sudo systemctl start kiosk-sync.service              # sync now"
echo "  journalctl -u kiosk-sync.service -n 20 --no-pager    # last sync results"
echo "Do NOT run sync_worker.py with sudo; use the systemctl command above."
