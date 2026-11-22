#!/usr/bin/env python3
"""Generate a sync key for one kiosk.

Usage:  python make_kiosk_key.py <kiosks.kiosk_id uuid from Supabase>

Prints (1) the secret to put in the kiosk's /etc/kiosk/kiosk.env and
(2) the SQL to run once in the Supabase SQL editor. Only the hash goes to Supabase.
"""
import hashlib
import secrets
import sys

if len(sys.argv) != 2 or not sys.argv[1].strip():
    sys.exit("usage: make_kiosk_key.py <kiosk-id>")

import uuid

kiosk_id = sys.argv[1].strip()
try:
    kiosk_id = str(uuid.UUID(kiosk_id))
except ValueError:
    sys.exit("kiosk id must be the uuid from the kiosks table (kiosks.kiosk_id)")

key = secrets.token_urlsafe(32)
digest = hashlib.sha256(key.encode()).hexdigest()

print("# 1) Put on the kiosk, in /etc/kiosk/kiosk.env (never commit this):")
print(f"KIOSK_ID={kiosk_id}")
print(f"KIOSK_SYNC_KEY={key}")
print()
print("-- 2) Run once in the Supabase SQL editor:")
print("insert into public.kiosk_sync_keys (kiosk_id, key_hash)")
print(f"values ('{kiosk_id}', '{digest}')")
print("on conflict (kiosk_id) do update set key_hash = excluded.key_hash, revoked_at = null;")
