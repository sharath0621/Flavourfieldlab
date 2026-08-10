import { z } from 'zod';

// -----------------------------------------------------------------------------
// The structured-output contract every AIService provider must satisfy,
// aligned to the "Flavour Field Lab RAG Knowledge Base — Master Document
// v1.0": evidence labels (§04), source trust classes (§03), and the AI
// response format (§23). Both the OpenAI provider (validating a real model
// response) and the Mock provider (constructing output directly) are
// checked against this schema before anything is written to the database,
// so a malformed or hallucinated response can never corrupt a field note's
// derived data — and, critically, can never touch field_notes.raw_text.
// -----------------------------------------------------------------------------

// KB §04 — every retrieved/derived claim carries exactly one evidence label.
// VERIFIED is reserved for independently corroborated claims; a single field
// note analysis pass should essentially never emit it on its own (that tier
// is earned over multiple sources/experiments), but the schema allows it so
// downstream corroboration logic can promote observations later.
export const ObservationTypeSchema = z.enum(['VERIFIED', 'FIELD_OBSERVED', 'REPORTED', 'INFERRED']);
export const ConfidenceSchema = z.enum(['HIGH', 'MEDIUM', 'LOW']);

// KB §03 — source trust classification, required on every external source.
export const SourceTrustClassSchema = z.enum([
  'A_PRIMARY', 'B_SCIENTIFIC', 'C_GOVERNMENT', 'D_INSTITUTIONAL', 'E_INDUSTRY', 'F_SECONDARY', 'G_UNVERIFIED'
]);
// KB §02 — knowledge hierarchy level for a source (2-6; Level 1 is the field
// note itself, Level 7 is AI inference, already covered by INFERRED).
export const KnowledgeLevelSchema = z.number().int().min(2).max(6);

export const ObservationSchema = z.object({
  type: ObservationTypeSchema,
  content: z.string().min(3),
  confidence: ConfidenceSchema,
  source: z.string().min(1)
});

export const SourceSchema = z.object({
  title: z.string().min(3),
  publisher: z.string().min(1),
  url: z.string().optional(),
  content: z.string().min(3),
  confidence: ConfidenceSchema,
  source_trust_class: SourceTrustClassSchema,
  knowledge_level: KnowledgeLevelSchema
});

export const ResearchQuestionSchema = z.object({
  question: z.string().min(5),
  priority: z.enum(['High', 'Medium', 'Low']),
  evidence_required: z.string().min(3)
});

export const ScoreSchema = z.number().int().min(1).max(10);

export const RDOpportunitySchema = z.object({
  title: z.string().min(3),
  why: z.string().min(10),
  exploration: z.array(z.string()).min(1),
  hypothesis_status: z.string().min(3),
  scores: z.object({
    novelty: ScoreSchema,
    feasibility: ScoreSchema,
    availability: ScoreSchema,
    brand_fit: ScoreSchema,
    international: ScoreSchema,
    confidence: ScoreSchema
  }),
  why_this: z.array(z.string()).min(1),
  // KB §17 — every R&D opportunity document needs risks, unknowns, and a
  // suggested next experiment, not just a why-this justification.
  risks: z.array(z.string()).min(1),
  unknowns: z.array(z.string()).min(1),
  suggested_experiment: z.string().min(5)
});

export const FlavourTagSchema = z.object({
  tag: z.string().min(2),
  inferred: z.boolean()
});

export const AIAnalysisSchema = z.object({
  observations: z.array(ObservationSchema).min(1),
  flavour_tags: z.array(FlavourTagSchema).min(1),
  sources: z.array(SourceSchema),
  research_questions: z.array(ResearchQuestionSchema).min(3),
  rd_opportunities: z.array(RDOpportunitySchema).min(1).max(4),
  // KB §34 — "the most important RAG question": not just what we know, but
  // what's most worth asking next. A single highlighted pick from (or
  // adjacent to) research_questions, surfaced separately in the UI.
  next_question: z.string().min(5)
});

export type AIAnalysis = z.infer<typeof AIAnalysisSchema>;
