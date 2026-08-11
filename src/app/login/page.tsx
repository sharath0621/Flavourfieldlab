import { redirect } from 'next/navigation';

// Public access mode — there is no sign-in step. Kept as a redirect so any
// old bookmark or emailed magic link still lands somewhere sensible.
export default function LoginPage() {
  redirect('/dashboard');
}
