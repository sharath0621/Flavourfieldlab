'use client';

import type { RDOpportunity } from '@/lib/types';
import { EvidenceBadge } from '@/components/evidence-badge';
import { Button } from '@/components/ui/button';
import { saveOpportunityToBacklog } from '@/app/actions';
import { useTransition } from 'react';

function ScoreCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="font-serif text-xl font-semibold">{value}</div>
      <div className="h-1 bg-rule-soft rounded-full my-1.5 overflow-hidden">
        <div className="h-full bg-rust" style={{ width: `${value * 10}%` }} />
      </div>
      <div className="text-[9.5px] uppercase tracking-wide text-ink-faint">{label}</div>
    </div>
  );
}

export function RDOpportunityCard({ opportunity, index }: { opportunity: RDOpportunity; index: number }) {
  const [pending, startTransition] = useTransition();
  const op = opportunity;

  return (
    <div className="bg-paper border border-rule rounded p-[22px] mb-4">
      <div className="flex justify-between items-start gap-4 mb-2.5">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-ink-faint">
            Opportunity {String(index + 1).padStart(2, '0')}
          </div>
          <h3 className="font-serif text-lg mt-1 mb-2">{op.title}</h3>
        </div>
        <EvidenceBadge type="HYPOTHESIS" />
      </div>

      <p className="text-sm text-ink-soft mb-3">
        <strong>Why interesting:</strong> {op.why}
      </p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {op.exploration.map((e) => (
          <span key={e} className="text-[11.5px] px-2.5 py-1 bg-bg border border-rule rounded-full">
            {e}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 mb-3.5">
        <ScoreCell label="Novelty" value={op.novelty_score} />
        <ScoreCell label="Feasibility" value={op.feasibility_score} />
        <ScoreCell label="Availability" value={op.availability_score} />
        <ScoreCell label="Brand fit" value={op.brand_fit_score} />
        <ScoreCell label="Int'l" value={op.international_score} />
        <ScoreCell label="Evidence" value={op.confidence_score} />
      </div>

      <div className="bg-bg-alt rounded p-3.5">
        <h4 className="text-xs uppercase tracking-wide text-ink-soft mb-2 font-semibold">Why did AI surface this?</h4>
        <ol className="list-decimal pl-[18px] text-[13px] text-ink-soft space-y-1">
          {op.why_this.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ol>
        <p className="mt-2.5 text-xs italic text-ink-faint">
          This is an exploratory hypothesis, not a validated product concept.
        </p>
      </div>

      {(op.risks.length > 0 || op.unknowns.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3.5">
          {op.risks.length > 0 && (
            <div className="border border-hypothesis/40 bg-hypothesis-bg rounded p-3.5">
              <h4 className="text-xs uppercase tracking-wide text-hypothesis mb-2 font-semibold">Risks</h4>
              <ul className="list-disc pl-[18px] text-[12.5px] text-ink-soft space-y-1">
                {op.risks.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          {op.unknowns.length > 0 && (
            <div className="border border-inference/40 bg-inference-bg rounded p-3.5">
              <h4 className="text-xs uppercase tracking-wide text-inference mb-2 font-semibold">Unknowns</h4>
              <ul className="list-disc pl-[18px] text-[12.5px] text-ink-soft space-y-1">
                {op.unknowns.map((u, i) => (
                  <li key={i}>{u}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {op.suggested_experiment && (
        <p className="text-[12.5px] text-ink-soft mt-3.5 pt-3.5 border-t border-rule-soft">
          <strong className="text-ink">Suggested next experiment: </strong>
          {op.suggested_experiment}
        </p>
      )}

      <div className="flex justify-between items-center mt-3.5">
        <span className="text-[11.5px] font-bold text-hypothesis">Status: {op.hypothesis_status}</span>
        {op.backlog_status ? (
          <span className="text-[11.5px] px-2.5 py-1 border border-rule rounded-full text-ink-soft">
            In backlog · {op.backlog_status}
          </span>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => startTransition(() => saveOpportunityToBacklog(op.id, op.field_note_id))}
          >
            {pending ? 'Saving…' : 'Save to Backlog'}
          </Button>
        )}
      </div>
    </div>
  );
}
