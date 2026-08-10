import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/** Server Component helper — redirects to /login if there's no session. */
export async function getUserOrRedirect() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return user;
}

/** Server Action helper — throws (rather than redirecting) so the caller can show a toast. */
export async function getUserOrThrow() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Please sign in to do that.');
  return user;
}
