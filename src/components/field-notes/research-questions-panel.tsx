'use client';

import { useTransition } from 'react';
import { updateResearchQuestionStatus } from '@/app/actions';
import { QUESTION_STATUSES, type ResearchQuestion } from '@/lib/types';

const PRIORITY_COLOR: Record<string, string> = {
  High: 'text-hypothesis',
  Medium: 'text-inference',
  Low: 'text-ink-faint'
};

export function ResearchQuestionsPanel({ questions, fieldNoteId }: { questions: ResearchQuestion[]; fieldNoteId: string }) {
  const [, startTransition] = useTransition();

  return (
    <div>
      {questions.map((q) => (
        <div key={q.id} className="flex items-start gap-2.5 py-2.5 border-b border-rule-soft last:border-b-0">
          <div className="flex-1">
            <div className="text-[13.5px]">{q.question}</div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              {q.priority && (
                <span className={`text-[10.5px] uppercase tracking-wide font-bold ${PRIORITY_COLOR[q.priority] || 'text-ink-faint'}`}>
                  {q.priority} priority
                </span>
              )}
              {q.evidence_required && (
                <span className="text-[11px] text-ink-faint">Needs: {q.evidence_required}</span>
              )}
            </div>
          </div>
          <select
            defaultValue={q.status}
            onChange={(e) => startTransition(() => updateResearchQuestionStatus(q.id, e.target.value as any, fieldNoteId))}
            className="text-[11.5px] px-2 py-1 border border-rule rounded-full bg-bg shrink-0"
          >
            {QUESTION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
