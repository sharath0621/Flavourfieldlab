import { NextResponse, type NextRequest } from 'next/server';

/**
 * Public access mode — no session to refresh and no routes to gate, so this
 * is a pass-through. Kept in place (rather than deleted) as the obvious hook
 * point if auth is reintroduced later: restore the Supabase session refresh
 * here first, then re-add the guards in (app)/layout.tsx.
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: []
};
