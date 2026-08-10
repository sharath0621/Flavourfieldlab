'use client';

import { useTransition } from 'react';
import { saveOpportunityToBacklog } from '@/app/actions';

export function QuickSaveButton({ opportunityId, fieldNoteId }: { opportunityId: string; fieldNoteId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => saveOpportunityToBacklog(opportunityId, fieldNoteId))}
      className="text-xs px-3 py-1.5 border border-rule rounded-full bg-paper disabled:opacity-50"
    >
      {pending ? 'Saving…' : 'Save to Backlog'}
    </button>
  );
}
