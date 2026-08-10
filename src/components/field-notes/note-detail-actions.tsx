'use client';

import { useState, useTransition } from 'react';
import { regenerateAnalysis, saveAllOpportunitiesToBacklog } from '@/app/actions';
import { Button } from '@/components/ui/button';

export function RegenerateButton({ fieldNoteId }: { fieldNoteId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="inline-flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const { analysisError } = await regenerateAnalysis(fieldNoteId);
            setMessage(analysisError ? `Regeneration failed: ${analysisError}` : 'Analysis regenerated.');
          })
        }
      >
        {pending ? 'Regenerating…' : '↻ Regenerate analysis'}
      </Button>
      {message && <span className="text-xs text-ink-faint">{message}</span>}
    </div>
  );
}

export function SaveAllToBacklogButton({ fieldNoteId }: { fieldNoteId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button variant="rust" disabled={pending} onClick={() => startTransition(() => saveAllOpportunitiesToBacklog(fieldNoteId))}>
      {pending ? 'Saving…' : 'Save to R&D Backlog'}
    </Button>
  );
}
