import { CaptureForm } from '@/components/field-notes/capture-form';

export const dynamic = 'force-dynamic';

export default function NewFieldNotePage() {
  // Public access mode: no session, so there's no name to prefill from. The
  // researcher types their own name on the form instead.
  const defaultName = '';

  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-ink-faint font-semibold mb-1.5">New field note</div>
      <h1 className="font-serif text-[30px] font-semibold mb-1">What did you discover?</h1>
      <p className="text-ink-soft mb-7">Capture it messy. Structure comes later.</p>
      <CaptureForm researcherDefaultName={defaultName} />
    </div>
  );
}
