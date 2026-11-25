-- RLS hardening, 2026-11-25
-- Already applied to the live project; kept here so the repo documents it. Safe to re-run.

-- 1. Remove the two policies that overrode the stricter "own row" rules.
drop policy if exists "patients_select_authenticated" on public.patients;
drop policy if exists "health_records_insert_authenticated" on public.health_records;

-- 2. Logged-out visitors (anon) have no policies on any table, so take their table privileges away.
revoke all on all tables in schema public from anon;
revoke truncate, trigger, references on all tables in schema public from authenticated;

-- 3. Helper functions that only make sense for a logged-in user.
revoke execute on function public.get_my_barcode()        from public, anon;
revoke execute on function public.current_profile_id()    from public, anon;
revoke execute on function public.current_profile_role()  from public, anon;
revoke execute on function public.current_role_name()     from public, anon;
grant  execute on function public.get_my_barcode()        to authenticated, service_role;
grant  execute on function public.current_profile_id()    to authenticated, service_role;
grant  execute on function public.current_profile_role()  to authenticated, service_role;
grant  execute on function public.current_role_name()     to authenticated, service_role;
