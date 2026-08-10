import Link from 'next/link';
import { listFieldNotes } from '@/lib/queries';
import { formatDateShort } from '@/lib/utils';
import { IngredientSketch } from '@/components/ingredient-sketch';
import { INGREDIENT_CATEGORIES } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function FieldNotesPage({ searchParams }: { searchParams: { q?: string; category?: string } }) {
  const notes = await listFieldNotes({ q: searchParams.q, category: searchParams.category });

  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-ink-faint font-semibold mb-1.5">Field Notes</div>
      <h1 className="font-serif text-[30px] font-semibold mb-1">All discoveries</h1>
      <p className="text-ink-soft mb-6">
        {notes.length} note{notes.length !== 1 ? 's' : ''} {searchParams.q ? `matching "${searchParams.q}"` : 'captured'}.
      </p>

      <div className="flex flex-wrap gap-2 mb-5">
        <FilterChip href={buildHref(searchParams, undefined)} active={!searchParams.category || searchParams.category === 'all'}>
          All
        </FilterChip>
        {INGREDIENT_CATEGORIES.map((c) => (
          <FilterChip key={c} href={buildHref(searchParams, c)} active={searchParams.category === c}>
            {c}
          </FilterChip>
        ))}
      </div>

      <div className="flex flex-col gap-2.5">
        {notes.length === 0 ? (
          <div className="text-center py-16 text-ink-faint">
            <div className="text-4xl mb-3">🌱</div>
            No field notes match this filter.
          </div>
        ) : (
          notes.map((note) => (
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
                  {note.district}, {note.state} · {formatDateShort(note.date)}
                </div>
              </div>
              {note.is_demo && (
                <span className="text-[10px] font-bold text-rust bg-rust-bg px-2 py-0.5 rounded-sm shrink-0">DEMO</span>
              )}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function buildHref(searchParams: { q?: string; category?: string }, category?: string) {
  const params = new URLSearchParams();
  if (searchParams.q) params.set('q', searchParams.q);
  if (category) params.set('category', category);
  const qs = params.toString();
  return `/field-notes${qs ? `?${qs}` : ''}`;
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
