"""Local HTTP API the kiosk browser talks to for saving/reading records.

Binds to 127.0.0.1 only: the browser runs on the same Raspberry Pi.
Run:  python local_api.py      (port 5003 by default)
"""
from __future__ import annotations

import hmac
import os
import subprocess
import sys
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS

import local_db

app = Flask(__name__)
CORS(app, origins=[
    r"http://localhost:\d+", r"http://127\.0\.0\.1:\d+",
])

ADMIN_TOKEN = os.environ.get("KIOSK_ADMIN_TOKEN", "")
HERE = Path(__file__).resolve().parent

# Create tables at import time so the app works under gunicorn/flask run too.
local_db.init_db().close()


def _conn():
    return local_db.connect()


@app.get("/api/local/health")
def health():
    return jsonify({"ok": True})


@app.post("/api/local/records")
def create_record():
    body = request.get_json(silent=True)
    conn = _conn()
    try:
        saved = local_db.insert_record(conn, body)  # type: ignore[arg-type]
    except local_db.ValidationError as exc:
        return jsonify({"error": str(exc)}), 422
    finally:
        conn.close()
    return jsonify({"record_id": saved["record_id"], "sync_status": saved["sync_status"]}), 201


@app.get("/api/local/records")
def get_records():
    conn = _conn()
    try:
        rows = local_db.list_records(
            conn, request.args.get("patient_id"), request.args.get("limit", 50, type=int))
    finally:
        conn.close()
    return jsonify({"records": rows})


@app.get("/api/local/patients/lookup")
def lookup_patient():
    ident = (request.args.get("identification_number") or "").strip()
    if not ident:
        return jsonify({"error": "identification_number is required"}), 422
    conn = _conn()
    try:
        patient = local_db.lookup_patient(conn, ident)
    finally:
        conn.close()
    if not patient:
        return jsonify({"error": "not found"}), 404
    return jsonify({"patient": patient})


@app.get("/api/local/sync/status")
def sync_status():
    conn = _conn()
    try:
        return jsonify(local_db.sync_status(conn))
    finally:
        conn.close()


@app.post("/api/local/sync/run")
def sync_now():
    """Manual 'sync now' for staff. Disabled unless KIOSK_ADMIN_TOKEN is set."""
    supplied = request.headers.get("X-Kiosk-Token", "")
    if not ADMIN_TOKEN or not hmac.compare_digest(supplied, ADMIN_TOKEN):
        return jsonify({"error": "forbidden"}), 403
    proc = subprocess.run(
        [sys.executable, str(HERE / "sync_worker.py")],
        capture_output=True, text=True, timeout=300, check=False)
    return jsonify({"exit_code": proc.returncode}), (200 if proc.returncode == 0 else 502)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("LOCAL_API_PORT", "5003")), threaded=True)
