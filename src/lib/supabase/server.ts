import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Session-aware server client. CURRENTLY UNUSED — the app runs in public
 * access mode (no sign-in), so reads and writes go through the service-role
 * client in lib/supabase/admin.ts instead. Kept as the restore point for
 * reintroducing auth: bring back the session refresh in middleware.ts, swap
 * queries.ts/actions.ts back to this client, and re-add the layout guards.
 *
 * Reads the session from cookies (set by middleware.ts).
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component that can't set cookies — safe to
            // ignore as long as middleware.ts is refreshing the session.
          }
        }
      }
    }
  );
}
