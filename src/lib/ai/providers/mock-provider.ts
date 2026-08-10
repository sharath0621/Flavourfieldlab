import type { FieldNoteDraft, IngredientCategory } from '@/lib/types';
import type { AIAnalysis } from '@/lib/ai/schema';
import { AIAnalysisSchema } from '@/lib/ai/schema';

/**
 * Deterministic, rule-based provider — the same heuristics validated in the
 * interactive prototype, ported as-is. Zero cost, no API key, fully
 * offline. This is the default provider so the app is usable immediately;
 * swap AI_PROVIDER=openai once a key is available. Because both providers
 * return the same AIAnalysis shape, nothing else in the app needs to know
 * which one produced a given note's analysis.
 */

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function seededScore(seed: string, base: number, spread: number): number {
  return Math.min(10, Math.max(1, base + (hashStr(seed) % spread)));
}

const FLAVOUR_DICTIONARY: Record<string, string> = {
  caramel: 'Caramel', smoky: 'Smoky', smoke: 'Smoky', molasses: 'Molasses', earthy: 'Earthy', earth: 'Earthy',
  mineral: 'Mineral', sweet: 'Sweet', sour: 'Sour', tangy: 'Tangy', tart: 'Tart', floral: 'Floral', flower: 'Floral',
  citrus: 'Citrus', nutty: 'Nutty', fermented: 'Fermented', funky: 'Funky', spicy: 'Spicy', spice: 'Spicy',
  grassy: 'Grassy', herbaceous: 'Herbaceous', buttery: 'Buttery', roasted: 'Roasted', roast: 'Roasted',
  fruity: 'Fruity', musky: 'Musky', woody: 'Woody', honey: 'Honeyed', jaggery: 'Molasses', astringent: 'Astringent',
  bitter: 'Bitter', creamy: 'Creamy', pungent: 'Pungent'
};

const CATEGORY_DEFAULT_TAGS: Record<string, string[]> = {
  'Sugar / Sweetener': ['Molasses', 'Caramel'], Millet: ['Nutty', 'Earthy'], Fruit: ['Fruity', 'Tangy'],
  Dairy: ['Roasted', 'Creamy'], 'Fermentation culture': ['Funky', 'Tart'], Root: ['Earthy'],
  Botanical: ['Herbaceous'], Spice: ['Pungent'], Herb: ['Herbaceous'], Flower: ['Floral'],
  Grain: ['Nutty'], Other: ['Undetermined']
};

const CATEGORY_EXTERNAL_RESEARCH: Record<string, { title: string; publisher: string; note: string }[]> = {
  'Sugar / Sweetener': [
    { title: 'Regional sugarcane jaggery production patterns', publisher: 'Agricultural bulletin (demo)', note: 'Open-pan jaggery production in this belt is typically seasonal, following the cane harvest, with output and colour varying by cultivar and boiling technique.' },
    { title: 'Traditional non-centrifugal sugar and flavour chemistry', publisher: 'Food science literature (demo)', note: 'Darker, non-centrifugal sugars generally retain more molasses compounds, which correlates with caramel and smoky notes versus refined sugar.' }
  ],
  Millet: [
    { title: 'Minor millets of the Deccan — agronomy overview', publisher: 'State agriculture dept. archive (demo)', note: 'Minor millets are typically rainfed, drought-tolerant crops grown by smallholders, often intercropped with pulses.' }
  ],
  Fruit: [
    { title: 'Regional fruit varieties and ripening windows', publisher: 'Horticulture board notes (demo)', note: 'Indigenous and grafted fruit varieties in this region typically have distinct, shorter ripening windows than commercial hybrids.' }
  ],
  Dairy: [
    { title: 'Traditional khoa / mawa production methods', publisher: 'Dairy science archive (demo)', note: 'Slow reduction of milk over open flame is associated with pronounced Maillard (caramelised, roasted) character versus mechanised reduction.' }
  ],
  'Fermentation culture': [
    { title: 'Indigenous fermentation starters of India', publisher: 'Ethnobotanical survey (demo)', note: 'Community-held fermentation starters vary household to household and are rarely standardised or commercially documented.' }
  ],
  Root: [{ title: 'Root crop cultivation and post-harvest handling', publisher: 'Horticulture notes (demo)', note: 'Root ingredients of this type are typically harvested once per season with moderate storage life if kept cool and dry.' }],
  Botanical: [{ title: 'Regional botanicals in traditional beverages', publisher: 'Ethnobotanical survey (demo)', note: 'Botanicals of this kind have documented traditional use in fermented or infused regional drinks, though rarely at commercial scale.' }],
  Spice: [{ title: 'Spice volatile compounds and processing', publisher: 'Food science literature (demo)', note: 'Sun-drying versus mechanical drying is known to change the volatile aromatic profile of spices meaningfully.' }],
  Herb: [{ title: 'Wild and cultivated herb use in regional cuisine', publisher: 'Ethnobotanical survey (demo)', note: 'This herb family is documented in regional culinary and medicinal use, though rarely studied for fermentation applications.' }],
  Flower: [{ title: 'Edible flowers in regional beverages', publisher: 'Ethnobotanical survey (demo)', note: 'Floral ingredients of this kind are occasionally used in infusions and traditional beverages at small scale.' }],
  Grain: [{ title: 'Indigenous grain varieties and cultivation', publisher: 'State agriculture dept. archive (demo)', note: 'Heirloom grain varieties in this region are typically grown at small scale with variable year-to-year yield.' }],
  Other: [{ title: 'General regional ingredient survey', publisher: 'Field research archive (demo)', note: 'Limited published research exists; direct field verification is the primary evidence source at this stage.' }]
};

const CATEGORY_STYLE_MAP: Record<string, string[]> = {
  'Sugar / Sweetener': ['dark beer', 'porter', 'stout', 'malt-forward styles'],
  Millet: ['saison', 'farmhouse ale', 'grain-forward pale styles'],
  Fruit: ['fruited sour', 'wild ale', 'session ale with fruit adjunct'],
  Dairy: ['pastry stout', 'milk-adjunct dessert styles'],
  'Fermentation culture': ['wild/mixed fermentation project', 'farmhouse ale', 'bottle-conditioned funky ale'],
  Root: ['spiced ale', 'winter warmer'],
  Botanical: ['botanical-infused ale', 'gruit-style beer'],
  Spice: ['spiced ale', 'saison'],
  Herb: ['gruit-style beer', 'herbal infusion beer'],
  Flower: ['floral saison', 'delicate pale ale'],
  Grain: ['grain-forward ale', 'farmhouse style'],
  Other: ['experimental small-batch ale']
};

function classifyEvidence(rawText: string, producerName?: string) {
  // KB §04 evidence labels: FIELD_OBSERVED (direct), REPORTED (attributed to
  // a source), INFERRED (AI interpretation, never HIGH confidence). VERIFIED
  // is deliberately never assigned here — it requires independent
  // corroboration across multiple sources, not a single field note pass.
  const sentences = rawText.replace(/\n+/g, ' ').split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 4);
  return sentences.map((s) => {
    const lower = s.toLowerCase();
    let type: 'FIELD_OBSERVED' | 'REPORTED' | 'INFERRED' = 'FIELD_OBSERVED';
    let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';
    let source = 'Field observation';
    if (/\b(said|told|says|according to|claims?|mentioned|informed)\b/.test(lower)) {
      type = 'REPORTED'; confidence = 'MEDIUM'; source = producerName || 'Field source (unnamed)';
    } else if (/\b(might|may|could|perhaps|possibly|likely|seems to|appears to)\b/.test(lower)) {
      type = 'INFERRED'; confidence = 'LOW'; source = 'AI interpretation';
    }
    return { type, content: s, confidence, source };
  });
}

function extractFlavourTags(rawText: string, category: IngredientCategory) {
  const lower = rawText.toLowerCase();
  const found: { tag: string; inferred: boolean }[] = [];
  for (const key of Object.keys(FLAVOUR_DICTIONARY)) {
    const tag = FLAVOUR_DICTIONARY[key];
    if (lower.includes(key) && tag && !found.some((f) => f.tag === tag)) found.push({ tag, inferred: false });
  }
  if (found.length === 0) {
    (CATEGORY_DEFAULT_TAGS[category] || ['Undetermined']).forEach((t) => found.push({ tag: t, inferred: true }));
  }
  return found.slice(0, 6);
}

// KB §03/§02 — every simulated external-research entry gets a source trust
// class and knowledge-hierarchy level, inferred from its (demo) publisher
// type. These are illustrative placeholders (this provider makes no live
// web calls), which is exactly why none rises above F_SECONDARY — a
// genuinely verified B/C/D source requires a real citation to point to.
function trustFor(publisher: string): { source_trust_class: 'B_SCIENTIFIC' | 'C_GOVERNMENT' | 'D_INSTITUTIONAL' | 'F_SECONDARY'; knowledge_level: 2 | 3 | 4 | 5 | 6 } {
  const p = publisher.toLowerCase();
  if (p.includes('science literature') || p.includes('science archive')) return { source_trust_class: 'B_SCIENTIFIC', knowledge_level: 3 };
  if (p.includes('agriculture dept') || p.includes('agricultural bulletin') || p.includes('horticulture board')) return { source_trust_class: 'C_GOVERNMENT', knowledge_level: 4 };
  if (p.includes('ethnobotanical') || p.includes('horticulture notes')) return { source_trust_class: 'D_INSTITUTIONAL', knowledge_level: 5 };
  return { source_trust_class: 'F_SECONDARY', knowledge_level: 6 };
}

function externalResearch(category: IngredientCategory) {
  const items = CATEGORY_EXTERNAL_RESEARCH[category] || CATEGORY_EXTERNAL_RESEARCH.Other!;
  return items.map((it) => ({
    title: it.title,
    publisher: it.publisher,
    content: it.note,
    confidence: 'MEDIUM' as const,
    ...trustFor(it.publisher)
  }));
}

function generateResearchQuestions(ingredientName: string) {
  return [
    { question: `Is the same ${ingredientName} available at larger scale beyond this single producer?`, priority: 'High' as const, evidence_required: 'Survey 2-3 additional producers in the same district for volume and consistency.' },
    { question: `How consistent is the flavour of ${ingredientName} between batches and seasons?`, priority: 'Medium' as const, evidence_required: 'Sensory comparison across at least two harvest batches.' },
    { question: `What is the actual harvest / production window, confirmed across multiple sources?`, priority: 'High' as const, evidence_required: 'Cross-check the producer\'s stated window against a second producer or an agricultural department record.' },
    { question: `What is the moisture content and shelf stability of ${ingredientName}?`, priority: 'Medium' as const, evidence_required: 'Basic lab measurement or accelerated storage trial.' },
    { question: `How does the traditional processing method influence final flavour, compared to modern methods?`, priority: 'Medium' as const, evidence_required: 'Side-by-side small-batch comparison of traditional vs. mechanised processing.' },
    { question: `Is ${ingredientName} suitable for fermentation, and has this been tested?`, priority: 'Low' as const, evidence_required: 'A documented small-batch fermentation trial with sensory notes.' },
    { question: `Can ${ingredientName} be stored or transported for several months without quality loss?`, priority: 'Low' as const, evidence_required: 'A storage trial tracking sensory/physical change over 2-3 months.' }
  ].slice(0, 6);
}

function generateRDOpportunities(
  draft: FieldNoteDraft,
  flavourTags: { tag: string; inferred: boolean }[],
  seedSuffix: string
) {
  const cat = draft.ingredientCategory;
  const styles = CATEGORY_STYLE_MAP[cat] || CATEGORY_STYLE_MAP.Other!;
  const tagNames = flavourTags.map((t) => t.tag.toLowerCase());
  const boost = tagNames.includes('smoky') || tagNames.includes('caramel') || tagNames.includes('molasses') ? 1 : 0;
  const seed1 = draft.title + seedSuffix + '-op1';
  const seed2 = draft.title + seedSuffix + '-op2';

  const why1: string[] = [];
  if (flavourTags.length) why1.push(`You observed ${flavourTags.slice(0, 3).map((t) => t.tag.toLowerCase()).join('/')} characteristics in the field.`);
  why1.push(`${draft.ingredientName} is seasonally available in ${draft.availSeason || 'a defined window'}.`);
  why1.push('Traditional processing creates a potential point of differentiation from commercial equivalents.');
  if (draft.availQuantity) why1.push(`Reported volume (~${draft.availQuantity}) suggests small-batch trial feasibility.`);

  const style0 = styles[0] || 'experimental ale';
  return [
    {
      title: `${draft.ingredientName} × ${style0.replace(/\b\w/g, (c) => c.toUpperCase())}`,
      why: `The field observation suggests a combination of ${flavourTags.map((t) => t.tag.toLowerCase()).join(', ') || 'distinctive'} characteristics that may translate into ${styles.slice(0, 2).join(' or ')} styles.`,
      exploration: styles,
      hypothesis_status: 'HYPOTHESIS',
      scores: {
        novelty: seededScore(seed1, 5, 4) + boost,
        feasibility: seededScore(seed1 + 'f', 4, 4),
        availability: seededScore(seed1 + 'a', 3, 4),
        brand_fit: seededScore(seed1 + 'b', 5, 4),
        international: seededScore(seed1 + 'i', 4, 4),
        confidence: draft.availSeason ? 6 : 4
      },
      why_this: why1,
      risks: [
        'Sample size is one producer / one field visit — flavour and availability may not generalise.',
        `${draft.ingredientName} has not been tested in an actual brew or ferment yet.`
      ],
      unknowns: [
        'Whether the reported season and quantity hold across multiple years.',
        'How the ingredient behaves once processed at brewery scale rather than field/kitchen scale.'
      ],
      suggested_experiment: `Run a single small-batch (5-10L) trial of ${draft.ingredientName} in a ${style0} base and record sensory results against this field note's observations.`
    },
    {
      title: `${draft.ingredientName} × Indigenous Fermentation`,
      why: 'Traditional processing combined with alternative / wild fermentation could produce a differentiated beverage direction, distinct from standard adjunct use.',
      exploration: ['mixed fermentation trial', 'small-batch pilot', 'process documentation with the producer'],
      hypothesis_status: 'HYPOTHESIS — REQUIRES EXPERIMENTATION',
      scores: {
        novelty: seededScore(seed2, 6, 4),
        feasibility: seededScore(seed2 + 'f', 3, 3),
        availability: seededScore(seed2 + 'a', 3, 3),
        brand_fit: seededScore(seed2 + 'b', 4, 4),
        international: seededScore(seed2 + 'i', 3, 4),
        confidence: 3
      },
      why_this: [
        'Traditional / indigenous processing was directly observed or reported in the field.',
        'No fermentation trial has been run yet — this is explicitly a hypothesis, not a validated direction.',
        'Worth investigating in combination with Opportunity 01 rather than instead of it.'
      ],
      risks: [
        'Indigenous fermentation techniques are often community-held knowledge — document only what was explicitly shared, per the cultural safeguard on traditional knowledge.',
        'Wild/mixed fermentation outcomes are inherently less predictable than a controlled pitch.'
      ],
      unknowns: [
        'Whether a starter/culture is involved, and if so, whether it can be reliably sourced again.',
        'Food safety and consistency implications of an undocumented traditional process.'
      ],
      suggested_experiment: 'Document the producer\'s traditional process in full (with permission) before attempting any lab-scale replication.'
    }
  ];
}

export async function runMockAnalysis(draft: FieldNoteDraft, regenSalt = 0): Promise<AIAnalysis> {
  const observations = classifyEvidence(draft.rawText, draft.producerName);
  const flavourTags = extractFlavourTags(draft.rawText, draft.ingredientCategory);
  const sources = externalResearch(draft.ingredientCategory);
  const researchQuestions = generateResearchQuestions(draft.ingredientName);
  const rdOpportunities = generateRDOpportunities(draft, flavourTags, regenSalt ? `-r${regenSalt}` : '');

  // KB §34 — highlight the single most useful next question rather than
  // leaving the researcher to scan the full list. Simple, deterministic
  // heuristic: prefer a High-priority question over the rest.
  const nextQuestion = researchQuestions.find((q) => q.priority === 'High')?.question ?? researchQuestions[0]!.question;

  const analysis: AIAnalysis = {
    observations,
    flavour_tags: flavourTags,
    sources,
    research_questions: researchQuestions,
    rd_opportunities: rdOpportunities,
    next_question: nextQuestion
  };

  // Validate our own output too — keeps mock and real providers held to the
  // exact same contract, and catches regressions in this file during CI.
  return AIAnalysisSchema.parse(analysis);
}
