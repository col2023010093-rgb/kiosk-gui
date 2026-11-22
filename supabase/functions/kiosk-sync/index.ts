// Supabase Edge Function: kiosk-sync
//
// Called by the Raspberry Pi sync worker (not by browsers).
//   POST  { action: "push_records", records: [...] }  -> { accepted: [...], rejected: [...] }
//   POST  { action: "pull_patients", page, page_size } -> { patients: [...], has_more }
//
// Auth: headers X-Kiosk-Id + X-Kiosk-Key, checked against public.kiosk_sync_keys (SHA-256).
// The service-role key stays inside this function; it is never placed on the kiosk.
import { createClient } from "npm:@supabase/supabase-js@2";

const MAX_RECORDS = 200;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// payload key (from kiosk)  ->  Supabase health_records column (matches your real schema)
const COLUMN_MAP: Record<string, string> = {
  patient_id: "patient_id",
  measured_by: "measured_by",
  systolic_bp: "systolic",
  diastolic_bp: "diastolic",
  heart_rate: "heart_rate",
  temperature: "temperature",
  spo2: "spo2",
  height_cm: "height",
  weight_kg: "weight",
  bmi: "bmi",
  measured_at: "measured_at",
};
// These Supabase columns are `integer`; the Pi sends 72.0, which Postgres rejects, so round.
const INTEGER_COLUMNS = new Set(["systolic", "diastolic", "heart_rate", "spo2"]);

const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") ?? "";
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...(allowedOrigin ? { "Access-Control-Allow-Origin": allowedOrigin } : {}) },
  });

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // ---- authenticate the kiosk ------------------------------------------------------------
  const kioskId = req.headers.get("X-Kiosk-Id") ?? "";
  const kioskKey = req.headers.get("X-Kiosk-Key") ?? "";
  // kiosk_id is a uuid in your schema (kiosks.kiosk_id); reject anything else early.
  if (!UUID_RE.test(kioskId) || !kioskKey) return json({ error: "unauthorized" }, 401);

  const { data: keyRow } = await supabase
    .from("kiosk_sync_keys").select("key_hash, revoked_at").eq("kiosk_id", kioskId).maybeSingle();
  const presented = await sha256Hex(kioskKey);
  if (!keyRow || keyRow.revoked_at || !timingSafeEqual(presented, keyRow.key_hash)) {
    return json({ error: "unauthorized" }, 401); // same answer for unknown kiosk / bad key
  }

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "invalid json" }, 400); }

  // ---- push_records ----------------------------------------------------------------------
  if (body.action === "push_records") {
    const records: any[] = Array.isArray(body.records) ? body.records : [];
    if (records.length === 0 || records.length > MAX_RECORDS) {
      return json({ error: `records must contain 1-${MAX_RECORDS} items` }, 400);
    }

    const accepted: string[] = [];
    const rejected: { record_id: string; reason: string }[] = [];
    const rows: Record<string, unknown>[] = [];

    for (const r of records) {
      const id = String(r?.record_id ?? "");
      if (!UUID_RE.test(id)) { rejected.push({ record_id: id, reason: "invalid record_id" }); continue; }
      const row: Record<string, unknown> = {
        record_id: id, // same uuid as on the kiosk, so records are traceable end to end
        client_record_id: id, // idempotency key (unique index from the migration)
        kiosk_id: kioskId, // taken from the authenticated kiosk, never from the payload
        source: "kiosk-sync",
        synced_at: new Date().toISOString(),
      };
      for (const [from, to] of Object.entries(COLUMN_MAP)) {
        const value = r[from] ?? null;
        row[to] = INTEGER_COLUMNS.has(to) && typeof value === "number" ? Math.round(value) : value;
      }
      rows.push(row);
    }

    const upsert = (batch: Record<string, unknown>[]) =>
      supabase.from("health_records").upsert(batch, {
        onConflict: "client_record_id", ignoreDuplicates: true, // re-sent rows are a no-op
      });

    if (rows.length) {
      const { error } = await upsert(rows);
      if (!error) {
        rows.forEach((r) => accepted.push(r.client_record_id as string));
      } else {
        // One bad row (e.g. unknown patient) must not block the rest: retry row by row.
        for (const row of rows) {
          const { error: rowError } = await upsert([row]);
          if (rowError) rejected.push({ record_id: row.client_record_id as string, reason: rowError.message.slice(0, 200) });
          else accepted.push(row.client_record_id as string);
        }
      }
    }
    return json({ accepted, rejected });
  }

  // ---- pull_patients ---------------------------------------------------------------------
  if (body.action === "pull_patients") {
    const pageSize = Math.min(Math.max(Number(body.page_size) || 1000, 1), 1000);
    const page = Math.max(Number(body.page) || 0, 0);
    const from = page * pageSize;

    const { data: patients, error } = await supabase
      .from("patients")
      .select("patient_id, profile_id, identification_number, patient_type, sex, birthdate")
      .order("patient_id", { ascending: true })
      .range(from, from + pageSize); // fetch one extra row to learn if another page exists
    if (error) return json({ error: "query failed" }, 500);

    const hasMore = (patients?.length ?? 0) > pageSize;
    const pageRows = (patients ?? []).slice(0, pageSize);

    // Names come from profiles; fetched separately so no foreign key is required.
    const profileIds = pageRows.map((p) => p.profile_id).filter((v) => v != null);
    const names = new Map<unknown, { first_name: string; last_name: string }>();
    if (profileIds.length) {
      const { data: profiles } = await supabase
        .from("profiles").select("profile_id, first_name, last_name").in("profile_id", profileIds);
      (profiles ?? []).forEach((p) => names.set(p.profile_id, p));
    }

    return json({
      has_more: hasMore,
      patients: pageRows.map((p) => ({
        patient_id: p.patient_id,
        identification_number: p.identification_number,
        patient_type: p.patient_type,
        sex: p.sex,
        birthdate: p.birthdate,
        first_name: names.get(p.profile_id)?.first_name ?? null,
        last_name: names.get(p.profile_id)?.last_name ?? null,
      })),
    });
  }

  return json({ error: "unknown action" }, 400);
});
