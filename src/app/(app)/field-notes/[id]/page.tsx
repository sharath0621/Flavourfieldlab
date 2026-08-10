import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFieldNoteDetail } from '@/lib/queries';
import { formatDateFull } from '@/lib/utils';
import { EvidenceBadge, ConfidenceBadge, SourceTrustBadge } from '@/components/evidence-badge';
import { RDOpportunityCard } from '@/components/rd-opportunity-card';
import { ResearchQuestionsPanel } from '@/components/field-notes/research-questions-panel';
import { RegenerateButton, SaveAllToBacklogButton } from '@/components/field-notes/note-detail-actions';
import type { ConfidenceLevel, ObservationType } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function FieldNoteDetailPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams: { analysisError?: string };
}) {
  const detail = await getFieldNoteDetail(params.id);
  if (!detail) notFound();

  const { note, observations, media, sources, researchQuestions, rdOpportunities, producer } = detail;
  const knownFacts = observations.filter((o) => o.type === 'VERIFIED' || o.type === 'FIELD_OBSERVED' || o.type === 'REPORTED');
  const inferences = observations.filter((o) => o.type === 'INFERRED');
  const photoMedia = media.filter((m) => m.type === 'photo');
  const voiceMedia = media.filter((m) => m.type === 'voice');
  const analysisPending = !note.analyzed_at;

  return (
    <div>
      <Link href="/field-notes" className="text-xs text-ink-soft hover:text-ink inline-flex mb-3">
        ← All field notes
      </Link>

      {note.is_demo && (
        <span className="inline-block text-[9.5px] tracking-[0.1em] font-bold text-rust bg-rust-bg px-1.5 py-0.5 rounded-sm mb-2">
          DEMO DATA
        </span>
      )}

      <div className="flex justify-between items-start gap-5 mb-[22px] flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-ink-faint font-semibold">{note.ingredient_category}</div>
          <h1 className="font-serif text-[32px] font-semibold mt-1 mb-1.5">{note.ingredient_name}</h1>
          <div className="flex gap-3.5 flex-wrap text-[13.5px] text-ink-soft">
            <span>📍 {note.district}, {note.state}</span>
            <span>🗓 {formatDateFull(note.date)}</span>
            <span>✎ {note.researcher_name}</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <RegenerateButton fieldNoteId={note.id} />
          {rdOpportunities.length > 0 && <SaveAllToBacklogButton fieldNoteId={note.id} />}
        </div>
      </div>

      {(searchParams.analysisError || (analysisPending && rdOpportunities.length === 0)) && (
        <div className="border border-hypothesis bg-hypothesis-bg text-hypothesis text-sm rounded px-4 py-3 mb-5">
          {searchParams.analysisError
            ? `AI analysis didn't complete: ${searchParams.analysisError}`
            : 'AI analysis has not run yet.'}{' '}
          Your field note text is safe — use &quot;Regenerate analysis&quot; above to try again.
        </div>
      )}

      {photoMedia.length > 0 && (
        <div className="flex flex-wrap gap-2.5 mb-5">
          {photoMedia.map((m) => (
            <div key={m.id} className="w-[120px]">
              <div className="w-[120px] h-[120px] rounded bg-gradient-to-br from-bg-alt to-rule-soft border border-rule overflow-hidden flex items-center justify-center text-2xl text-ink-faint">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt={m.caption || 'Field photo'} className="w-full h-full object-cover" />
              </div>
              {m.caption && <div className="text-[10.5px] text-ink-faint text-center mt-1">{m.caption}</div>}
            </div>
          ))}
        </div>
      )}

      {voiceMedia.length > 0 && (
        <Panel title="Voice notes" tag="Recorded in field">
          <div className="flex flex-col gap-2.5">
            {voiceMedia.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-3.5 py-2.5 border border-rule rounded bg-bg flex-wrap">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <audio controls src={m.url} className="h-8 max-w-[220px]" />
                <div className="flex-1 min-w-[160px] text-[13px] text-ink-soft">
                  {m.transcript || <em className="text-ink-faint">No transcript captured for this recording.</em>}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <div className="bg-paper border border-rule border-l-[3px] border-l-ink rounded px-[22px] py-5 mb-4">
        <h3 className="text-xs uppercase tracking-wide text-ink-soft font-semibold mb-3 flex justify-between">
          <span>Field observation</span>
          <span className="text-ink-faint normal-case font-normal">Raw · unedited</span>
        </h3>
        <div className="raw-note text-[16.5px] leading-relaxed">{note.raw_text}</div>
        {note.visit_why && (
          <p className="text-[13px] text-ink-soft mt-3 pt-3 border-t border-rule-soft">
            <span className="font-semibold text-ink">Why this visit: </span>{note.visit_why}
          </p>
        )}
      </div>

      {(hasSensory(note.sensory_observation) || note.process_observation.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-4">
          {hasSensory(note.sensory_observation) && (
            <Panel title="Sensory observation" tag="KB §09">
              <SensoryKV k="Seen" v={note.sensory_observation.seen} />
              <SensoryKV k="Smelt" v={note.sensory_observation.smelt} />
              <SensoryKV k="Tasted" v={note.sensory_observation.tasted} />
              <SensoryKV k="Heard" v={note.sensory_observation.heard} />
              <SensoryKV k="Touched" v={note.sensory_observation.touched} />
            </Panel>
          )}
          {note.process_observation.length > 0 && (
            <Panel title="Process observed" tag="What the producer did">
              <ul className="flex flex-wrap gap-1.5">
                {note.process_observation.map((step) => (
                  <li key={step} className="text-xs px-2.5 py-1 rounded-full border border-rule bg-bg">{step}</li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-[22px] items-start">
        <div>
          <Panel title="What we know" tag="AI generated">
            <div className="flex flex-col gap-2.5">
              {knownFacts.length === 0 && <EmptyNote text="No classified observations yet." />}
              {knownFacts.map((o) => (
                <ObservationItem key={o.id} type={o.type} content={o.content} confidence={o.confidence} source={o.source} />
              ))}
            </div>
          </Panel>

          <Panel title="External research" tag="AI generated · simulated">
            {sources.length === 0 && <EmptyNote text="No external research yet." />}
            {sources.map((s) => (
              <div key={s.id} className="flex gap-2.5 items-start px-3.5 py-2.5 border border-rule rounded bg-bg mb-2.5">
                <div className="flex-1">
                  <div className="flex gap-1.5 flex-wrap mb-1.5">
                    <EvidenceBadge type="RESEARCHED" />
                    <ConfidenceBadge level={s.confidence} />
                    <SourceTrustBadge trustClass={s.source_trust_class} />
                  </div>
                  <p className="font-semibold text-sm">{s.title}</p>
                  <p className="text-[13.5px] mt-0.5">{s.content}</p>
                  <div className="text-[11px] text-ink-faint mt-1">
                    {s.publisher} · accessed {s.accessed_at}
                  </div>
                </div>
              </div>
            ))}
            <p className="text-[11.5px] text-ink-faint mt-1">
              In production, this section calls live web research via AIService.summarizeSources(), with every claim
              linked to a real, dated source.
            </p>
          </Panel>

          {inferences.length > 0 && (
            <Panel title="AI inferences" tag="Interpretation, not fact">
              <div className="flex flex-col gap-2.5">
                {inferences.map((o) => (
                  <ObservationItem key={o.id} type={o.type} content={o.content} confidence={o.confidence} source={o.source} />
                ))}
              </div>
            </Panel>
          )}

          <Panel title="What we don't know" tag="Research gaps">
            <ul className="flex flex-col gap-2">
              {researchQuestions.map((q) => (
                <li key={q.id} className="text-[13.5px] pl-[18px] relative">
                  <span className="absolute left-0 top-0 text-rust font-bold text-xs">?</span>
                  {q.question}
                </li>
              ))}
            </ul>
            {note.next_question && (
              <div className="mt-3.5 pt-3.5 border-t border-rule-soft">
                <p className="text-[10.5px] uppercase tracking-wide text-rust font-bold mb-1">
                  Most useful next question
                </p>
                <p className="text-[13.5px] font-medium">{note.next_question}</p>
              </div>
            )}
          </Panel>

          <h2 className="text-lg font-semibold mt-9 mb-3.5">Research questions to investigate</h2>
          <div className="bg-paper border border-rule rounded px-5 mb-4">
            <ResearchQuestionsPanel questions={researchQuestions} fieldNoteId={note.id} />
          </div>

          <h2 className="text-lg font-semibold mt-9 mb-3.5">Potential R&D opportunities</h2>
          {rdOpportunities.length === 0 ? (
            <EmptyNote text="No R&D opportunities generated yet." />
          ) : (
            rdOpportunities.map((op, i) => <RDOpportunityCard key={op.id} opportunity={op} index={i} />)
          )}
        </div>

        <div>
          <Panel title="Ingredient Intelligence" tag="AI generated">
            <KV k="Category" v={note.ingredient_category} />
            <KV k="Field discovery" v={formatDateFull(note.date)} />
            <KV k="Source" v={note.producer_name || 'Field observation'} />
          </Panel>

          <Panel title="Availability">
            <KV k="Estimated season" v={note.avail_season || 'Not recorded'} />
            <KV k="Harvest period" v={note.avail_harvest_period || '—'} />
            <KV k="Processing period" v={note.avail_processing_period || '—'} />
            <div className="mt-2.5">
              <ConfidenceBadge level={note.avail_season ? 'MEDIUM' : 'LOW'} />
            </div>
            <p className="text-[11.5px] text-ink-faint mt-2">
              Based on a single field observation. Needs validation across additional producers.
            </p>
          </Panel>

          <Panel title="Supply">
            <KV k="Reported quantity" v={note.avail_quantity || 'Not recorded'} />
            <KV k="Price" v={note.avail_price || 'Not recorded'} />
            <KV k="Availability" v={note.avail_current || 'Unknown'} />
          </Panel>

          <Panel title="Flavour profile" tag="AI generated">
            <div className="flex flex-wrap gap-1.5">
              {note.flavour_tags.map((t) => (
                <span
                  key={t.tag}
                  className={`text-xs px-2.5 py-1 rounded-full border ${
                    t.inferred ? 'border-dashed border-inference text-inference bg-inference-bg' : 'border-rule bg-bg'
                  }`}
                >
                  {t.tag}
                  {t.inferred ? ' *' : ''}
                </span>
              ))}
            </div>
            {note.flavour_tags.some((t) => t.inferred) && (
              <p className="text-[11px] text-ink-faint mt-2">
                * Not explicitly mentioned in the field note — AI inference from ingredient category. Treat as a
                hypothesis, not an observation.
              </p>
            )}
          </Panel>

          {(note.producer_name || note.relationship_notes) && (
            <Panel title="Source / relationship" tag={producer ? 'Private · KB §08/§32' : undefined}>
              <KV k="Producer" v={note.producer_name || '—'} />
              <KV k="Organisation" v={note.producer_org || '—'} />
              <p className="text-[12.5px] text-ink-soft mt-2">{note.relationship_notes}</p>
              {producer?.relationship_status && (
                <p className="text-[11.5px] text-ink-faint mt-2">
                  Relationship: {producer.relationship_status}
                  {producer.last_visited ? ` · last visited ${producer.last_visited}` : ''}
                </p>
              )}
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

function Panel({ title, tag, children }: { title: string; tag?: string; children: React.ReactNode }) {
  return (
    <div className="bg-paper border border-rule rounded px-5 py-[18px] mb-4">
      <h3 className="text-xs uppercase tracking-wide font-semibold mb-3 flex justify-between items-center">
        <span>{title}</span>
        {tag && <span className="text-[10px] uppercase tracking-wide text-ink-faint font-bold">{tag}</span>}
      </h3>
      {children}
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-rule-soft last:border-b-0 text-[13px]">
      <span className="text-ink-soft">{k}</span>
      <span className="font-semibold text-right">{v}</span>
    </div>
  );
}

function ObservationItem({
  type,
  content,
  confidence,
  source
}: {
  type: ObservationType;
  content: string;
  confidence: ConfidenceLevel;
  source: string | null;
}) {
  return (
    <div className="flex gap-2.5 items-start px-3.5 py-2.5 border border-rule rounded bg-bg">
      <div className="flex-1">
        <div className="flex gap-1.5 flex-wrap mb-1.5">
          <EvidenceBadge type={type} />
          <ConfidenceBadge level={confidence} />
        </div>
        <p className="text-[13.5px]">{content}</p>
        <div className="text-[11px] text-ink-faint mt-1">Source: {source}</div>
      </div>
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return <div className="text-center py-6 text-ink-faint text-sm">{text}</div>;
}

function hasSensory(s: { seen?: string; smelt?: string; tasted?: string; heard?: string; touched?: string }): boolean {
  return Boolean(s.seen || s.smelt || s.tasted || s.heard || s.touched);
}

function SensoryKV({ k, v }: { k: string; v?: string }) {
  if (!v) return null;
  return (
    <div className="flex justify-between gap-3 py-1.5 border-b border-rule-soft last:border-b-0 text-[13px]">
      <span className="text-ink-soft shrink-0">{k}</span>
      <span className="font-medium text-right">{v}</span>
    </div>
  );
}
