// Shared domain types — mirror supabase/schema.sql. Kept hand-written rather
// than codegen'd so the AI pipeline and UI can share a single source of
// truth without requiring a live Supabase project to generate types.
//
// Evidence taxonomy, source trust model, and document shapes below follow
// the "Flavour Field Lab RAG Knowledge Base — Master Document v1.0" (the
// product's knowledge-governance spec). Section references (§NN) point to
// that document.

// §04 Evidence labels — every retrieved/derived claim carries exactly one.
// VERIFIED is the top tier (independently corroborated); everything else is
// a single-source claim of a specific kind. HYPOTHESIS is never a fact.
export type ObservationType = 'VERIFIED' | 'FIELD_OBSERVED' | 'REPORTED' | 'RESEARCHED' | 'INFERRED' | 'HYPOTHESIS';
export const OBSERVATION_TYPES: ObservationType[] = [
  'VERIFIED', 'FIELD_OBSERVED', 'REPORTED', 'RESEARCHED', 'INFERRED', 'HYPOTHESIS'
];

// §03 Source trust model — every external source/citation must classify
// where it came from, independent of how confident the AI is in the claim.
export type SourceTrustClass =
  | 'A_PRIMARY' | 'B_SCIENTIFIC' | 'C_GOVERNMENT' | 'D_INSTITUTIONAL' | 'E_INDUSTRY' | 'F_SECONDARY' | 'G_UNVERIFIED';
export const SOURCE_TRUST_LABELS: Record<SourceTrustClass, string> = {
  A_PRIMARY: 'A · Primary (field/experiment)',
  B_SCIENTIFIC: 'B · Scientific',
  C_GOVERNMENT: 'C · Government',
  D_INSTITUTIONAL: 'D · Institutional',
  E_INDUSTRY: 'E · Industry',
  F_SECONDARY: 'F · Secondary (news/blog)',
  G_UNVERIFIED: 'G · Unverified'
};

// §02 Knowledge hierarchy — the layer a piece of retrieved knowledge belongs
// to. Field notes are always Level 1; this is mainly used to tag `sources`
// (Level 2-6) since Level 7 (AI inference) is already covered by the
// INFERRED evidence label.
export type KnowledgeLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const KNOWLEDGE_LEVEL_LABELS: Record<KnowledgeLevel, string> = {
  1: 'Field knowledge',
  2: 'Experimental knowledge',
  3: 'Scientific knowledge',
  4: 'Agricultural knowledge',
  5: 'Cultural / historical knowledge',
  6: 'Market knowledge',
  7: 'AI inference'
};

// §32 Knowledge governance — visibility level of a knowledge record.
export type KnowledgeVisibility = 'PRIVATE' | 'TEAM' | 'PUBLIC';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type ResearchConfidence = 'High' | 'Medium' | 'Low';
export type QuestionStatus = 'Open' | 'Investigating' | 'Answered' | 'Not relevant';
export type QuestionPriority = 'High' | 'Medium' | 'Low';
export type BacklogStatus =
  | 'Captured' | 'Researching' | 'Interesting' | 'Prototype'
  | 'Tested' | 'Promising' | 'Rejected' | 'Archived';

// §38 Decision memory — what happened when the researcher looked at
// something and made a call. Never silently turned into an inferred
// "preference" — that requires explicit confirmation (§38).
export type ResearcherDecision = 'Rejected' | 'Interesting but unsourceable' | 'Saved to backlog' | 'Deferred';

export const INGREDIENT_CATEGORIES = [
  'Fruit', 'Grain', 'Millet', 'Sugar / Sweetener', 'Spice', 'Herb',
  'Flower', 'Root', 'Botanical', 'Dairy', 'Fermentation culture', 'Other'
] as const;
export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];

export const QUESTION_STATUSES: QuestionStatus[] = ['Open', 'Investigating', 'Answered', 'Not relevant'];
export const BACKLOG_STATUSES: BacklogStatus[] = [
  'Captured', 'Researching', 'Interesting', 'Prototype', 'Tested', 'Promising', 'Rejected', 'Archived'
];

// §06 Sensory characteristics vocabulary — kept as a flexible map (rather
// than ~15 rigid columns) so partially-known profiles don't force the AI or
// the researcher to fabricate the rest. Keys are free-form but should draw
// from the controlled vocabulary in §12 (aroma, taste, mouthfeel, acidity,
// sweetness, bitterness, astringency, spice, earthiness, smokiness,
// fruitiness, floral, herbal, roasted, fermented).
export type SensoryCharacteristics = Record<string, string>;

export interface TraditionalUses {
  food?: string;
  beverage?: string;
  fermentation?: string;
  medicinal_cultural?: string;
  other?: string;
}

export interface BeverageRelevance {
  potential_applications: string[]; // beer / fermented beverage / non-alcoholic / spirit / cocktail / kombucha / soda / other
  potential_flavour_contribution?: string;
}

export interface AvailabilityProfile {
  typical_quantity?: string;
  minimum_viable_sourcing?: string;
  shelf_life?: string;
  storage?: string;
  potential_scale?: string;
}

export interface ResearchConfidenceProfile {
  agricultural?: ResearchConfidence;
  sensory?: ResearchConfidence;
  processing?: ResearchConfidence;
  beverage_application?: ResearchConfidence;
}

// §06 INGREDIENT PROFILE. Only `name`/`category` are guaranteed populated at
// find-or-create time; everything else accumulates over time from field
// notes and, eventually, direct researcher edits — the AI must never
// fabricate agricultural, sensory, or processing detail that wasn't
// actually observed or sourced (§33).
export interface Ingredient {
  id: string;
  name: string;
  common_name: string | null;
  regional_names: string[];
  scientific_name: string | null;
  category: IngredientCategory;
  sub_category: string | null;

  varieties: string[];
  regions: string[]; // known growing regions
  season: string | null;

  // Agricultural cycle
  planting: string | null;
  growing: string | null;
  harvest: string | null;
  peak_availability: string | null;
  post_harvest: string | null;
  storage: string | null;

  // Physical characteristics
  colour: string | null;
  size: string | null;
  texture: string | null;
  moisture: string | null;
  density: string | null;

  sensory_characteristics: SensoryCharacteristics;
  flavour_profile: string[];
  processing_methods: string[];
  traditional_uses: TraditionalUses;
  beverage_relevance: BeverageRelevance | null;
  availability_profile: AvailabilityProfile | null;
  research_confidence: ResearchConfidenceProfile | null;

  created_at: string;
}

// §08 PRODUCER PROFILE + relationship memory. Private by default (§32) —
// this is exactly the kind of information the KB doc says "should remain
// private" and must never be exposed without permission.
export interface RelationshipMemory {
  previous_conversations?: string;
  promises?: string;
  samples_received?: string;
  sourcing_history?: string;
  experiments?: string;
  future_availability?: string;
  quality_consistency?: string;
}

export interface Producer {
  id: string;
  researcher_id: string;
  name: string;
  region: string | null;
  village: string | null;
  ingredient_name: string | null;
  crop: string | null;
  variety: string | null;
  production_method: string | null;
  traditional_method: string | null;
  approximate_production: string | null;
  availability: string | null;
  season: string | null;
  processing: string | null;
  minimum_quantity: string | null;
  typical_price: string | null;
  contact: string | null;
  relationship_status: string | null;
  last_visited: string | null;
  notes: string | null;
  relationship_memory: RelationshipMemory;
  visibility: KnowledgeVisibility;
  created_at: string;
}

export interface SensoryObservation {
  seen?: string;
  smelt?: string;
  tasted?: string;
  heard?: string;
  touched?: string;
}

export interface FieldNote {
  id: string;
  title: string;
  date: string;
  researcher_id: string;
  researcher_name: string | null;

  country: string;
  state: string;
  district: string;
  gps: string | null;

  ingredient_id: string | null;
  ingredient_name: string;
  ingredient_category: IngredientCategory;

  raw_text: string;

  // §09 CONTEXT — why the visit happened, beyond just who/where/when
  // (who/where/when are covered by researcher_name/district+state/date).
  visit_why: string | null;
  // §09 SENSORY OBSERVATION and PROCESS OBSERVATION — kept distinct from
  // the AI-derived `field_observations` ledger; this is the researcher's
  // own structured capture, editable independent of any AI run.
  sensory_observation: SensoryObservation;
  process_observation: string[];

  producer_id: string | null;
  producer_name: string | null;
  producer_org: string | null;
  producer_contact: string | null;
  relationship_notes: string | null;

  avail_quantity: string | null;
  avail_price: string | null;
  avail_season: string | null;
  avail_harvest_period: string | null;
  avail_processing_period: string | null;
  avail_current: string | null;

  analyzed_at: string | null;
  regen_count: number;
  is_demo: boolean;
  flavour_tags: { tag: string; inferred: boolean }[];
  // KB §34 — the single most useful next question to pursue, highlighted
  // separately from the full research_questions list.
  next_question: string | null;
  created_at: string;
}

export interface FieldObservation {
  id: string;
  field_note_id: string;
  type: ObservationType;
  content: string;
  confidence: ConfidenceLevel;
  source: string | null;
  sort_order: number;
  created_at: string;
}

export interface Media {
  id: string;
  field_note_id: string;
  type: 'photo' | 'voice';
  url: string;
  storage_path: string | null;
  caption: string | null;
  transcript: string | null;
  created_at: string;
}

// §26 SOURCE CITATION + §03 source trust class + §02 knowledge level.
export interface Source {
  id: string;
  field_note_id: string;
  title: string;
  url: string | null;
  publisher: string | null;
  content: string | null;
  confidence: ConfidenceLevel;
  source_trust_class: SourceTrustClass;
  knowledge_level: KnowledgeLevel;
  accessed_at: string;
  created_at: string;
}

// §18 RESEARCH QUESTIONS — stored independently, with enough metadata to be
// prioritised and answered later.
export interface ResearchQuestion {
  id: string;
  field_note_id: string;
  question: string;
  status: QuestionStatus;
  priority: QuestionPriority | null;
  evidence_required: string | null;
  answer: string | null;
  created_at: string;
}

// §17 R&D OPPORTUNITY DOCUMENT.
export interface RDOpportunity {
  id: string;
  field_note_id: string;
  title: string;
  why: string;
  exploration: string[];
  novelty_score: number;
  feasibility_score: number;
  availability_score: number;
  brand_fit_score: number;
  international_score: number;
  confidence_score: number;
  hypothesis_status: string;
  why_this: string[];
  risks: string[];
  unknowns: string[];
  suggested_experiment: string | null;
  backlog_status: BacklogStatus | null;
  created_at: string;
}

// §38 Decision memory — one row per researcher call on an ingredient/note.
export interface DecisionLogEntry {
  id: string;
  researcher_id: string;
  ingredient_name: string;
  field_note_id: string | null;
  decision: ResearcherDecision;
  reason: string | null;
  potential: ResearchConfidence | null;
  availability: ResearchConfidence | null;
  created_at: string;
}

/** Full detail bundle for a single field note, as read by the detail page. */
export interface FieldNoteDetail {
  note: FieldNote;
  observations: FieldObservation[];
  media: Media[];
  sources: Source[];
  researchQuestions: ResearchQuestion[];
  rdOpportunities: RDOpportunity[];
  producer: Producer | null;
}

/** Shape of the raw capture form before a field note row exists. */
export interface FieldNoteDraft {
  title: string;
  date: string;
  researcherName: string;
  state: string;
  district: string;
  gps?: string;
  ingredientName: string;
  ingredientCategory: IngredientCategory;
  rawText: string;
  visitWhy?: string;
  sensoryObservation?: SensoryObservation;
  processObservation?: string[];
  producerName?: string;
  producerOrg?: string;
  producerContact?: string;
  relationshipNotes?: string;
  availQuantity?: string;
  availPrice?: string;
  availSeason?: string;
  availHarvestPeriod?: string;
  availProcessingPeriod?: string;
  availCurrent?: string;
  photos?: { url: string; caption?: string }[];
  voiceNotes?: { url: string; transcript?: string }[];
}
