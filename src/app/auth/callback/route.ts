import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Supabase Auth magic-link / OAuth callback — exchanges the code for a
// session cookie, then sends the researcher into the app.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
