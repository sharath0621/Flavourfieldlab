import OpenAI from 'openai';
import type { FieldNoteDraft } from '@/lib/types';
import { AIAnalysisSchema, type AIAnalysis } from '@/lib/ai/schema';
import { SYSTEM_PROMPT, buildUserPrompt } from '@/lib/ai/prompts';

// JSON Schema mirror of AIAnalysisSchema for OpenAI's structured-output mode.
// Keep this in sync with lib/ai/schema.ts by hand — duplicated rather than
// derived so the wire contract sent to OpenAI is explicit and auditable.
const RESPONSE_JSON_SCHEMA = {
  name: 'field_note_analysis',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      observations: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            type: { type: 'string', enum: ['VERIFIED', 'FIELD_OBSERVED', 'REPORTED', 'INFERRED'] },
            content: { type: 'string' },
            confidence: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
            source: { type: 'string' }
          },
          required: ['type', 'content', 'confidence', 'source']
        }
      },
      flavour_tags: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: { tag: { type: 'string' }, inferred: { type: 'boolean' } },
          required: ['tag', 'inferred']
        }
      },
      sources: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            title: { type: 'string' },
            publisher: { type: 'string' },
            url: { type: 'string' },
            content: { type: 'string' },
            confidence: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
            source_trust_class: {
              type: 'string',
              enum: ['A_PRIMARY', 'B_SCIENTIFIC', 'C_GOVERNMENT', 'D_INSTITUTIONAL', 'E_INDUSTRY', 'F_SECONDARY', 'G_UNVERIFIED']
            },
            knowledge_level: { type: 'integer' }
          },
          required: ['title', 'publisher', 'content', 'confidence', 'source_trust_class', 'knowledge_level']
        }
      },
      research_questions: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            question: { type: 'string' },
            priority: { type: 'string', enum: ['High', 'Medium', 'Low'] },
            evidence_required: { type: 'string' }
          },
          required: ['question', 'priority', 'evidence_required']
        }
      },
      rd_opportunities: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            title: { type: 'string' },
            why: { type: 'string' },
            exploration: { type: 'array', items: { type: 'string' } },
            hypothesis_status: { type: 'string' },
            scores: {
              type: 'object',
              additionalProperties: false,
              properties: {
                novelty: { type: 'integer' },
                feasibility: { type: 'integer' },
                availability: { type: 'integer' },
                brand_fit: { type: 'integer' },
                international: { type: 'integer' },
                confidence: { type: 'integer' }
              },
              required: ['novelty', 'feasibility', 'availability', 'brand_fit', 'international', 'confidence']
            },
            why_this: { type: 'array', items: { type: 'string' } },
            risks: { type: 'array', items: { type: 'string' } },
            unknowns: { type: 'array', items: { type: 'string' } },
            suggested_experiment: { type: 'string' }
          },
          required: ['title', 'why', 'exploration', 'hypothesis_status', 'scores', 'why_this', 'risks', 'unknowns', 'suggested_experiment']
        }
      },
      next_question: { type: 'string' }
    },
    required: ['observations', 'flavour_tags', 'sources', 'research_questions', 'rd_opportunities', 'next_question']
  }
} as const;

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is not set. Add it to .env.local, or set AI_PROVIDER=mock.');
    client = new OpenAI({ apiKey });
  }
  return client;
}

/**
 * Calls OpenAI with structured JSON output, validates against AIAnalysisSchema,
 * and retries once on a parse/validation failure (spec §23: "If parsing
 * fails: retry; gracefully handle errors; never destroy the original field
 * note"). The original field note row is never touched by this function —
 * callers are responsible for only writing the returned analysis to the
 * derived tables (observations/sources/questions/opportunities).
 */
export async function runOpenAIAnalysis(draft: FieldNoteDraft): Promise<AIAnalysis> {
  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  const openai = getClient();

  async function attempt(): Promise<AIAnalysis> {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(draft) }
      ],
      response_format: { type: 'json_schema', json_schema: RESPONSE_JSON_SCHEMA },
      temperature: 0.4
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error('OpenAI returned an empty response.');

    const parsed = JSON.parse(raw);
    return AIAnalysisSchema.parse(parsed);
  }

  try {
    return await attempt();
  } catch (firstError) {
    // Single retry, per spec §23. If this also fails, the caller (server
    // action) catches the error, leaves the field note's raw_text and any
    // prior analysis completely untouched, and surfaces a toast to the user.
    try {
      return await attempt();
    } catch (secondError) {
      throw new Error(
        `AI analysis failed after retry: ${secondError instanceof Error ? secondError.message : String(secondError)}`
      );
    }
  }
}
