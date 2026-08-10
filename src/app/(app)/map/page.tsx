import Link from 'next/link';
import { listNotesForMap } from '@/lib/queries';
import { formatDateShort } from '@/lib/utils';
import { IngredientSketch } from '@/components/ingredient-sketch';

export const dynamic = 'force-dynamic';

export default async function MapPage() {
  const notes = await listNotesForMap();
  const byState = new Map<string, typeof notes>();
  notes.forEach((n) => {
    if (!byState.has(n.state)) byState.set(n.state, []);
    byState.get(n.state)!.push(n);
  });
  const states = Array.from(byState.keys()).sort();

  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-ink-faint font-semibold mb-1.5">Map</div>
      <h1 className="font-serif text-[30px] font-semibold mb-1">Ingredient Atlas of India</h1>
      <p className="text-ink-soft mb-6">
        Early placeholder view — every field note plotted by region. A full interactive map (GPS pins, e.g. Leaflet
        or Mapbox) is planned for a later version; this list-based view reads from the same location data, so
        upgrading is a drop-in replacement, not a schema change.
      </p>

      <div className="bg-paper border border-rule rounded p-[26px]">
        {states.length === 0 ? (
          <div className="text-center py-10 text-ink-faint text-sm">No field notes yet.</div>
        ) : (
          states.map((state) => (
            <div key={state}>
              <div className="font-serif font-semibold text-[15px] mt-4 mb-1 first:mt-0">{state}</div>
              {byState.get(state)!.map((n) => (
                <Link
                  key={n.id}
                  href={`/field-notes/${n.id}`}
                  className="flex items-center gap-2.5 py-2.5 border-b border-rule-soft last:border-b-0"
                >
                  <span className="w-2 h-2 rounded-full bg-rust shrink-0" />
                  <span className="inline-flex items-center gap-1.5 text-ink-soft">
                    <IngredientSketch category={n.ingredient_category} size={18} />
                    <span className="text-ink">{n.ingredient_name}</span>
                  </span>
                  <span className="ml-auto text-xs text-ink-faint">
                    {n.district} · {formatDateShort(n.date)}
                  </span>
                </Link>
              ))}
            </div>
          ))
        )}
        <p className="text-xs text-ink-faint mt-5">
          Future: swap this list for a real India choropleth/pin map reading from field_notes.gps — no schema change
          required.
        </p>
      </div>
    </div>
  );
}
