'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createFieldNote } from '@/app/actions';
import { Field, Input, Label, Textarea } from '@/components/ui/form-controls';
import { Button } from '@/components/ui/button';
import { PhotoUploader, type DraftPhoto } from '@/components/field-notes/photo-uploader';
import { VoiceRecorder, type DraftVoiceNote } from '@/components/field-notes/voice-recorder';
import { INGREDIENT_CATEGORIES, type IngredientCategory } from '@/lib/types';

const PROCESSING_STEPS = [
  'Classifying observations (field-observed vs. reported vs. inferred)',
  'Extracting flavour signals',
  'Cross-referencing external research',
  'Generating research questions',
  'Drafting R&D opportunities'
];

export function CaptureForm({ researcherDefaultName }: { researcherDefaultName: string }) {
  const router = useRouter();
  const draftId = useMemo(() => crypto.randomUUID(), []);
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<DraftVoiceNote[]>([]);
  const [category, setCategory] = useState<IngredientCategory | null>(null);
  const [status, setStatus] = useState<'idle' | 'processing' | 'error'>('idle');
  const [processingStep, setProcessingStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const rawTextRef = useRef<HTMLTextAreaElement>(null);

  function insertTranscript(transcript: string) {
    const ta = rawTextRef.current;
    if (!ta) return;
    ta.value = ta.value.trim() ? ta.value.trim() + '\n\n' + transcript : transcript;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isRecordingVoice) {
      setErrorMsg('Stop the voice recording before saving.');
      return;
    }
    if (!category) {
      setErrorMsg('Pick an ingredient category first.');
      return;
    }
    const fd = new FormData(e.currentTarget);
    setStatus('processing');
    setErrorMsg('');

    // Purely cosmetic step animation so the researcher sees the pipeline is
    // doing something (spec §6/§33) — the actual work happens in one
    // server action call below.
    let step = 0;
    const stepTimer = setInterval(() => {
      step = Math.min(step + 1, PROCESSING_STEPS.length - 1);
      setProcessingStep(step);
    }, 420);

    try {
      const { id, analysisError } = await createFieldNote({
        title: String(fd.get('title')),
        date: String(fd.get('date')),
        researcherName: String(fd.get('researcher') || researcherDefaultName),
        state: String(fd.get('state')),
        district: String(fd.get('district')),
        gps: String(fd.get('gps') || ''),
        ingredientName: String(fd.get('ingredientName')),
        ingredientCategory: category,
        rawText: String(fd.get('rawText')),
        visitWhy: String(fd.get('visitWhy') || ''),
        sensoryObservation: {
          seen: String(fd.get('sensorySeen') || '') || undefined,
          smelt: String(fd.get('sensorySmelt') || '') || undefined,
          tasted: String(fd.get('sensoryTasted') || '') || undefined,
          heard: String(fd.get('sensoryHeard') || '') || undefined,
          touched: String(fd.get('sensoryTouched') || '') || undefined
        },
        processObservation: String(fd.get('processObservation') || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        producerName: String(fd.get('producerName') || ''),
        producerOrg: String(fd.get('producerOrg') || ''),
        producerContact: String(fd.get('producerContact') || ''),
        relationshipNotes: String(fd.get('relationshipNotes') || ''),
        availQuantity: String(fd.get('quantity') || ''),
        availPrice: String(fd.get('price') || ''),
        availSeason: String(fd.get('season') || ''),
        availHarvestPeriod: String(fd.get('harvestPeriod') || ''),
        availProcessingPeriod: String(fd.get('processingPeriod') || ''),
        availCurrent: String(fd.get('currentAvailability') || ''),
        photos: photos.filter((p) => p.url).map((p) => ({ url: p.url, caption: p.caption })),
        voiceNotes: voiceNotes.filter((v) => v.url).map((v) => ({ url: v.url, transcript: v.transcript }))
      });
      clearInterval(stepTimer);
      if (analysisError) {
        // The field note is safely saved — only the AI step failed. Land on
        // the detail page, which offers "Regenerate analysis".
        router.push(`/field-notes/${id}?analysisError=${encodeURIComponent(analysisError)}`);
      } else {
        router.push(`/field-notes/${id}`);
      }
    } catch (err) {
      clearInterval(stepTimer);
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong saving this note.');
    }
  }

  if (status === 'processing') {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center">
        <div className="w-14 h-14 border-[3px] border-rule border-t-rust rounded-full mx-auto mb-5 animate-spin" />
        <h2 className="font-serif text-xl mb-1">Analysing your field note</h2>
        <p className="text-ink-soft text-[13.5px]">Your original note is saved as-is. AI is now structuring it.</p>
        <ul className="text-left text-sm text-ink-soft mt-[18px] space-y-2">
          {PROCESSING_STEPS.map((s, i) => (
            <li key={s} className={i < processingStep ? 'text-fact opacity-100' : i === processingStep ? 'text-ink font-semibold opacity-100' : 'opacity-35'}>
              {s}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-[760px]">
      <Section title="Basic information">
        <Field>
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" required placeholder="Traditional jaggery producer near Kolhapur" />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field>
            <Label htmlFor="state">State</Label>
            <Input id="state" name="state" required placeholder="Maharashtra" />
          </Field>
          <Field>
            <Label htmlFor="district">District / City</Label>
            <Input id="district" name="district" required placeholder="Kolhapur" />
          </Field>
          <Field>
            <Label htmlFor="gps">
              GPS <span className="font-normal text-ink-faint">(optional)</span>
            </Label>
            <Input id="gps" name="gps" placeholder="16.70°N, 74.24°E" />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field>
            <Label htmlFor="date">Date</Label>
            <Input id="date" name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
          </Field>
          <Field>
            <Label htmlFor="researcher">Researcher</Label>
            <Input id="researcher" name="researcher" required defaultValue={researcherDefaultName} />
          </Field>
        </div>
      </Section>

      <Section title="Ingredient">
        <Field>
          <Label htmlFor="ingredientName">Ingredient name</Label>
          <Input id="ingredientName" name="ingredientName" required placeholder="Jaggery" />
        </Field>
        <Field>
          <Label>Category</Label>
          <div className="flex flex-wrap gap-2">
            {INGREDIENT_CATEGORIES.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setCategory(c)}
                className={`px-3.5 py-1.5 rounded-full text-[12.5px] border ${
                  category === c ? 'bg-ink text-paper border-ink' : 'bg-paper border-rule'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </Field>
      </Section>

      <Section title="Field observation" hint="The most important field. Don't structure your thoughts — just write.">
        <Field>
          <Textarea
            ref={rawTextRef}
            name="rawText"
            required
            rows={7}
            className="font-serif text-[15px] leading-relaxed"
            placeholder="What did you see, smell, taste, hear or learn?"
          />
        </Field>
      </Section>

      <Section title="Context" hint="Optional — per the KB's field-note structure: why the visit happened, and what the producer actually did">
        <Field>
          <Label htmlFor="visitWhy">Why this visit happened</Label>
          <Input id="visitWhy" name="visitWhy" placeholder="e.g. following up on a tip about a smoked jaggery variant" />
        </Field>
        <Field>
          <Label htmlFor="processObservation">
            Process observed <span className="font-normal text-ink-faint">(comma-separated, e.g. Harvest, Dry, Roast)</span>
          </Label>
          <Input id="processObservation" name="processObservation" placeholder="Harvest, Boil, Ferment" />
        </Field>
      </Section>

      <Section title="Sensory observation" hint="Optional — structured capture, kept separate from the AI's evidence classification">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field>
            <Label htmlFor="sensorySeen">Seen</Label>
            <Input id="sensorySeen" name="sensorySeen" />
          </Field>
          <Field>
            <Label htmlFor="sensorySmelt">Smelt</Label>
            <Input id="sensorySmelt" name="sensorySmelt" />
          </Field>
          <Field>
            <Label htmlFor="sensoryTasted">Tasted</Label>
            <Input id="sensoryTasted" name="sensoryTasted" />
          </Field>
          <Field>
            <Label htmlFor="sensoryHeard">Heard</Label>
            <Input id="sensoryHeard" name="sensoryHeard" />
          </Field>
          <Field>
            <Label htmlFor="sensoryTouched">Touched</Label>
            <Input id="sensoryTouched" name="sensoryTouched" />
          </Field>
        </div>
      </Section>

      <Section title="Photos" hint="Optional — file picker, drag-and-drop, or paste a screenshot with ⌘V">
        <PhotoUploader draftId={draftId} photos={photos} onChange={setPhotos} />
      </Section>

      <Section title="Voice note" hint="Optional — records real audio and transcribes live where your browser supports it">
        <VoiceRecorder
          draftId={draftId}
          notes={voiceNotes}
          onChange={setVoiceNotes}
          onInsertTranscript={insertTranscript}
          onRecordingChange={setIsRecordingVoice}
        />
      </Section>

      <Section title="People / source" hint="Optional">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field>
            <Label htmlFor="producerName">Producer / Farmer name</Label>
            <Input id="producerName" name="producerName" placeholder="e.g. name, or 'unnamed — withheld'" />
          </Field>
          <Field>
            <Label htmlFor="producerOrg">Organisation / Farm</Label>
            <Input id="producerOrg" name="producerOrg" />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field>
            <Label htmlFor="producerContact">Contact information</Label>
            <Input id="producerContact" name="producerContact" />
          </Field>
          <Field>
            <Label htmlFor="relationshipNotes">Relationship notes</Label>
            <Input id="relationshipNotes" name="relationshipNotes" />
          </Field>
        </div>
      </Section>

      <Section title="Raw material / availability" hint="Optional">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field>
            <Label htmlFor="quantity">Approx. quantity available</Label>
            <Input id="quantity" name="quantity" placeholder="~300kg / season" />
          </Field>
          <Field>
            <Label htmlFor="price">Price</Label>
            <Input id="price" name="price" />
          </Field>
          <Field>
            <Label htmlFor="season">Season</Label>
            <Input id="season" name="season" placeholder="March–April" />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field>
            <Label htmlFor="harvestPeriod">Harvest period</Label>
            <Input id="harvestPeriod" name="harvestPeriod" />
          </Field>
          <Field>
            <Label htmlFor="processingPeriod">Processing period</Label>
            <Input id="processingPeriod" name="processingPeriod" />
          </Field>
          <Field>
            <Label htmlFor="currentAvailability">Current availability</Label>
            <Input id="currentAvailability" name="currentAvailability" />
          </Field>
        </div>
      </Section>

      {errorMsg && <p className="text-sm text-conf-low mb-3">{errorMsg}</p>}

      <div className="sticky bottom-0 bg-gradient-to-t from-bg via-bg to-transparent pt-4 pb-2 flex justify-end gap-2.5">
        <Button type="button" variant="outline" onClick={() => router.push('/dashboard')}>
          Cancel
        </Button>
        <Button type="submit" variant="rust">
          Save &amp; Analyse →
        </Button>
      </div>
    </form>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-7">
      <h3 className="text-[13px] uppercase tracking-wide text-ink-soft font-bold mb-1">{title}</h3>
      {hint && <p className="text-[12.5px] text-ink-faint mb-3.5">{hint}</p>}
      {children}
    </div>
  );
}
