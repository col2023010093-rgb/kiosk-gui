"""Forward locally stored records to Supabase and refresh the patient cache.

Run by a systemd timer (nightly by default) or manually:  python sync_worker.py

Required environment (see deploy/kiosk.env.example):
    SUPABASE_URL, SUPABASE_ANON_KEY, KIOSK_ID, KIOSK_SYNC_KEY
"""
from __future__ import annotations

import logging
import os
import sys
import tempfile
from pathlib import Path
from typing import Any, Callable

try:
    import fcntl  # Linux / Raspberry Pi
except ImportError:  # Windows dev machine: no lock, fine for manual testing
    fcntl = None  # type: ignore[assignment]

import requests

import local_db

log = logging.getLogger("kiosk-sync")

BATCH_SIZE = 100
PULL_PAGE_SIZE = 1000
TIMEOUT = 30

# local column -> payload key sent to the Edge Function (identical names on purpose)
PUSH_FIELDS = (
    "record_id", "patient_id", "measured_by", "systolic_bp", "diastolic_bp", "heart_rate",
    "temperature", "spo2", "height_cm", "weight_kg", "bmi", "measured_at",
)

Sender = Callable[[dict[str, Any]], dict[str, Any]]


class SyncNetworkError(RuntimeError):
    """Server unreachable or returned a non-2xx: abort the run, keep rows pending."""


def make_sender(url: str, anon_key: str, kiosk_id: str, kiosk_key: str) -> Sender:
    endpoint = url.rstrip("/") + "/functions/v1/kiosk-sync"
    headers = {
        "Authorization": f"Bearer {anon_key}",
        "apikey": anon_key,
        "X-Kiosk-Id": kiosk_id,
        "X-Kiosk-Key": kiosk_key,
        "Content-Type": "application/json",
    }

    def send(payload: dict[str, Any]) -> dict[str, Any]:
        try:
            resp = requests.post(endpoint, json=payload, headers=headers, timeout=TIMEOUT)
        except requests.RequestException as exc:
            raise SyncNetworkError(type(exc).__name__) from exc
        if resp.status_code != 200:
            raise SyncNetworkError(f"HTTP {resp.status_code}")
        try:
            return resp.json()
        except ValueError as exc:
            raise SyncNetworkError("invalid JSON from server") from exc

    return send


def push_pending(conn, send: Sender, batch_size: int = BATCH_SIZE) -> tuple[int, int]:
    """Send every pending/failed row. Returns (accepted, rejected)."""
    accepted_total = rejected_total = 0
    cursor = 0  # each row is attempted at most once per run
    while True:
        rows = local_db.pending_records(conn, batch_size, after_rowid=cursor)
        if not rows:
            break
        cursor = rows[-1]["_rowid"]
        payload = {
            "action": "push_records",
            "records": [{k: r[k] for k in PUSH_FIELDS} for r in rows],
        }
        result = send(payload)  # SyncNetworkError propagates: nothing is marked
        sent_ids = {r["record_id"] for r in rows}
        accepted = [i for i in result.get("accepted", []) if i in sent_ids]
        rejected = {x.get("record_id"): str(x.get("reason", "rejected"))
                    for x in result.get("rejected", []) if x.get("record_id") in sent_ids}

        if accepted:
            local_db.mark_synced(conn, accepted)
        for rid, reason in rejected.items():
            local_db.mark_rejected(conn, rid, reason)
        accepted_total += len(accepted)
        rejected_total += len(rejected)

        # Rows the server neither accepted nor rejected would loop forever: treat as rejected.
        unanswered = sent_ids - set(accepted) - set(rejected)
        for rid in unanswered:
            local_db.mark_rejected(conn, rid, "no response for record")
        rejected_total += len(unanswered)
    return accepted_total, rejected_total


def pull_patients(conn, send: Sender, page_size: int = PULL_PAGE_SIZE) -> int:
    """Fetch the full patient list (all pages) then swap the cache atomically."""
    patients: list[dict[str, Any]] = []
    page = 0
    while True:
        result = send({"action": "pull_patients", "page": page, "page_size": page_size})
        patients.extend(result.get("patients", []))
        if not result.get("has_more"):
            break
        page += 1

    # Safety guard: never wipe a populated offline cache because the server returned nothing.
    if not patients and local_db.count_patients(conn) > 0:
        raise RuntimeError("server returned 0 patients; keeping existing cache")
    return local_db.replace_patients(conn, patients)


def run(conn, send: Sender) -> dict[str, Any]:
    run_id = local_db.start_sync_run(conn)
    pushed = rejected = pulled = 0
    error: str | None = None
    try:
        pushed, rejected = push_pending(conn, send)
        pulled = pull_patients(conn, send)
        local_db.purge_synced(conn)
    except SyncNetworkError as exc:
        error = f"network: {exc}"
    except Exception as exc:  # noqa: BLE001 - logged, run recorded as failed
        error = f"{type(exc).__name__}: {exc}"
    ok = error is None
    local_db.finish_sync_run(conn, run_id, pushed=pushed, rejected=rejected,
                             pulled=pulled, ok=ok, error=error)
    return {"ok": ok, "pushed": pushed, "rejected": rejected, "pulled": pulled, "error": error}


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    missing = [k for k in ("SUPABASE_URL", "SUPABASE_ANON_KEY", "KIOSK_ID", "KIOSK_SYNC_KEY")
               if not os.environ.get(k)]
    if missing:
        log.error("missing environment variables: %s", ", ".join(missing))
        return 2

    lock_path = Path(os.environ.get(
        "KIOSK_SYNC_LOCK", os.path.join(tempfile.gettempdir(), "kiosk-sync.lock")))
    with open(lock_path, "w") as lock:
        if fcntl is not None:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except OSError:
                log.warning("another sync is already running")
                return 0

        conn = local_db.init_db()
        send = make_sender(os.environ["SUPABASE_URL"], os.environ["SUPABASE_ANON_KEY"],
                           os.environ["KIOSK_ID"], os.environ["KIOSK_SYNC_KEY"])
        result = run(conn, send)
        conn.close()

    # Counts only: never log patient identifiers or vital values.
    log.info("sync result: %s", result)
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())