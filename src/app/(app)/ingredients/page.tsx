import Link from 'next/link';
import { listIngredientsWithNotes } from '@/lib/queries';
import { IngredientSketch } from '@/components/ingredient-sketch';

export const dynamic = 'force-dynamic';

export default async function IngredientsPage() {
  const ingredients = await listIngredientsWithNotes();

  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-ink-faint font-semibold mb-1.5">Ingredients</div>
      <h1 className="font-serif text-[30px] font-semibold mb-1">Ingredient intelligence library</h1>
      <p className="text-ink-soft mb-6">
        {ingredients.length} ingredient{ingredients.length !== 1 ? 's' : ''} discovered across field notes.
      </p>

      {ingredients.length === 0 ? (
        <div className="text-center py-16 text-ink-faint">
          <div className="text-4xl mb-3">❦</div>
          No ingredients yet — capture a field note to start the library.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {ingredients.map((ing) => (
            <Link
              key={ing.name}
              href={`/field-notes/${ing.noteIds[0]}`}
              className="block bg-paper border border-rule rounded p-4"
            >
              <div className="mb-2 text-ink-soft">
                <IngredientSketch category={ing.category} size={32} />
              </div>
              <h4 className="font-serif font-semibold">{ing.name}</h4>
              <div className="text-[11.5px] text-ink-soft mb-2.5">{ing.category}</div>
              <div className="flex flex-wrap gap-1.5">
                {ing.flavourProfile.slice(0, 4).map((t) => (
                  <span key={t} className="text-xs px-2.5 py-1 rounded-full border border-rule bg-bg">
                    {t}
                  </span>
                ))}
              </div>
              <div className="text-[11.5px] text-ink-faint mt-2.5">
                {ing.noteIds.length} field note{ing.noteIds.length !== 1 ? 's' : ''}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
