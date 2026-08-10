import type { FieldNoteDraft, IngredientCategory } from '@/lib/types';
import type { AIAnalysis } from '@/lib/ai/schema';
import { runMockAnalysis } from '@/lib/ai/providers/mock-provider';
import { runOpenAIAnalysis } from '@/lib/ai/providers/openai-provider';

/**
 * AIService — the single seam between the app and whatever is doing the
 * "thinking" (spec §22). Every call site in the app (server actions, seed
 * script) goes through this object, never through a provider directly, so
 * the provider can be swapped — or a second provider (Anthropic, a local
 * model, etc.) added — without touching UI or database code.
 */
export interface AIServiceInterface {
  analyzeFieldNote(draft: FieldNoteDraft, opts?: { regenSalt?: number }): Promise<AIAnalysis>;
  extractIngredients(draft: FieldNoteDraft): { name: string; category: IngredientCategory }[];
  classifyEvidence(analysis: AIAnalysis): AIAnalysis['observations'];
  generateResearchQuestions(analysis: AIAnalysis): string[];
  generateResearchBrief(analysis: AIAnalysis): { whatWeKnow: string[]; whatWeDontKnow: string[] };
  generateRDOpportunities(analysis: AIAnalysis): AIAnalysis['rd_opportunities'];
  summarizeSources(analysis: AIAnalysis): AIAnalysis['sources'];
}

function currentProvider(): 'mock' | 'openai' {
  const configured = (process.env.AI_PROVIDER || 'mock').toLowerCase();
  return configured === 'openai' ? 'openai' : 'mock';
}

export const AIService: AIServiceInterface = {
  async analyzeFieldNote(draft, opts) {
    const provider = currentProvider();
    if (provider === 'openai') {
      try {
        return await runOpenAIAnalysis(draft);
      } catch (err) {
        // Never let an AI failure destroy the field note or leave the UI
        // hanging — surface a clear error to the caller, which already has
        // the raw_text safely persisted before analysis was ever attempted.
        throw err;
      }
    }
    return runMockAnalysis(draft, opts?.regenSalt ?? 0);
  },

  extractIngredients(draft) {
    return [{ name: draft.ingredientName, category: draft.ingredientCategory }];
  },

  classifyEvidence(analysis) {
    return analysis.observations;
  },

  generateResearchQuestions(analysis) {
    return analysis.research_questions.map((q) => q.question);
  },

  generateResearchBrief(analysis) {
    const whatWeKnow = analysis.observations
      .filter((o) => o.type === 'VERIFIED' || o.type === 'FIELD_OBSERVED' || o.type === 'REPORTED')
      .map((o) => o.content);
    const whatWeDontKnow = analysis.research_questions.map((q) => q.question);
    return { whatWeKnow, whatWeDontKnow };
  },

  generateRDOpportunities(analysis) {
    return analysis.rd_opportunities;
  },

  summarizeSources(analysis) {
    return analysis.sources;
  }
};

export function getAIProviderName(): 'mock' | 'openai' {
  return currentProvider();
}
