-- Local (on-device) SQLite schema for the health kiosk.
-- Applied idempotently by local_db.init_db().

CREATE TABLE IF NOT EXISTS schema_meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Read-only cache of patients pulled down from Supabase during sync.
-- Lets the kiosk identify a scanned barcode with no internet.
CREATE TABLE IF NOT EXISTS local_patients (
    patient_id            TEXT PRIMARY KEY,          -- Supabase patients.patient_id (stored as text)
    identification_number TEXT NOT NULL,
    first_name            TEXT,
    last_name             TEXT,
    sex                   TEXT,
    birthdate             TEXT,
    patient_type          TEXT,
    pulled_at             TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_local_patients_ident
    ON local_patients (identification_number);

-- Every real measurement is written here FIRST. record_id is a client-generated
-- UUID so the same row can be re-sent safely (idempotent upsert on the server).
CREATE TABLE IF NOT EXISTS local_health_records (
    record_id     TEXT PRIMARY KEY,                  -- UUID v4
    patient_id    TEXT NOT NULL,
    kiosk_id      TEXT,
    measured_by   TEXT,
    systolic_bp   REAL,
    diastolic_bp  REAL,
    heart_rate    REAL,
    temperature   REAL,
    spo2          REAL,
    height_cm     REAL,
    weight_kg     REAL,
    bmi           REAL,
    measured_at   TEXT NOT NULL,                     -- ISO-8601 UTC
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

    sync_status   TEXT NOT NULL DEFAULT 'pending'
                  CHECK (sync_status IN ('pending', 'synced', 'failed')),
    synced_at     TEXT,
    sync_attempts INTEGER NOT NULL DEFAULT 0,
    last_error    TEXT,

    CHECK (
        systolic_bp IS NOT NULL OR diastolic_bp IS NOT NULL OR heart_rate IS NOT NULL OR
        temperature IS NOT NULL OR spo2 IS NOT NULL OR height_cm IS NOT NULL OR
        weight_kg IS NOT NULL
    )
);
CREATE INDEX IF NOT EXISTS idx_records_sync
    ON local_health_records (sync_status, created_at);
CREATE INDEX IF NOT EXISTS idx_records_patient
    ON local_health_records (patient_id, measured_at DESC);

-- One row per sync attempt, for troubleshooting and for the capstone paper.
CREATE TABLE IF NOT EXISTS sync_runs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at  TEXT NOT NULL,
    finished_at TEXT,
    pushed      INTEGER NOT NULL DEFAULT 0,
    rejected    INTEGER NOT NULL DEFAULT 0,
    pulled      INTEGER NOT NULL DEFAULT 0,
    ok          INTEGER NOT NULL DEFAULT 0,
    error       TEXT
);

INSERT OR IGNORE INTO schema_meta (key, value) VALUES ('schema_version', '1');
