// Blood pressure from the Omron HEM-7142T2, read over Bluetooth by the Pi
// (local-db/omron_sync.py) and served by local_api.py.
//
// A reading is only given to a patient if the Pi received it AFTER that patient's
// visit began and the monitor says it was measured at about that time (the server
// enforces both). A reading taken before the visit, or one that syncs late, is never used.

import { getLatestBpLocal } from "./localRecords";

const POLL_MS = 2000;
// Long on purpose: if this throws, the page re-runs every sensor, and the patient
// should not have to stand on the scale again just because the cuff took a while.
const WAIT_MS = 10 * 60 * 1000;
const VISIT_MAX_AGE_MS = 15 * 60 * 1000;

interface BloodPressure {
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
}

interface Visit {
  patientId: string;
  startedAt: number;
  since: string;
  accepted?: BloodPressure;
}

let visit: Visit | null = null;

// What the kiosk screen should tell the patient while we wait for a usable reading.
export type BloodPressureNoticeKind = "movement" | "invalid";
let notice: BloodPressureNoticeKind | null = null;
const noticeListeners = new Set<() => void>();

function setNotice(next: BloodPressureNoticeKind | null): void {
  if (notice === next) return;
  notice = next;
  noticeListeners.forEach((listener) => listener());
}

export function getBloodPressureNotice(): BloodPressureNoticeKind | null {
  return notice;
}

export function subscribeBloodPressureNotice(listener: () => void): () => void {
  noticeListeners.add(listener);
  return () => {
    noticeListeners.delete(listener);
  };
}

/** Marks the moment this patient's blood pressure visit began. Safe to call on every retry. */
export function startBloodPressureWindow(patientId: string): void {
  const now = Date.now();
  if (visit && visit.patientId === patientId && now - visit.startedAt < VISIT_MAX_AGE_MS) return;
  visit = { patientId, startedAt: now, since: new Date(now).toISOString() };
  setNotice(null);
}

/** Forget the visit (after the record is saved) so the next patient starts clean. */
export function clearBloodPressureWindow(): void {
  visit = null;
  setNotice(null);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** One millisecond after `iso`, so a skipped reading is not returned again. */
function justAfter(iso: string): string {
  return new Date(Date.parse(iso) + 1).toISOString();
}

export async function readBloodPressure(): Promise<BloodPressure> {
  const current = visit;
  if (!current) throw new Error("Blood pressure visit was not started.");
  if (current.accepted) return current.accepted;

  const deadline = Date.now() + WAIT_MS;
  while (Date.now() < deadline) {
    if (visit !== current) throw new Error("Blood pressure visit was reset. Please start again.");
    const { reading } = await getLatestBpLocal(current.since);
    if (!reading) {
      await sleep(POLL_MS);
      continue;
    }
    const plausible =
      reading.systolic >= 60 && reading.systolic <= 260 &&
      reading.diastolic >= 30 && reading.diastolic <= 150 &&
      reading.systolic > reading.diastolic;
    if (plausible && !reading.movement) {
      setNotice(null);
      current.accepted = {
        bloodPressureSystolic: reading.systolic,
        bloodPressureDiastolic: reading.diastolic,
      };
      return current.accepted;
    }
    // Body movement or an impossible value: skip it and wait for a fresh measurement.
    setNotice(reading.movement ? "movement" : "invalid");
    current.since = justAfter(reading.received_at);
  }
  throw new Error("No blood pressure reading yet. Take a measurement on the monitor.");
}
