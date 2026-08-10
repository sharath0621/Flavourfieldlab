'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserOrThrow } from '@/lib/supabase/auth';
import { AIService } from '@/lib/ai/service';
import type { AIAnalysis } from '@/lib/ai/schema';
import type { BacklogStatus, FieldNote, FieldNoteDraft, QuestionStatus } from '@/lib/types';

/** Find-or-create the canonical Ingredient row for a given name/category (spec §21). */
async function resolveIngredient(
  supabase: ReturnType<typeof createClient>,
  name: string,
  category: string
): Promise<string | null> {
  const { data: existing } = await supabase.from('ingredients').select('id').eq('name', name).maybeSingle();
  if (existing) return existing.id as string;

  const { data: created, error } = await supabase
    .from('ingredients')
    .insert({ name, category })
    .select('id')
    .single();
  if (error) {
    // Non-fatal — the field note can still be created without a linked
    // canonical ingredient; the Ingredients page falls back to grouping by
    // ingredient_name in that case.
    console.error('resolveIngredient failed:', error.message);
    return null;
  }
  return created.id as string;
}

/** Persists one AIAnalysis result's rows against a field note. Does not touch raw_text. */
async function persistAnalysis(
  supabase: ReturnType<typeof createClient>,
  fieldNoteId: string,
  analysis: AIAnalysis,
  preserve?: { backlogByTitle: Map<string, BacklogStatus>; questionStatusByText: Map<string, QuestionStatus> }
) {
  const observationRows = analysis.observations.map((o, i) => ({
    field_note_id: fieldNoteId,
    type: o.type,
    content: o.content,
    confidence: o.confidence,
    source: o.source,
    sort_order: i
  }));
  if (observationRows.length) await supabase.from('field_observations').insert(observationRows);

  const sourceRows = analysis.sources.map((s) => ({
    field_note_id: fieldNoteId,
    title: s.title,
    publisher: s.publisher,
    url: s.url || null,
    content: s.content,
    confidence: s.confidence,
    source_trust_class: s.source_trust_class,
    knowledge_level: s.knowledge_level
  }));
  if (sourceRows.length) await supabase.from('sources').insert(sourceRows);

  const questionRows = analysis.research_questions.map((q) => ({
    field_note_id: fieldNoteId,
    question: q.question,
    status: preserve?.questionStatusByText.get(q.question) || 'Open',
    priority: q.priority,
    evidence_required: q.evidence_required
  }));
  if (questionRows.length) await supabase.from('research_questions').insert(questionRows);

  const opportunityRows = analysis.rd_opportunities.map((op) => ({
    field_note_id: fieldNoteId,
    title: op.title,
    why: op.why,
    exploration: op.exploration,
    hypothesis_status: op.hypothesis_status,
    why_this: op.why_this,
    risks: op.risks,
    unknowns: op.unknowns,
    suggested_experiment: op.suggested_experiment,
    novelty_score: op.scores.novelty,
    feasibility_score: op.scores.feasibility,
    availability_score: op.scores.availability,
    brand_fit_score: op.scores.brand_fit,
    international_score: op.scores.international,
    confidence_score: op.scores.confidence,
    backlog_status: preserve?.backlogByTitle.get(op.title) || null
  }));
  if (opportunityRows.length) await supabase.from('rd_opportunities').insert(opportunityRows);

  // Store this run's flavour tags directly on the note (authoritative,
  // per-note view) and also merge into the canonical ingredient row (cross-
  // note aggregate for the Ingredients index).
  await supabase
    .from('field_notes')
    .update({ flavour_tags: analysis.flavour_tags, next_question: analysis.next_question })
    .eq('id', fieldNoteId);

  const { data: note } = await supabase.from('field_notes').select('ingredient_id').eq('id', fieldNoteId).single();
  if (note?.ingredient_id) {
    const { data: ing } = await supabase
      .from('ingredients')
      .select('flavour_profile')
      .eq('id', note.ingredient_id)
      .single();
    const existingTags: string[] = ing?.flavour_profile || [];
    const newTags = analysis.flavour_tags.map((t) => t.tag);
    const merged = Array.from(new Set([...existingTags, ...newTags])).slice(0, 12);
    await supabase.from('ingredients').update({ flavour_profile: merged }).eq('id', note.ingredient_id);
  }
}

/**
 * Save & Analyse (spec §6, §7). The raw field note is written first and
 * never revisited by the AI step — if analysis fails, the note still exists
 * exactly as typed, and the detail page offers "Regenerate analysis".
 */
export async function createFieldNote(draft: FieldNoteDraft): Promise<{ id: string; analysisError: string | null }> {
  const user = await getUserOrThrow();
  const supabase = createClient();

  const ingredientId = await resolveIngredient(supabase, draft.ingredientName, draft.ingredientCategory);

  const { data: note, error: insertError } = await supabase
    .from('field_notes')
    .insert({
      title: draft.title,
      date: draft.date,
      researcher_id: user.id,
      researcher_name: draft.researcherName || user.email,
      state: draft.state,
      district: draft.district,
      gps: draft.gps || null,
      ingredient_id: ingredientId,
      ingredient_name: draft.ingredientName,
      ingredient_category: draft.ingredientCategory,
      raw_text: draft.rawText,
      visit_why: draft.visitWhy || null,
      sensory_observation: draft.sensoryObservation || {},
      process_observation: draft.processObservation || [],
      producer_name: draft.producerName || null,
      producer_org: draft.producerOrg || null,
      producer_contact: draft.producerContact || null,
      relationship_notes: draft.relationshipNotes || null,
      avail_quantity: draft.availQuantity || null,
      avail_price: draft.availPrice || null,
      avail_season: draft.availSeason || null,
      avail_harvest_period: draft.availHarvestPeriod || null,
      avail_processing_period: draft.availProcessingPeriod || null,
      avail_current: draft.availCurrent || null
    })
    .select('id')
    .single();

  if (insertError || !note) {
    throw new Error(`Could not save field note: ${insertError?.message || 'unknown error'}`);
  }

  if (draft.photos?.length) {
    await supabase
      .from('media')
      .insert(draft.photos.map((p) => ({ field_note_id: note.id, type: 'photo', url: p.url, caption: p.caption || null })));
  }

  if (draft.voiceNotes?.length) {
    await supabase.from('media').insert(
      draft.voiceNotes.map((v) => ({
        field_note_id: note.id,
        type: 'voice',
        url: v.url,
        transcript: v.transcript || null
      }))
    );
  }

  let analysisError: string | null = null;
  try {
    const analysis = await AIService.analyzeFieldNote(draft);
    await persistAnalysis(supabase, note.id, analysis);
    await supabase.from('field_notes').update({ analyzed_at: new Date().toISOString() }).eq('id', note.id);
  } catch (err) {
    analysisError = err instanceof Error ? err.message : 'AI analysis failed.';
  }

  revalidatePath('/dashboard');
  revalidatePath('/field-notes');
  revalidatePath('/ingredients');
  revalidatePath('/map');

  return { id: note.id, analysisError };
}

function noteToDraft(note: FieldNote): FieldNoteDraft {
  return {
    title: note.title,
    date: note.date,
    researcherName: note.researcher_name || '',
    state: note.state,
    district: note.district,
    gps: note.gps || undefined,
    ingredientName: note.ingredient_name,
    ingredientCategory: note.ingredient_category,
    rawText: note.raw_text,
    visitWhy: note.visit_why || undefined,
    sensoryObservation: note.sensory_observation,
    processObservation: note.process_observation,
    producerName: note.producer_name || undefined,
    producerOrg: note.producer_org || undefined,
    producerContact: note.producer_contact || undefined,
    relationshipNotes: note.relationship_notes || undefined,
    availQuantity: note.avail_quantity || undefined,
    availPrice: note.avail_price || undefined,
    availSeason: note.avail_season || undefined,
    availHarvestPeriod: note.avail_harvest_period || undefined,
    availProcessingPeriod: note.avail_processing_period || undefined,
    availCurrent: note.avail_current || undefined
  };
}

/**
 * Regenerate analysis (spec §36 "Regenerate analysis option"). Re-runs the
 * AI pipeline over the SAME raw_text and replaces only the derived rows.
 * Backlog status and research-question status are preserved by matching on
 * title/question text, so regenerating never silently drops something the
 * researcher already acted on (a real bug caught while testing the
 * interactive prototype this app is based on).
 */
export async function regenerateAnalysis(fieldNoteId: string): Promise<{ analysisError: string | null }> {
  await getUserOrThrow();
  const supabase = createClient();

  const { data: note, error } = await supabase.from('field_notes').select('*').eq('id', fieldNoteId).single();
  if (error || !note) throw new Error('Field note not found.');

  const [{ data: oldOps }, { data: oldQuestions }] = await Promise.all([
    supabase.from('rd_opportunities').select('title, backlog_status').eq('field_note_id', fieldNoteId),
    supabase.from('research_questions').select('question, status').eq('field_note_id', fieldNoteId)
  ]);

  const backlogByTitle = new Map<string, BacklogStatus>();
  (oldOps || []).forEach((o) => {
    if (o.backlog_status) backlogByTitle.set(o.title, o.backlog_status as BacklogStatus);
  });
  const questionStatusByText = new Map<string, QuestionStatus>();
  (oldQuestions || []).forEach((q) => {
    if (q.status && q.status !== 'Open') questionStatusByText.set(q.question, q.status as QuestionStatus);
  });

  await Promise.all([
    supabase.from('field_observations').delete().eq('field_note_id', fieldNoteId),
    supabase.from('sources').delete().eq('field_note_id', fieldNoteId),
    supabase.from('research_questions').delete().eq('field_note_id', fieldNoteId),
    supabase.from('rd_opportunities').delete().eq('field_note_id', fieldNoteId)
  ]);

  const draft = noteToDraft(note as FieldNote);
  let analysisError: string | null = null;
  try {
    const analysis = await AIService.analyzeFieldNote(draft, { regenSalt: (note.regen_count || 0) + 1 });
    await persistAnalysis(supabase, fieldNoteId, analysis, { backlogByTitle, questionStatusByText });
    await supabase
      .from('field_notes')
      .update({ analyzed_at: new Date().toISOString(), regen_count: (note.regen_count || 0) + 1 })
      .eq('id', fieldNoteId);
  } catch (err) {
    analysisError = err instanceof Error ? err.message : 'AI analysis failed.';
  }

  revalidatePath(`/field-notes/${fieldNoteId}`);
  return { analysisError };
}

export async function updateResearchQuestionStatus(questionId: string, status: QuestionStatus, fieldNoteId: string) {
  await getUserOrThrow();
  const supabase = createClient();
  await supabase.from('research_questions').update({ status }).eq('id', questionId);
  revalidatePath(`/field-notes/${fieldNoteId}`);
  revalidatePath('/research');
}

export async function saveOpportunityToBacklog(opportunityId: string, fieldNoteId: string) {
  await getUserOrThrow();
  const supabase = createClient();
  await supabase.from('rd_opportunities').update({ backlog_status: 'Captured' }).eq('id', opportunityId);
  revalidatePath(`/field-notes/${fieldNoteId}`);
  revalidatePath('/rd');
}

export async function saveAllOpportunitiesToBacklog(fieldNoteId: string) {
  await getUserOrThrow();
  const supabase = createClient();
  await supabase
    .from('rd_opportunities')
    .update({ backlog_status: 'Captured' })
    .eq('field_note_id', fieldNoteId)
    .is('backlog_status', null);
  revalidatePath(`/field-notes/${fieldNoteId}`);
  revalidatePath('/rd');
}

export async function updateBacklogStatus(opportunityId: string, status: BacklogStatus, fieldNoteId: string) {
  await getUserOrThrow();
  const supabase = createClient();
  await supabase.from('rd_opportunities').update({ backlog_status: status }).eq('id', opportunityId);
  revalidatePath('/rd');
  revalidatePath(`/field-notes/${fieldNoteId}`);
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
