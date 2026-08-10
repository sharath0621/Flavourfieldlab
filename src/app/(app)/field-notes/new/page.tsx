import { getUserOrRedirect } from '@/lib/supabase/auth';
import { CaptureForm } from '@/components/field-notes/capture-form';

export const dynamic = 'force-dynamic';

export default async function NewFieldNotePage() {
  const user = await getUserOrRedirect();
  const defaultName = (user.user_metadata?.name as string) || user.email || 'Researcher';

  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-ink-faint font-semibold mb-1.5">New field note</div>
      <h1 className="font-serif text-[30px] font-semibold mb-1">What did you discover?</h1>
      <p className="text-ink-soft mb-7">Capture it messy. Structure comes later.</p>
      <CaptureForm researcherDefaultName={defaultName} />
    </div>
  );
}
