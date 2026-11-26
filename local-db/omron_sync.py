"""Reads the Omron HEM-7142T2 over Bluetooth and saves readings into the kiosk DB."""
import asyncio
import datetime as dt

import local_db
from omron_reader import read_all


def log(*args):
    print(dt.datetime.now().strftime("%H:%M:%S"), *args, flush=True)


def to_utc(naive_local: str) -> str:
    # The monitor and the Pi both use Pi-local time (naive), so treat it as local.
    t = dt.datetime.fromisoformat(naive_local).astimezone(dt.timezone.utc)
    return t.strftime("%Y-%m-%dT%H:%M:%S.000Z")


def save(conn, records) -> int:
    received = local_db.utcnow_iso()
    new = 0
    for r in records:
        cur = conn.execute(
            "INSERT OR IGNORE INTO omron_readings (systolic, diastolic, pulse, "
            "measured_at, received_at, device_seq, irregular, movement) "
            "VALUES (?,?,?,?,?,?,?,?)",
            (r["systolic"], r["diastolic"], r["pulse"], to_utc(r["measured_at"]),
             received, r["seq"], int(r["irregular"]), int(r["movement"])))
        new += cur.rowcount
    return new


async def main():
    conn = local_db.init_db()
    log("Waiting for the monitor (take a measurement)...")
    while True:
        try:
            records = await read_all(scan_timeout=30)
        except Exception as exc:
            log("sync failed, retrying:", repr(exc))
            await asyncio.sleep(5)
            continue
        if records is None:
            continue
        new = save(conn, records)
        log(f"read {len(records)} records, {new} new")
        await asyncio.sleep(15)


asyncio.run(main())
