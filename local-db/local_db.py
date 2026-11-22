"""Local SQLite storage for the health kiosk.

All real measurements are written here first. A separate sync worker
(sync_worker.py) forwards them to Supabase on a schedule.
"""
from __future__ import annotations

import contextlib
import datetime as dt
import os
import sqlite3
import uuid
from pathlib import Path
from typing import Any, Iterable, Iterator

HERE = Path(__file__).resolve().parent
DB_PATH = os.environ.get("KIOSK_DB_PATH", str(HERE / "kiosk.db"))
KIOSK_ID = os.environ.get("KIOSK_ID", "")

# Plausible human ranges. Anything outside is rejected (sensor glitch / bad data).
RANGES: dict[str, tuple[float, float]] = {
    "systolic_bp": (60, 260),
    "diastolic_bp": (30, 150),
    "heart_rate": (30, 220),
    "temperature": (30.0, 45.0),
    "spo2": (50, 100),
    "height_cm": (50, 250),
    "weight_kg": (2, 400),
    "bmi": (8, 80),
}
VITAL_FIELDS = tuple(RANGES.keys())

MAX_ATTEMPTS = 10
RETAIN_SYNCED_DAYS = 30


class ValidationError(ValueError):
    pass


def utcnow_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def connect(path: str | None = None) -> sqlite3.Connection:
    conn = sqlite3.connect(path or DB_PATH, timeout=15, isolation_level=None)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=FULL")  # survive sudden power loss on a kiosk
    conn.execute("PRAGMA busy_timeout=15000")
    return conn


@contextlib.contextmanager
def transaction(conn: sqlite3.Connection) -> Iterator[sqlite3.Connection]:
    conn.execute("BEGIN IMMEDIATE")
    try:
        yield conn
    except BaseException:
        conn.execute("ROLLBACK")
        raise
    else:
        conn.execute("COMMIT")


def init_db(path: str | None = None) -> sqlite3.Connection:
    target = path or DB_PATH
    Path(target).parent.mkdir(parents=True, exist_ok=True)
    conn = connect(target)
    conn.executescript((HERE / "schema.sql").read_text(encoding="utf-8"))
    with contextlib.suppress(OSError):
        os.chmod(target, 0o600)  # patient data: owner-only
    return conn


# --------------------------------------------------------------------- records

def calc_bmi(height_cm: float | None, weight_kg: float | None) -> float | None:
    if not height_cm or not weight_kg:
        return None
    m = height_cm / 100.0
    return round(weight_kg / (m * m), 1)


def _is_uuid(value: str) -> bool:
    try:
        uuid.UUID(value)
    except ValueError:
        return False
    return True


def _num(value: Any, name: str) -> float | None:
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        raise ValidationError(f"{name} must be a number")
    try:
        number = float(value)
    except (TypeError, ValueError):
        raise ValidationError(f"{name} must be a number") from None
    if number != number or number in (float("inf"), float("-inf")):
        raise ValidationError(f"{name} must be finite")
    return number


def _parse_iso(value: Any) -> str:
    if value in (None, ""):
        return utcnow_iso()
    try:
        parsed = dt.datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        raise ValidationError("measured_at must be ISO-8601") from None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=dt.timezone.utc)
    return parsed.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def validate_record(data: dict[str, Any]) -> dict[str, Any]:
    """Return a clean row dict or raise ValidationError."""
    if not isinstance(data, dict):
        raise ValidationError("body must be a JSON object")
    if data.get("simulated") or data.get("is_simulated"):
        raise ValidationError("simulated readings cannot be saved")

    patient_id = str(data.get("patient_id") or "").strip()
    if not patient_id:
        raise ValidationError("patient_id is required")
    # Supabase patient_id / measured_by are uuid columns: catch bad values now,
    # not at 2 AM when the nightly sync would reject the row.
    if not _is_uuid(patient_id):
        raise ValidationError("patient_id must be a UUID")

    row: dict[str, Any] = {"patient_id": patient_id}
    for field in VITAL_FIELDS:
        value = _num(data.get(field), field)
        if value is not None:
            lo, hi = RANGES[field]
            if not lo <= value <= hi:
                raise ValidationError(f"{field} out of range ({lo}-{hi})")
        row[field] = value

    if row["bmi"] is None:
        row["bmi"] = calc_bmi(row["height_cm"], row["weight_kg"])
    if all(row[f] is None for f in VITAL_FIELDS):
        raise ValidationError("at least one measurement is required")

    row["measured_at"] = _parse_iso(data.get("measured_at"))
    row["kiosk_id"] = str(data.get("kiosk_id") or KIOSK_ID) or None
    measured_by = data.get("measured_by")
    row["measured_by"] = str(measured_by) if measured_by not in (None, "") else None
    if row["measured_by"] is not None and not _is_uuid(row["measured_by"]):
        raise ValidationError("measured_by must be a UUID")
    return row


def insert_record(conn: sqlite3.Connection, data: dict[str, Any]) -> dict[str, Any]:
    row = validate_record(data)
    row["record_id"] = str(data.get("record_id") or uuid.uuid4())
    try:
        uuid.UUID(row["record_id"])
    except ValueError:
        raise ValidationError("record_id must be a UUID") from None

    cols = ", ".join(row)
    marks = ", ".join(f":{k}" for k in row)
    # INSERT OR IGNORE makes a double-tap / retried request harmless.
    conn.execute(f"INSERT OR IGNORE INTO local_health_records ({cols}) VALUES ({marks})", row)
    saved = conn.execute(
        "SELECT * FROM local_health_records WHERE record_id = ?", (row["record_id"],)
    ).fetchone()
    return dict(saved)


def list_records(conn: sqlite3.Connection, patient_id: str | None = None, limit: int = 50) -> list[dict]:
    limit = max(1, min(int(limit), 500))
    if patient_id:
        cur = conn.execute(
            "SELECT * FROM local_health_records WHERE patient_id = ? "
            "ORDER BY measured_at DESC LIMIT ?", (patient_id, limit))
    else:
        cur = conn.execute(
            "SELECT * FROM local_health_records ORDER BY measured_at DESC LIMIT ?", (limit,))
    return [dict(r) for r in cur.fetchall()]


# ------------------------------------------------------------------- patients

def lookup_patient(conn: sqlite3.Connection, identification_number: str) -> dict | None:
    row = conn.execute(
        "SELECT * FROM local_patients WHERE identification_number = ?",
        (identification_number.strip(),),
    ).fetchone()
    return dict(row) if row else None


def count_patients(conn: sqlite3.Connection) -> int:
    """Number of patients currently in the offline cache."""
    return conn.execute("SELECT COUNT(*) FROM local_patients").fetchone()[0]


def replace_patients(conn: sqlite3.Connection, patients: Iterable[dict[str, Any]]) -> int:
    """Atomically swap the patient cache for a fresh full copy."""
    now = utcnow_iso()
    rows = [
        (
            str(p["patient_id"]), str(p["identification_number"]).strip(),
            p.get("first_name"), p.get("last_name"), p.get("sex"),
            p.get("birthdate"), p.get("patient_type"), now,
        )
        for p in patients
        if p.get("patient_id") is not None and p.get("identification_number")
    ]
    with transaction(conn):
        conn.execute("DELETE FROM local_patients")
        conn.executemany(
            "INSERT OR REPLACE INTO local_patients (patient_id, identification_number, first_name,"
            " last_name, sex, birthdate, patient_type, pulled_at) VALUES (?,?,?,?,?,?,?,?)", rows)
    return len(rows)


# ----------------------------------------------------------------------- sync

def pending_records(conn: sqlite3.Connection, limit: int = 100, after_rowid: int = 0) -> list[dict]:
    """Unsynced rows in insertion order. `_rowid` lets the caller page forward so a row is
    attempted at most once per sync run."""
    cur = conn.execute(
        "SELECT rowid AS _rowid, * FROM local_health_records "
        "WHERE sync_status IN ('pending','failed') AND sync_attempts < ? AND rowid > ? "
        "ORDER BY rowid LIMIT ?", (MAX_ATTEMPTS, after_rowid, limit))
    return [dict(r) for r in cur.fetchall()]


def mark_synced(conn: sqlite3.Connection, record_ids: Iterable[str]) -> None:
    now = utcnow_iso()
    ids = [(now, i) for i in record_ids]
    with transaction(conn):
        conn.executemany(
            "UPDATE local_health_records SET sync_status='synced', synced_at=?, last_error=NULL "
            "WHERE record_id=?", ids)


def mark_rejected(conn: sqlite3.Connection, record_id: str, reason: str) -> None:
    conn.execute(
        "UPDATE local_health_records SET sync_status='failed', sync_attempts=sync_attempts+1, "
        "last_error=? WHERE record_id=?", (reason[:300], record_id))


def purge_synced(conn: sqlite3.Connection, older_than_days: int = RETAIN_SYNCED_DAYS) -> int:
    """Delete already-synced rows after a retention window (data minimisation)."""
    cutoff = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=older_than_days)).strftime(
        "%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
    cur = conn.execute(
        "DELETE FROM local_health_records WHERE sync_status='synced' AND synced_at < ?", (cutoff,))
    return cur.rowcount


def start_sync_run(conn: sqlite3.Connection) -> int:
    cur = conn.execute("INSERT INTO sync_runs (started_at) VALUES (?)", (utcnow_iso(),))
    return int(cur.lastrowid)


def finish_sync_run(conn: sqlite3.Connection, run_id: int, *, pushed: int, rejected: int,
                    pulled: int, ok: bool, error: str | None) -> None:
    conn.execute(
        "UPDATE sync_runs SET finished_at=?, pushed=?, rejected=?, pulled=?, ok=?, error=? WHERE id=?",
        (utcnow_iso(), pushed, rejected, pulled, int(ok), (error or "")[:300] or None, run_id))


def sync_status(conn: sqlite3.Connection) -> dict[str, Any]:
    counts = {r["sync_status"]: r["n"] for r in conn.execute(
        "SELECT sync_status, COUNT(*) AS n FROM local_health_records GROUP BY sync_status")}
    last = conn.execute("SELECT * FROM sync_runs ORDER BY id DESC LIMIT 1").fetchone()
    last_ok = conn.execute(
        "SELECT finished_at FROM sync_runs WHERE ok=1 ORDER BY id DESC LIMIT 1").fetchone()
    patients = conn.execute("SELECT COUNT(*) AS n FROM local_patients").fetchone()["n"]
    return {
        "pending": counts.get("pending", 0),
        "failed": counts.get("failed", 0),
        "synced": counts.get("synced", 0),
        "cached_patients": patients,
        "last_run": dict(last) if last else None,
        "last_successful_sync": last_ok["finished_at"] if last_ok else None,
    }