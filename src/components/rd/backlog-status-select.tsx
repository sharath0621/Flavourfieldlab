'use client';

import { useTransition } from 'react';
import { updateBacklogStatus } from '@/app/actions';
import { BACKLOG_STATUSES, type BacklogStatus } from '@/lib/types';

export function BacklogStatusSelect({
  opportunityId,
  fieldNoteId,
  status
}: {
  opportunityId: string;
  fieldNoteId: string;
  status: BacklogStatus;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <select
      defaultValue={status}
      disabled={pending}
      onChange={(e) => startTransition(() => updateBacklogStatus(opportunityId, e.target.value as BacklogStatus, fieldNoteId))}
      className="text-[11px] px-1.5 py-1 border border-rule rounded-sm bg-paper"
    >
      {BACKLOG_STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
