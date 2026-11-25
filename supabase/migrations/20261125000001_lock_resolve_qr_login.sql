-- resolve_qr_login returned name, email, role and account id for any ID number to anyone,
-- including logged-out visitors. Nothing in the app calls it (barcode login uses the
-- barcode-login Edge Function), so only the service role may run it.
-- Already applied to the live project. Safe to re-run.
-- To undo: grant execute on function public.resolve_qr_login(text) to authenticated;
revoke execute on function public.resolve_qr_login(text) from public, anon, authenticated;
grant  execute on function public.resolve_qr_login(text) to service_role;
