import { createAdminClient } from '@/lib/supabase/admin';
import type {
  FieldNote,
  FieldNoteDetail,
  FieldObservation,
  Media,
  Producer,
  RDOpportunity,
  ResearchQuestion,
  Source
} from '@/lib/types';

/** All read queries used by the app's Server Components, in one place so
 *  pages stay thin.
 *
 *  These run through the service-role client because the app is in public
 *  access mode (see lib/supabase/auth.ts): there's no session for RLS to key
 *  off, and the workspace is deliberately shared by everyone with the link.
 *  Every query below is read-only. */

export async function getDashboardData() {
  const supabase = createAdminClient();
  const [{ data: notes }, { count: noteCount }] = await Promise.all([
    supabase.from('field_notes').select('*').order('date', { ascending: false }).limit(4),
    supabase.from('field_notes').select('*', { count: 'exact', head: true })
  ]);

  const { data: allNotes } = await supabase.from('field_notes').select('ingredient_name, state');
  const ingredientCount = new Set((allNotes || []).map((n) => n.ingredient_name)).size;
  const regionCount = new Set((allNotes || []).map((n) => n.state)).size;

  const { count: rdCount } = await supabase.from('rd_opportunities').select('*', { count: 'exact', head: true });

  const { data: openQuestions } = await supabase
    .from('research_questions')
    .select('id, question, field_note_id, field_notes(ingredient_name)')
    .eq('status', 'Open')
    .limit(4);

  return {
    recentNotes: (notes || []) as FieldNote[],
    stats: {
      fieldNotes: noteCount || 0,
      ingredients: ingredientCount,
      regions: regionCount,
      researchBriefs: noteCount || 0,
      rdOpportunities: rdCount || 0
    },
    openQuestions: openQuestions || []
  };
}

export async function listFieldNotes(opts: { q?: string; category?: string } = {}): Promise<FieldNote[]> {
  const supabase = createAdminClient();
  let query = supabase.from('field_notes').select('*').order('date', { ascending: false });

  if (opts.q && opts.q.trim()) {
    // Postgres full-text search over the generated search_vector column
    // (spec §19/§20 — start simple, no external search infra).
    query = query.textSearch('search_vector', opts.q.trim().split(/\s+/).join(' & '), {
      type: 'plain',
      config: 'english'
    });
  }
  if (opts.category && opts.category !== 'all') {
    query = query.eq('ingredient_category', opts.category);
  }

  const { data, error } = await query;
  if (error) {
    // Fall back to a simple ilike scan if the tsquery syntax fails on
    // unusual input (e.g. special characters) rather than showing an error.
    const fallback = await supabase
      .from('field_notes')
      .select('*')
      .ilike('raw_text', `%${opts.q || ''}%`)
      .order('date', { ascending: false });
    return (fallback.data || []) as FieldNote[];
  }
  return (data || []) as FieldNote[];
}

export async function getFieldNoteDetail(id: string): Promise<FieldNoteDetail | null> {
  const supabase = createAdminClient();
  const [{ data: note }, { data: observations }, { data: media }, { data: sources }, { data: questions }, { data: opportunities }] =
    await Promise.all([
      supabase.from('field_notes').select('*').eq('id', id).maybeSingle(),
      supabase.from('field_observations').select('*').eq('field_note_id', id).order('sort_order'),
      supabase.from('media').select('*').eq('field_note_id', id).order('created_at'),
      supabase.from('sources').select('*').eq('field_note_id', id).order('created_at'),
      supabase.from('research_questions').select('*').eq('field_note_id', id).order('created_at'),
      supabase.from('rd_opportunities').select('*').eq('field_note_id', id).order('created_at')
    ]);

  if (!note) return null;

  const typedNote = note as FieldNote;
  let producer: Producer | null = null;
  if (typedNote.producer_id) {
    const { data } = await supabase.from('producers').select('*').eq('id', typedNote.producer_id).maybeSingle();
    producer = (data as Producer) || null;
  }

  return {
    note: typedNote,
    observations: (observations || []) as FieldObservation[],
    media: (media || []) as Media[],
    sources: (sources || []) as Source[],
    researchQuestions: (questions || []) as ResearchQuestion[],
    rdOpportunities: (opportunities || []) as RDOpportunity[],
    producer
  };
}

/** Read-only producer library for this researcher (KB §08) — private,
 *  owner-scoped by RLS. Not linked from the main nav yet in this pass;
 *  used by the field note detail page and available for a future
 *  dedicated "Farmer Network" view (KB §41). */
export async function listProducers() {
  const supabase = createAdminClient();
  const { data } = await supabase.from('producers').select('*').order('name');
  return (data || []) as Producer[];
}

export async function listIngredientsWithNotes() {
  const supabase = createAdminClient();
  const { data: notes } = await supabase
    .from('field_notes')
    .select('id, ingredient_name, ingredient_category')
    .order('ingredient_name');
  const { data: ingredients } = await supabase.from('ingredients').select('*');

  const byName = new Map<string, { name: string; category: string; noteIds: string[]; flavourProfile: string[] }>();
  (notes || []).forEach((n) => {
    const key = n.ingredient_name;
    if (!byName.has(key)) {
      const canonical = (ingredients || []).find((i) => i.name === key);
      byName.set(key, {
        name: key,
        category: n.ingredient_category,
        noteIds: [],
        flavourProfile: canonical?.flavour_profile || []
      });
    }
    byName.get(key)!.noteIds.push(n.id);
  });

  return Array.from(byName.values());
}

/** One row per field note — the "Research Briefs" collection (spec: every
 *  field note produces exactly one research brief). Mirrors the dashboard's
 *  Research Briefs stat count. */
export async function listResearchBriefs() {
  const supabase = createAdminClient();
  const [{ data: notes }, { data: observations }, { data: questions }] = await Promise.all([
    supabase.from('field_notes').select('id, ingredient_name, ingredient_category, state, date').order('date', { ascending: false }),
    supabase.from('field_observations').select('field_note_id, type'),
    supabase.from('research_questions').select('field_note_id, status')
  ]);

  return (notes || []).map((note) => {
    const noteObs = (observations || []).filter((o) => o.field_note_id === note.id);
    const noteQuestions = (questions || []).filter((q) => q.field_note_id === note.id);
    return {
      note,
      knownCount: noteObs.filter((o) => o.type === 'VERIFIED' || o.type === 'FIELD_OBSERVED' || o.type === 'REPORTED').length,
      questionCount: noteQuestions.length,
      openCount: noteQuestions.filter((q) => q.status === 'Open').length
    };
  });
}

export async function listAllResearchQuestions() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('research_questions')
    .select('*, field_notes(id, ingredient_name, state)')
    .order('created_at', { ascending: false });
  return data || [];
}

export async function listBacklogItems() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('rd_opportunities')
    .select('*, field_notes(id, ingredient_name, state, district)')
    .not('backlog_status', 'is', null)
    .order('created_at', { ascending: false });
  return data || [];
}

/** Every generated R&D opportunity, saved to backlog or not — matches the
 *  dashboard's "R&D Opportunities" count so clicking through never shows a
 *  smaller number than what was promised. */
export async function listAllOpportunities(category?: string) {
  const supabase = createAdminClient();
  let query = supabase
    .from('rd_opportunities')
    .select('*, field_notes!inner(id, ingredient_name, ingredient_category, state, district)')
    .order('created_at', { ascending: false });
  if (category && category !== 'all') {
    query = query.eq('field_notes.ingredient_category', category);
  }
  const { data } = await query;
  return data || [];
}

export async function listNotesForMap() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('field_notes')
    .select('id, ingredient_name, ingredient_category, state, district, date')
    .order('state');
  return (data || []) as Pick<FieldNote, 'id' | 'ingredient_name' | 'ingredient_category' | 'state' | 'district' | 'date'>[];
}
