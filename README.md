# Flavour Field Lab — MVP 01

Field Note → Ingredient Intelligence → Research Brief → R&D Opportunity.

A research companion for a beverage researcher who travels India documenting
unusual ingredients and indigenous production techniques. AI organises,
researches, and synthesises; the researcher discovers and decides. See the
in-app copy and `src/lib/ai/prompts.ts` for the guardrails this is built
around (never present inference as fact, never say "this will make a great
beer").

This is the production-shaped counterpart to the interactive HTML prototype
built earlier in this project — same design system, same product decisions,
now backed by a real Postgres schema, real auth, and a swappable AI provider.

## Stack

- Next.js 14 (App Router) + TypeScript (strict)
- Tailwind CSS — hand-rolled UI primitives styled to match the validated
  prototype (no shadcn/ui CLI dependency, kept intentionally lightweight;
  `npx shadcn-ui@latest init` can be layered in later without conflict)
- Supabase: Postgres, Auth (email magic link), Storage
- OpenAI via a provider-swappable `AIService` (mock provider included, zero
  cost, no key required, for immediate local use)
- Search: Postgres full-text search (generated `tsvector` column) — no
  external search infra, per the MVP brief

## Setup

### 1. Install

```bash
npm install
cp .env.example .env.local
```

### 2. Create a Supabase project

In the Supabase SQL editor (or via `supabase db push` if you use the CLI),
run, in order:

```
supabase/schema.sql
```

Copy your project's URL, anon key, and service role key (Project Settings →
API) into `.env.local`.

### 3. Sign up once

```bash
npm run dev
```

Visit `http://localhost:3000`, you'll land on `/login`. Enter your email and
follow the magic link. This creates the first `auth.users` row, which the
demo seed data attaches to (see below).

### 4. (Optional) Seed demo data

```
-- in the Supabase SQL editor, after step 3:
supabase/seed.sql
```

Then, with the app's dependencies installed and `.env.local` configured:

```bash
npm run seed:analyze
```

This runs the real `AIService.analyzeFieldNote()` pipeline (mock provider by
default) over the 8 raw seed notes — the exact same code path a live "Save &
Analyse" click uses — populating observations, external-research citations,
research questions, and scored R&D opportunities. Nothing about the demo
data's *analysis* is hand-authored; only the raw field note text is (and is
clearly a fictional composite — see spec on demo data labeling).

### 5. Run

```bash
npm run dev
```

## Switching on real AI

By default `AI_PROVIDER=mock` — a deterministic, rule-based classifier
(ported from the interactive prototype) that costs nothing and needs no key.
To use a real model:

```
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini   # or any model that supports structured JSON output
```

Both providers implement the same `AIAnalysis` contract (`src/lib/ai/schema.ts`,
validated with Zod), so nothing else in the app needs to change. The OpenAI
provider retries once on a parse/validation failure and never touches
`field_notes.raw_text` — a failed analysis leaves the original note
untouched and surfaces a "Regenerate analysis" prompt instead.

## What works

- Full loop: capture → raw note preserved verbatim → AI analysis → Ingredient
  Intelligence → Research Brief (what we know / don't know) → scored R&D
  opportunities → save to backlog
- Fact / source-claim / external-research / inference / hypothesis / idea
  labeling, enforced at the schema level (Zod) and rendered with distinct
  badges everywhere evidence appears
- "Why did AI surface this?" panel on every R&D opportunity
- Research question status tracking (Open / Investigating / Answered / Not
  relevant), R&D backlog board with 8 statuses
- Regenerate analysis, with backlog status and question status preserved
  across regeneration (a real bug caught and fixed while building the
  prototype this app is based on — see `regenerateAnalysis` in
  `src/app/actions.ts`)
- Photo upload straight to Supabase Storage from the browser (no server
  round-trip for file bytes) — via file picker, drag-and-drop, or clipboard
  paste
- Real voice recording with live browser-based transcription (see below) and
  an explicit "insert into notes" step
- Postgres full-text search + category filter across field notes
- Row-Level Security scoping every researcher to their own field notes
- Magic-link auth

## What's mocked / architecture-only

- **Voice recording is real**: `components/field-notes/voice-recorder.tsx`
  uses `MediaRecorder` to capture actual microphone audio, uploads it to
  Supabase Storage, and stores it as a `media` row (`type: 'voice'`).
  **Live transcription is also real**, via the browser's Web Speech API
  (`SpeechRecognition`/`webkitSpeechRecognition`) — no external API or key
  needed. It only works in browsers that implement that API (Chrome, Edge,
  Safari); Firefox and others still record audio correctly, just without
  live text, and the UI says so explicitly rather than failing silently.
  The researcher reviews the transcript and explicitly clicks "Insert into
  notes" to fold it into the raw field observation — never auto-merged,
  consistent with "AI assists, researcher decides." A server-side
  transcription fallback (e.g. Whisper) could be added later for unsupported
  browsers using the same `media.transcript` column.
- **Photo capture has three paths**: file picker, drag-and-drop, and
  clipboard paste (⌘V) — the fast path for screenshots, in
  `components/field-notes/photo-uploader.tsx`.
- **Map**: `/map` is a clean list view grouped by state, reading from the
  same `field_notes.gps`/`state`/`district` columns a real map would use.
  Swapping in Leaflet/Mapbox is additive, not a schema change.
- **Mock AI provider**: rule-based, not a real model. Good enough to
  demonstrate the full product loop with zero setup; switch to
  `AI_PROVIDER=openai` for real synthesis.
- **External research**: even the OpenAI provider generates plausible,
  hedged, *unverified* research-style entries from the model's own
  knowledge — it does not call a live search API. A real v2 would add a web
  search tool call here (see `AIService.summarizeSources`).

## Known limitations

- No live Supabase or OpenAI credentials were available in the environment
  this was built in, so runtime behavior (auth flow, DB writes, real model
  calls) could not be exercised end-to-end here. What *was* verified in
  this environment: `tsc --noEmit`, `next lint`, and `next build` all pass
  cleanly — see the build summary provided alongside this project.
- Auth is intentionally minimal (magic link only, no route-level role
  checks beyond "signed in or not") — fine for a single-researcher MVP, not
  for a multi-tenant team product.
- No offline sync — the brief explicitly defers this past MVP 01.

## Recommended next step

1. Create a real Supabase project and run through Setup above.
2. Seed and browse the demo data with the mock provider first — confirms
   the whole loop works before spending on OpenAI calls.
3. Flip `AI_PROVIDER=openai`, re-run `npm run seed:analyze -- --force`, and
   compare the quality of a real model's observations/opportunities against
   the mock provider's on the same 8 field notes.
4. From there: Version 2 (Ingredient Seasonality Intelligence) and beyond,
   per the roadmap in the build spec — the schema and `AIService` seam were
   built with those in mind (e.g. `ingredients.season`/`varieties`/`regions`
   already exist as columns, currently unused by the UI).
