import Link from 'next/link';
import { listAllOpportunities } from '@/lib/queries';
import { BacklogStatusSelect } from '@/components/rd/backlog-status-select';
import { QuickSaveButton } from '@/components/rd/quick-save-button';
import { IngredientSketch } from '@/components/ingredient-sketch';
import { INGREDIENT_CATEGORIES, type BacklogStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

const PRIMARY_COLS: BacklogStatus[] = ['Captured', 'Researching', 'Interesting', 'Prototype'];
const SECONDARY_COLS: BacklogStatus[] = ['Tested', 'Promising', 'Rejected', 'Archived'];

export default async function RDOpportunitiesPage({ searchParams }: { searchParams: { category?: string } }) {
  const all = await listAllOpportunities(searchParams.category);
  const backlog = all.filter((i: any) => i.backlog_status);

  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-ink-faint font-semibold mb-1.5">R&amp;D Opportunities</div>
      <h1 className="font-serif text-[30px] font-semibold mb-1">R&amp;D Opportunities</h1>
      <p className="text-ink-soft mb-6">
        {all.length} idea{all.length !== 1 ? 's' : ''} generated from field research · {backlog.length} saved to backlog.
      </p>

      <div className="flex flex-wrap gap-2 mb-5">
        <FilterChip href="/rd" active={!searchParams.category || searchParams.category === 'all'}>
          All ingredients
        </FilterChip>
        {INGREDIENT_CATEGORIES.map((c) => (
          <FilterChip key={c} href={`/rd?category=${encodeURIComponent(c)}`} active={searchParams.category === c}>
            {c}
          </FilterChip>
        ))}
      </div>

      <h2 className="text-lg font-semibold mb-3.5">All opportunities</h2>
      {all.length === 0 ? (
        <div className="text-center py-16 text-ink-faint mb-9">
          <div className="text-4xl mb-3">◆</div>
          No R&amp;D opportunities generated yet.
          <br />
          <br />
          <Link href="/field-notes" className="inline-block rounded-full bg-rust text-paper text-sm font-semibold px-4 py-2.5">
            Browse field notes →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 mb-9">
          {all.map((item: any) => (
            <div key={item.id} className="flex gap-4 items-center px-4 py-3.5 bg-paper border border-rule rounded">
              <div className="w-[52px] h-[52px] rounded-full bg-bg-alt flex items-center justify-center text-ink-soft shrink-0">
                <IngredientSketch category={item.field_notes?.ingredient_category} size={26} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-serif font-semibold text-[15.5px]">{item.title}</div>
                <div className="text-xs text-ink-soft mt-0.5">
                  From {item.field_notes?.ingredient_name} · {item.field_notes?.state} · Novelty {item.novelty_score}/10 ·
                  Evidence {item.confidence_score >= 6 ? 'Medium-High' : item.confidence_score >= 4 ? 'Medium' : 'Low'}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {item.backlog_status ? (
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-fact-bg text-fact font-semibold">🟢 {item.backlog_status}</span>
                ) : (
                  <QuickSaveButton opportunityId={item.id} fieldNoteId={item.field_note_id} />
                )}
                <Link href={`/field-notes/${item.field_note_id}`} className="text-xs text-ink-soft hover:text-ink">
                  View note →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="text-lg font-semibold mb-3.5">Backlog board</h2>
      {backlog.length === 0 ? (
        <div className="text-center py-12 text-ink-faint">
          Nothing saved to the backlog yet — save an opportunity above to start tracking it here.
        </div>
      ) : (
        <>
          <Board items={backlog} cols={PRIMARY_COLS} />
          <h3 className="text-sm font-semibold mt-7 mb-3">Other statuses</h3>
          <Board items={backlog} cols={SECONDARY_COLS} />
        </>
      )}
    </div>
  );
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`text-xs px-3 py-1.5 rounded-full border ${
        active ? 'bg-ink text-paper border-ink' : 'bg-paper text-ink-soft border-rule'
      }`}
    >
      {children}
    </Link>
  );
}

function Board({ items, cols }: { items: any[]; cols: BacklogStatus[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-start">
      {cols.map((col) => {
        const colItems = items.filter((i) => i.backlog_status === col);
        return (
          <div key={col}>
            <h4 className="text-xs uppercase tracking-wide text-ink-soft font-semibold mb-2.5 flex justify-between">
              <span>{col}</span>
              <span>{colItems.length}</span>
            </h4>
            {colItems.length === 0 ? (
              <div className="text-xs text-ink-faint py-2">Empty</div>
            ) : (
              colItems.map((item) => (
                <div key={item.id} className="bg-paper border border-rule rounded p-3.5 mb-2.5">
                  <h5 className="font-serif text-sm mb-1.5">{item.title}</h5>
                  <div className="text-[11px] text-ink-faint mb-2">
                    Source: {item.field_notes?.ingredient_name} · Evidence:{' '}
                    {item.confidence_score >= 6 ? 'Medium-High' : item.confidence_score >= 4 ? 'Medium' : 'Low'}
                  </div>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <BacklogStatusSelect opportunityId={item.id} fieldNoteId={item.field_note_id} status={item.backlog_status} />
                    <Link href={`/field-notes/${item.field_note_id}`} className="text-xs text-ink-soft hover:text-ink">
                      View note →
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
