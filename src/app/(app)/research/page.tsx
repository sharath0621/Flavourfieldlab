import Link from 'next/link';
import { listAllResearchQuestions, listResearchBriefs } from '@/lib/queries';
import { QUESTION_STATUSES } from '@/lib/types';
import { formatDateShort } from '@/lib/utils';
import { IngredientSketch } from '@/components/ingredient-sketch';

export const dynamic = 'force-dynamic';

export default async function ResearchPage({ searchParams }: { searchParams: { status?: string } }) {
  const [questions, briefs] = await Promise.all([listAllResearchQuestions(), listResearchBriefs()]);
  const filter = searchParams.status;
  const filtered = filter && filter !== 'All' ? questions.filter((q: any) => q.status === filter) : questions;

  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-ink-faint font-semibold mb-1.5">Research</div>
      <h1 className="font-serif text-[30px] font-semibold mb-1">Research Briefs</h1>
      <p className="text-ink-soft mb-6">
        {briefs.length} brief{briefs.length !== 1 ? 's' : ''} — one per field note: what&apos;s known, what isn&apos;t,
        and what&apos;s still open.
      </p>

      {briefs.length === 0 ? (
        <div className="text-center py-10 text-ink-faint text-sm mb-9">No field notes yet.</div>
      ) : (
        <div className="flex flex-col gap-2.5 mb-9">
          {briefs.map(({ note, knownCount, questionCount, openCount }) => (
            <Link
              key={note.id}
              href={`/field-notes/${note.id}`}
              className="flex gap-4 items-center px-4 py-3.5 bg-paper border border-rule rounded hover:border-ink-faint"
            >
              <div className="w-[52px] h-[52px] rounded-full bg-bg-alt flex items-center justify-center text-ink-soft shrink-0">
                <IngredientSketch category={note.ingredient_category} size={26} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-serif font-semibold text-[15.5px]">{note.ingredient_name}</div>
                <div className="text-xs text-ink-soft mt-0.5">
                  {note.state} · {formatDateShort(note.date)} · {knownCount} known · {questionCount} question
                  {questionCount !== 1 ? 's' : ''} raised
                </div>
              </div>
              {openCount ? (
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-hypothesis-bg text-hypothesis font-semibold shrink-0">
                  🟠 {openCount} open
                </span>
              ) : (
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-fact-bg text-fact font-semibold shrink-0">🟢 All addressed</span>
              )}
            </Link>
          ))}
        </div>
      )}

      <h2 className="text-lg font-semibold mb-3.5">Open research questions, across all briefs</h2>
      <div className="flex flex-wrap gap-2 mb-5">
        {['All', ...QUESTION_STATUSES].map((s) => (
          <Link
            key={s}
            href={`/research?status=${encodeURIComponent(s)}`}
            className={`text-xs px-3 py-1.5 rounded-full border ${
              (filter || 'All') === s ? 'bg-ink text-paper border-ink' : 'bg-paper text-ink-soft border-rule'
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      <div className="bg-paper border border-rule rounded px-5">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-ink-faint text-sm">No questions in this state.</div>
        ) : (
          filtered.map((q: any) => (
            <div key={q.id} className="flex items-center gap-2.5 py-2.5 border-b border-rule-soft last:border-b-0">
              <div className="flex-1 text-[13.5px]">
                <strong>{q.field_notes?.ingredient_name}</strong> ({q.field_notes?.state}) — {q.question}
              </div>
              <span className="text-xs px-2.5 py-1 border border-rule rounded-full text-ink-soft">{q.status}</span>
              <Link href={`/field-notes/${q.field_note_id}`} className="text-xs text-ink-soft hover:text-ink">
                Open →
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
