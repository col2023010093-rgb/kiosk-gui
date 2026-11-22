-- Support for the kiosk -> Supabase sync (Edge Function: kiosk-sync).
-- Idempotent: safe to run more than once.
--
-- ASSUMPTION TO VERIFY: tables public.health_records and public.kiosks already exist
-- (they are described in packages/shared/src/types/database.ts).

-- 1) Idempotency key. The kiosk generates a UUID per measurement; re-sending the same
--    row can never create a duplicate. A separate column is used so this works no matter
--    what type health_records.record_id currently has.
alter table public.health_records add column if not exists client_record_id uuid;
alter table public.health_records add column if not exists synced_at timestamptz;
alter table public.health_records add column if not exists source text;

-- Plain (non-partial) unique index: required for PostgREST/Supabase upsert ON CONFLICT.
-- Postgres treats NULLs as distinct, so existing rows without a value are fine.
create unique index if not exists health_records_client_record_id_key
    on public.health_records (client_record_id);

-- 2) Per-kiosk secret. Only the SHA-256 hash is stored.
--    RLS is enabled with NO policies => anon/authenticated users can never read it;
--    the Edge Function reads it with the service-role key.
create table if not exists public.kiosk_sync_keys (
    kiosk_id    uuid primary key,   -- = kiosks.kiosk_id
    key_hash    text not null,
    created_at  timestamptz not null default now(),
    revoked_at  timestamptz
);
alter table public.kiosk_sync_keys enable row level security;
revoke all on public.kiosk_sync_keys from anon, authenticated;
