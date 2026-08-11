-- =============================================================================
-- Flavour Field Lab — PUBLIC ACCESS MODE
-- Run this once, after schema.sql, to switch the deployment from
-- "sign in with a magic link" to "anyone with the link can use it".
--
-- What changes and what deliberately does NOT:
--
--   * Storage uploads (field note photos + voice notes) happen in the browser
--     with the anon key. They previously required auth.role() = 'authenticated',
--     which no longer exists, so the insert policy is widened to anon.
--
--   * The DELETE policy on storage is DROPPED, not widened. Nobody can remove
--     media through the app or the public API.
--
--   * Table-level RLS is intentionally left strict. The app's server code now
--     talks to Postgres with the service-role key, which bypasses RLS entirely,
--     so the app keeps working. Meanwhile the anon key — which is public, it
--     ships in the JS bundle — still can't read or write a single row directly
--     through the REST API, because every table policy requires auth.uid().
--     That's the safety net: browsers get storage upload and nothing else.
-- =============================================================================

-- --- Storage: allow anonymous uploads -------------------------------------
drop policy if exists "authenticated users can upload field note media" on storage.objects;

create policy "anyone can upload field note media"
  on storage.objects for insert
  with check (bucket_id = 'field-note-media');

-- --- Storage: reads stay public (unchanged, recreated idempotently) --------
drop policy if exists "anyone can view field note media" on storage.objects;

create policy "anyone can view field note media"
  on storage.objects for select
  using (bucket_id = 'field-note-media');

-- --- Storage: remove the ability to delete, for everyone -------------------
drop policy if exists "owners can delete their field note media" on storage.objects;

-- No replacement policy is created. With RLS enabled and no DELETE policy,
-- deletes through the anon/authenticated API are refused outright.
