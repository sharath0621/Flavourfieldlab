import Link from 'next/link';
import { getDashboardData } from '@/lib/queries';
import { formatDateShort } from '@/lib/utils';
import { IngredientSketch } from '@/components/ingredient-sketch';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { recentNotes, stats, openQuestions } = await getDashboardData();

  return (
    <div>
      <span className="inline-block text-[9.5px] tracking-[0.1em] font-bold text-rust bg-rust-bg px-1.5 py-0.5 rounded-sm mb-3">
        LIVE DATA
      </span>
      <h1 className="font-serif text-[30px] font-semibold mb-1">Good morning.</h1>
      <p className="text-ink-soft mb-7">Your research landscape, at a glance.</p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-9">
        <StatCard num={stats.fieldNotes} label="Field Notes" href="/field-notes" cta="View all" />
        <StatCard num={stats.ingredients} label="Ingredients" href="/ingredients" cta="View library" />
        <StatCard num={stats.regions} label="Regions" href="/map" cta="View map" />
        <StatCard num={stats.researchBriefs} label="Research Briefs" href="/research" cta="View research" />
        <StatCard num={stats.rdOpportunities} label="R&D Opportunities" href="/rd" cta="View opportunities" />
      </div>

      <div className="flex items-baseline justify-between mt-9 mb-3.5">
        <h2 className="text-lg font-semibold">Recent discoveries</h2>
        <Link href="/field-notes" className="text-[12.5px] text-rust font-semibold">
          View all field notes →
        </Link>
      </div>

      {recentNotes.length === 0 ? (
        <EmptyDashboard />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {recentNotes.map((note) => (
            <Link
              key={note.id}
              href={`/field-notes/${note.id}`}
              className="bg-paper border border-rule rounded overflow-hidden hover:-translate-y-0.5 hover:shadow-card transition-transform"
            >
              <div className="h-24 bg-gradient-to-br from-bg-alt to-rule-soft flex items-center justify-center text-ink-soft">
                <IngredientSketch category={note.ingredient_category} size={44} />
              </div>
              <div className="px-3.5 py-3">
                <p className="font-serif font-semibold text-[15px] mb-0.5">{note.ingredient_name}</p>
                <p className="text-xs text-ink-soft">
                  {note.district}, {note.state} · {formatDateShort(note.date)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-baseline justify-between mt-9 mb-3.5">
        <h2 className="text-lg font-semibold">Open research questions</h2>
        <Link href="/research" className="text-[12.5px] text-rust font-semibold">
          View research →
        </Link>
      </div>
      <div className="bg-paper border border-rule rounded px-5">
        {openQuestions.length === 0 ? (
          <div className="text-center py-8 text-ink-faint text-sm">No open questions right now.</div>
        ) : (
          openQuestions.map((q: any) => (
            <div key={q.id} className="flex items-center gap-2.5 py-2.5 border-b border-rule-soft last:border-b-0">
              <div className="flex-1 text-[13.5px]">
                <strong>{q.field_notes?.ingredient_name}</strong> — {q.question}
              </div>
              <Link href={`/field-notes/${q.field_note_id}`} className="text-xs text-ink-soft hover:text-ink">
                Open →
              </Link>
            </div>
          ))
        )}
      </div>

      <div className="mt-9 border border-dashed border-rule rounded p-6 flex items-center justify-between bg-bg-alt gap-4 flex-wrap">
        <div>
          <h3 className="font-serif text-[17px] mb-1">Just back from a visit?</h3>
          <p className="text-[13.5px] text-ink-soft">Capture what you saw, smelled, tasted or learned — in under three minutes.</p>
        </div>
        <Link
          href="/field-notes/new"
          className="inline-flex items-center gap-1.5 rounded-full font-semibold text-sm px-4 py-2.5 bg-rust text-paper border border-rust hover:opacity-90"
        >
          + Capture Field Note
        </Link>
      </div>
    </div>
  );
}

function StatCard({ num, label, href, cta }: { num: number; label: string; href: string; cta: string }) {
  return (
    <Link
      href={href}
      className="group block bg-paper border border-rule rounded px-4 py-[18px] transition-transform hover:-translate-y-0.5 hover:shadow-card hover:border-ink-faint"
    >
      <div className="font-serif text-[32px] font-semibold leading-none">{num}</div>
      <div className="text-[11.5px] uppercase tracking-wide text-ink-soft mt-2">{label}</div>
      <div className="text-[10.5px] text-rust font-bold mt-2 opacity-0 group-hover:opacity-100 transition-opacity">{cta} →</div>
    </Link>
  );
}

function EmptyDashboard() {
  return (
    <div className="text-center py-16 text-ink-faint">
      <div className="text-4xl mb-3">🌱</div>
      No field notes yet. Capture your first discovery to see it here.
    </div>
  );
}
