import { NextResponse, type NextRequest } from 'next/server';

// Public access mode — there is no sign-in step, so there's no auth code to
// exchange. Retained so previously-issued magic links don't 404; they just
// drop the visitor into the workspace.
export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL('/dashboard', request.url));
}
