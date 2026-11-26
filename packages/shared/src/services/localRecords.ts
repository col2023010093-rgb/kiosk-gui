// Client for the kiosk's local database API (local-db/local_api.py).
// Real measurements are saved HERE first; a nightly job forwards them to Supabase.
//
// Dev:  add to vite.config.ts  server.proxy:
//   "/local-api": { target: "http://127.0.0.1:5003", changeOrigin: true,
//                   rewrite: (p) => p.replace(/^\/local-api/, "") }

const BASE = (import.meta.env.VITE_LOCAL_API_URL as string | undefined) ?? "/local-api";
const TIMEOUT_MS = 8000;

export interface LocalRecordInput {
  patient_id: string;
  measured_by?: string | null;
  systolic_bp?: number | null;
  diastolic_bp?: number | null;
  heart_rate?: number | null;
  temperature?: number | null;
  spo2?: number | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  bmi?: number | null;
  measured_at?: string;
  /** Simulated readings are rejected by the server; set true only to mirror the UI flag. */
  simulated?: boolean;
}

export interface LocalPatient {
  patient_id: string;
  identification_number: string;
  first_name: string | null;
  last_name: string | null;
  sex: string | null;
  birthdate: string | null;
  patient_type: string | null;
}

export interface LocalSyncStatus {
  pending: number;
  failed: number;
  synced: number;
  cached_patients: number;
  last_successful_sync: string | null;
}

/** The local database service is down or unreachable (as opposed to rejecting the data). */
export class LocalApiUnavailableError extends Error {
  constructor(message = "Local database service is not reachable") {
    super(message);
    this.name = "LocalApiUnavailableError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    let res: Response;
    try {
      res = await fetch(`${BASE}${path}`, { ...init, signal: controller.signal });
    } catch {
      throw new LocalApiUnavailableError();
    }
    // Our local API ALWAYS answers with JSON. A non-JSON reply (an HTML 404 page from a
    // static server, an SPA fallback, a proxy error page) means we are not talking to it,
    // and a 5xx is what the proxy answers when nothing listens on port 5003.
    const data = await res.json().catch(() => null);
    if (data === null || res.status >= 500) {
      throw new LocalApiUnavailableError(`Local API not available (${res.status})`);
    }
    // A JSON 404 such as {"error":"not found"} is a real answer from our API (patient lookup).
    if (!res.ok) {
      throw new Error((data as { error?: string }).error ?? `Local API error (${res.status})`);
    }
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

export function saveRecordLocal(input: LocalRecordInput) {
  return request<{ record_id: string; sync_status: string }>("/api/local/records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function lookupPatientLocal(identificationNumber: string): Promise<LocalPatient | null> {
  try {
    const { patient } = await request<{ patient: LocalPatient }>(
      `/api/local/patients/lookup?identification_number=${encodeURIComponent(identificationNumber)}`,
    );
    return patient;
  } catch (err) {
    if (err instanceof Error && err.message === "not found") return null;
    throw err;
  }
}

export function listRecordsLocal(patientId?: string, limit = 50) {
  const q = new URLSearchParams({ limit: String(limit) });
  if (patientId) q.set("patient_id", patientId);
  return request<{ records: Array<Record<string, unknown>> }>(`/api/local/records?${q}`);
}

export function getLocalSyncStatus() {
  return request<LocalSyncStatus>("/api/local/sync/status");
}

export interface LocalBpReading {
  systolic: number;
  diastolic: number;
  pulse: number;
  measured_at: string;
  received_at: string;
  device_seq: number;
  irregular: boolean;
  movement: boolean;
}

/** Newest Omron reading that belongs to a visit that began at `sinceIso` (null if none yet). */
export function getLatestBpLocal(sinceIso: string) {
  return request<{ reading: LocalBpReading | null }>(
    `/api/local/bp/latest?since=${encodeURIComponent(sinceIso)}`,
  );
}
