import { createAdminClient } from '@/lib/supabase/admin';

/**
 * PUBLIC ACCESS MODE
 * -----------------------------------------------------------------------------
 * This deployment has no sign-in step: anyone with the link can read and add
 * research. There is still exactly one researcher identity in the database —
 * the first account created in this Supabase project — and every visitor acts
 * as that researcher, so all notes land in one shared workspace.
 *
 * Consequences worth being explicit about:
 *  - Row Level Security can no longer scope anything to a session, so all
 *    server-side reads/writes go through the service-role client (see
 *    lib/supabase/admin.ts) rather than an anon client + RLS.
 *  - Nothing in the UI exposes a destructive action: there is no
 *    "delete field note" path. `regenerateAnalysis` replaces a note's derived
 *    AI rows, but never touches field_notes.raw_text — the researcher's
 *    original words are still immutable.
 *  - Producer/relationship records (KB §08/§11/§32) are visible to anyone with
 *    the link. If that becomes a problem, restore auth rather than patching
 *    around it.
 */

type PublicResearcher = { id: string; email: string | null };

// Resolved once per server process — the underlying account never changes.
let cached: PublicResearcher | null = null;

export async function getPublicResearcher(): Promise<PublicResearcher> {
  if (cached) return cached;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) throw new Error(`Could not resolve the workspace researcher: ${error.message}`);

  // Oldest account wins, matching supabase/seed.sql's
  // `select id from auth.users order by created_at asc limit 1`.
  const users = [...(data?.users ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const owner = users[0];

  if (!owner) {
    throw new Error(
      'No account exists in this Supabase project yet. Sign up once (or create a user in the Supabase Auth dashboard) so field notes have an owner to attach to.'
    );
  }

  cached = { id: owner.id, email: owner.email ?? null };
  return cached;
}
