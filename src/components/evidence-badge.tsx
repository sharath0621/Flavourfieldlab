import type { ConfidenceLevel, ObservationType, SourceTrustClass } from '@/lib/types';
import { SOURCE_TRUST_LABELS } from '@/lib/types';
import { cn } from '@/lib/utils';

// The visual encoding of the RAG Knowledge Base doc §04 — every retrieved or
// derived claim must be unmistakably labeled with one of six evidence
// levels. This is the single most important trust signal in the product;
// it appears everywhere evidence is shown. VERIFIED sits above
// FIELD_OBSERVED because it means independently corroborated, not just
// directly seen once.
const EVIDENCE_CONFIG: Record<ObservationType, { emoji: string; label: string; bg: string; fg: string }> = {
  VERIFIED: { emoji: '✅', label: 'VERIFIED', bg: 'bg-verified-bg', fg: 'text-verified' },
  FIELD_OBSERVED: { emoji: '🟢', label: 'FIELD OBSERVED', bg: 'bg-fact-bg', fg: 'text-fact' },
  REPORTED: { emoji: '🗣', label: 'REPORTED', bg: 'bg-reported-bg', fg: 'text-reported' },
  RESEARCHED: { emoji: '🔎', label: 'RESEARCHED', bg: 'bg-research-bg', fg: 'text-research' },
  INFERRED: { emoji: '🟡', label: 'AI INFERRED', bg: 'bg-inference-bg', fg: 'text-inference' },
  HYPOTHESIS: { emoji: '🟠', label: 'HYPOTHESIS', bg: 'bg-hypothesis-bg', fg: 'text-hypothesis' }
};

export function EvidenceBadge({ type }: { type: ObservationType }) {
  const cfg = EVIDENCE_CONFIG[type];
  return (
    <span className={cn('inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap', cfg.bg, cfg.fg)}>
      {cfg.emoji} {cfg.label}
    </span>
  );
}

const CONFIDENCE_CONFIG: Record<ConfidenceLevel, { bg: string; fg: string }> = {
  HIGH: { bg: 'bg-fact-bg', fg: 'text-conf-high' },
  MEDIUM: { bg: 'bg-inference-bg', fg: 'text-conf-medium' },
  LOW: { bg: 'bg-[#F3E1DB]', fg: 'text-conf-low' }
};

export function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const cfg = CONFIDENCE_CONFIG[level];
  return (
    <span className={cn('inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap', cfg.bg, cfg.fg)}>
      Confidence · {level}
    </span>
  );
}

// §03 Source trust model — a compact "where did this come from" chip, shown
// alongside (never instead of) the evidence badge. Evidence label = how
// certain the claim is; trust class = what kind of source produced it.
const TRUST_CONFIG: Record<SourceTrustClass, { bg: string; fg: string }> = {
  A_PRIMARY: { bg: 'bg-fact-bg', fg: 'text-fact' },
  B_SCIENTIFIC: { bg: 'bg-research-bg', fg: 'text-research' },
  C_GOVERNMENT: { bg: 'bg-reported-bg', fg: 'text-reported' },
  D_INSTITUTIONAL: { bg: 'bg-reported-bg', fg: 'text-reported' },
  E_INDUSTRY: { bg: 'bg-hypothesis-bg', fg: 'text-hypothesis' },
  F_SECONDARY: { bg: 'bg-inference-bg', fg: 'text-inference' },
  G_UNVERIFIED: { bg: 'bg-[#F3E1DB]', fg: 'text-conf-low' }
};

export function SourceTrustBadge({ trustClass }: { trustClass: SourceTrustClass }) {
  const cfg = TRUST_CONFIG[trustClass];
  return (
    <span
      className={cn('inline-flex items-center text-[10.5px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap border border-current/20', cfg.bg, cfg.fg)}
      title="Source trust class (RAG Knowledge Base §03)"
    >
      {SOURCE_TRUST_LABELS[trustClass]}
    </span>
  );
}
