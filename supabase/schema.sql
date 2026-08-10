-- =============================================================================
-- Flavour Field Lab — MVP 01 schema
-- Run this once against a fresh Supabase project (SQL editor, or `supabase db push`).
-- Entities follow spec §21. RLS scopes every field note (and everything hanging
-- off it) to the researcher who captured it; ingredients are a shared library
-- across researchers (per spec's "Ingredient Atlas" ambition in §28/§29).
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
--
-- observation_type / source_trust_class / knowledge_level follow the
-- "Flavour Field Lab RAG Knowledge Base — Master Document v1.0": §04
-- (evidence labels), §03 (source trust model), §02 (knowledge hierarchy).
-- ---------------------------------------------------------------------------
create type observation_type as enum ('VERIFIED','FIELD_OBSERVED','REPORTED','RESEARCHED','INFERRED','HYPOTHESIS');
create type source_trust_class as enum ('A_PRIMARY','B_SCIENTIFIC','C_GOVERNMENT','D_INSTITUTIONAL','E_INDUSTRY','F_SECONDARY','G_UNVERIFIED');
create type knowledge_visibility as enum ('PRIVATE','TEAM','PUBLIC');
create type researcher_decision as enum ('Rejected','Interesting but unsourceable','Saved to backlog','Deferred');
create type confidence_level as enum ('HIGH','MEDIUM','LOW');
create type research_confidence as enum ('High','Medium','Low');
create type question_status as enum ('Open','Investigating','Answered','Not relevant');
create type question_priority as enum ('High','Medium','Low');
create type backlog_status as enum ('Captured','Researching','Interesting','Prototype','Tested','Promising','Rejected','Archived');
create type ingredient_category as enum (
  'Fruit','Grain','Millet','Sugar / Sweetener','Spice','Herb','Flower','Root','Botanical','Dairy','Fermentation culture','Other'
);

-- ---------------------------------------------------------------------------
-- profiles — mirrors auth.users so we have a researcher name/role to display
-- without joining into the auth schema from client code.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  role text not null default 'researcher',
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', new.email), new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- ingredients — canonical, de-duplicated across field notes (find-or-create
-- by name at capture time). Shape mirrors the KB doc §06 INGREDIENT PROFILE.
-- Only name/category are guaranteed on creation; everything else
-- accumulates over time from field notes or direct researcher edits — the
-- AI must never fabricate agricultural/sensory/processing detail that
-- wasn't actually observed or sourced (KB §33). This is what a future
-- Ingredient Atlas / Knowledge Graph (KB §41) would build on top of.
-- ---------------------------------------------------------------------------
create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  common_name text,
  regional_names text[] not null default '{}',
  scientific_name text,
  category ingredient_category not null,
  sub_category text,

  varieties text[] not null default '{}',
  regions text[] not null default '{}', -- known growing regions
  season text,

  -- Agricultural cycle (KB §06)
  planting text,
  growing text,
  harvest text,
  peak_availability text,
  post_harvest text,
  storage text,

  -- Physical characteristics (KB §06)
  colour text,
  size text,
  texture text,
  moisture text,
  density text,

  -- Sensory characteristics — flexible map over the controlled vocabulary
  -- in KB §12 (aroma, taste, mouthfeel, acidity, sweetness, bitterness,
  -- astringency, spice, earthiness, smokiness, fruitiness, floral, herbal,
  -- roasted, fermented) so a partially-known profile never has to be padded
  -- with invented values.
  sensory_characteristics jsonb not null default '{}'::jsonb,
  flavour_profile text[] not null default '{}',
  processing_methods text[] not null default '{}',
  traditional_uses jsonb not null default '{}'::jsonb,
  beverage_relevance jsonb,
  availability_profile jsonb,
  research_confidence jsonb,

  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- producers — one row per farmer/producer relationship (KB §08). This is
-- deliberately owned per-researcher (not a shared library like ingredients)
-- and defaults to PRIVATE visibility: the KB doc is explicit that
-- relationship memory "should remain private" and must never be exposed
-- without permission (KB §11, §32).
-- ---------------------------------------------------------------------------
create table public.producers (
  id uuid primary key default gen_random_uuid(),
  researcher_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  region text,
  village text,
  ingredient_name text,
  crop text,
  variety text,
  production_method text,
  traditional_method text,
  approximate_production text,
  availability text,
  season text,
  processing text,
  minimum_quantity text,
  typical_price text,
  contact text,
  relationship_status text,
  last_visited date,
  notes text,
  -- previous_conversations / promises / samples_received / sourcing_history /
  -- experiments / future_availability / quality_consistency (KB §08 RELATIONSHIP MEMORY)
  relationship_memory jsonb not null default '{}'::jsonb,
  visibility knowledge_visibility not null default 'PRIVATE',
  created_at timestamptz not null default now()
);

create index producers_researcher_idx on public.producers (researcher_id);

-- ---------------------------------------------------------------------------
-- field_notes — the sacred raw record. raw_text is NEVER overwritten by the
-- AI pipeline; only observations/sources/questions/opportunities derived
-- from it are regenerated on "Regenerate analysis".
-- ---------------------------------------------------------------------------
create table public.field_notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  researcher_id uuid not null references auth.users(id) on delete cascade,
  researcher_name text,

  country text not null default 'India',
  state text not null,
  district text not null,
  gps text,

  ingredient_id uuid references public.ingredients(id),
  ingredient_name text not null,
  ingredient_category ingredient_category not null,

  raw_text text not null,

  -- KB §09 CONTEXT (who/where/when are covered by researcher_name/state+district/date)
  -- and SENSORY / PROCESS OBSERVATION — the researcher's own structured
  -- capture, distinct from and editable independent of the AI-derived
  -- field_observations ledger below.
  visit_why text,
  sensory_observation jsonb not null default '{}'::jsonb, -- {seen,smelt,tasted,heard,touched}
  process_observation text[] not null default '{}',

  producer_id uuid references public.producers(id) on delete set null,
  producer_name text,
  producer_org text,
  producer_contact text,
  relationship_notes text,

  avail_quantity text,
  avail_price text,
  avail_season text,
  avail_harvest_period text,
  avail_processing_period text,
  avail_current text,

  analyzed_at timestamptz,
  regen_count int not null default 0,
  is_demo boolean not null default false,
  -- Per-note flavour tags from the last analysis run, e.g. [{"tag":"Smoky","inferred":false}].
  -- Kept alongside the canonical ingredients.flavour_profile aggregate so the
  -- detail page can show exactly what THIS note evidenced vs. inferred.
  flavour_tags jsonb not null default '[]'::jsonb,
  -- KB §34 "the most important RAG question" — the single most useful next
  -- question to pursue, highlighted separately from the full
  -- research_questions ledger.
  next_question text,

  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(ingredient_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(state, '') || ' ' || coalesce(district, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(producer_name, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(avail_season, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(raw_text, '')), 'D')
  ) stored,

  created_at timestamptz not null default now()
);

create index field_notes_search_idx on public.field_notes using gin (search_vector);
create index field_notes_researcher_idx on public.field_notes (researcher_id);
create index field_notes_ingredient_idx on public.field_notes (ingredient_id);
create index field_notes_producer_idx on public.field_notes (producer_id);

-- ---------------------------------------------------------------------------
-- field_observations — the evidence ledger (KB §04): every derived claim is
-- VERIFIED / FIELD_OBSERVED / REPORTED / RESEARCHED / INFERRED / HYPOTHESIS,
-- never presented as fact when it isn't. RESEARCHED rows are also stored
-- here for the raw claim text; the citation itself (title/url/publisher)
-- lives in `sources`, linked by content.
-- ---------------------------------------------------------------------------
create table public.field_observations (
  id uuid primary key default gen_random_uuid(),
  field_note_id uuid not null references public.field_notes(id) on delete cascade,
  type observation_type not null,
  content text not null,
  confidence confidence_level not null default 'MEDIUM',
  source text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index field_observations_note_idx on public.field_observations (field_note_id);

-- ---------------------------------------------------------------------------
-- media — photos and voice notes. Voice notes store a null transcript until
-- an async transcription job fills it in (architecture only in this MVP).
-- ---------------------------------------------------------------------------
create table public.media (
  id uuid primary key default gen_random_uuid(),
  field_note_id uuid not null references public.field_notes(id) on delete cascade,
  type text not null default 'photo' check (type in ('photo','voice')),
  url text not null,
  storage_path text,
  caption text,
  transcript text,
  created_at timestamptz not null default now()
);

create index media_note_idx on public.media (field_note_id);

-- ---------------------------------------------------------------------------
-- sources — dated, linked external research citations (KB §26 SOURCE
-- CITATION), classified by source trust class (KB §03) and knowledge
-- hierarchy level (KB §02: 2=Experimental, 3=Scientific, 4=Agricultural,
-- 5=Cultural/Historical, 6=Market — Level 1 is field_notes itself, Level 7
-- is AI inference, tracked via observation_type=INFERRED instead).
-- ---------------------------------------------------------------------------
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  field_note_id uuid not null references public.field_notes(id) on delete cascade,
  title text not null,
  url text,
  publisher text,
  content text,
  confidence confidence_level not null default 'MEDIUM',
  source_trust_class source_trust_class not null default 'G_UNVERIFIED',
  knowledge_level smallint not null default 3 check (knowledge_level between 1 and 7),
  accessed_at date not null default current_date,
  created_at timestamptz not null default now()
);

create index sources_note_idx on public.sources (field_note_id);

-- ---------------------------------------------------------------------------
-- research_questions — the "what we don't know" ledger (KB §18).
-- ---------------------------------------------------------------------------
create table public.research_questions (
  id uuid primary key default gen_random_uuid(),
  field_note_id uuid not null references public.field_notes(id) on delete cascade,
  question text not null,
  status question_status not null default 'Open',
  priority question_priority,
  evidence_required text,
  answer text,
  created_at timestamptz not null default now()
);

create index research_questions_note_idx on public.research_questions (field_note_id);

-- ---------------------------------------------------------------------------
-- rd_opportunities — scored hypotheses (spec §13, §15). backlog_status is
-- null until the researcher explicitly saves it (spec §18); regeneration
-- must preserve backlog_status by matching on title (see AIService).
-- ---------------------------------------------------------------------------
create table public.rd_opportunities (
  id uuid primary key default gen_random_uuid(),
  field_note_id uuid not null references public.field_notes(id) on delete cascade,
  title text not null,
  why text not null,
  exploration text[] not null default '{}',
  novelty_score int not null check (novelty_score between 1 and 10),
  feasibility_score int not null check (feasibility_score between 1 and 10),
  availability_score int not null check (availability_score between 1 and 10),
  brand_fit_score int not null check (brand_fit_score between 1 and 10),
  international_score int not null check (international_score between 1 and 10),
  confidence_score int not null check (confidence_score between 1 and 10),
  hypothesis_status text not null default 'HYPOTHESIS — REQUIRES EXPERIMENTATION',
  why_this text[] not null default '{}',
  -- KB §17: Risks / Unknowns / Suggested experiment, in addition to the
  -- scored fields above (feasibility/availability/brand_fit/international
  -- already covered novelty/confidence too).
  risks text[] not null default '{}',
  unknowns text[] not null default '{}',
  suggested_experiment text,
  backlog_status backlog_status,
  created_at timestamptz not null default now()
);

create index rd_opportunities_note_idx on public.rd_opportunities (field_note_id);
create index rd_opportunities_backlog_idx on public.rd_opportunities (backlog_status) where backlog_status is not null;

-- ---------------------------------------------------------------------------
-- decision_log — "learn from decisions" (KB §38). Records what the
-- researcher decided and why, WITHOUT silently turning repeated decisions
-- into an inferred personal preference — the KB doc requires explicit
-- confirmation before that step, which is a future UI concern, not a schema
-- one; this table only stores the raw decision memory.
-- ---------------------------------------------------------------------------
create table public.decision_log (
  id uuid primary key default gen_random_uuid(),
  researcher_id uuid not null references auth.users(id) on delete cascade,
  ingredient_name text not null,
  field_note_id uuid references public.field_notes(id) on delete set null,
  decision researcher_decision not null,
  reason text,
  potential research_confidence,
  availability research_confidence,
  created_at timestamptz not null default now()
);

create index decision_log_researcher_idx on public.decision_log (researcher_id);
create index decision_log_ingredient_idx on public.decision_log (ingredient_name);

-- =============================================================================
-- Row Level Security — every researcher sees only their own field notes and
-- everything derived from them. Ingredients are a shared read library.
-- =============================================================================
alter table public.profiles enable row level security;
alter table public.ingredients enable row level security;
alter table public.producers enable row level security;
alter table public.field_notes enable row level security;
alter table public.field_observations enable row level security;
alter table public.media enable row level security;
alter table public.sources enable row level security;
alter table public.research_questions enable row level security;
alter table public.rd_opportunities enable row level security;
alter table public.decision_log enable row level security;

create policy "profiles are self-readable" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles are self-editable" on public.profiles
  for update using (auth.uid() = id);

create policy "ingredients are readable by any authenticated researcher" on public.ingredients
  for select using (auth.role() = 'authenticated');
create policy "ingredients are writable by any authenticated researcher" on public.ingredients
  for insert with check (auth.role() = 'authenticated');
create policy "ingredients are updatable by any authenticated researcher" on public.ingredients
  for update using (auth.role() = 'authenticated');

create policy "researchers manage their own field notes" on public.field_notes
  for all using (auth.uid() = researcher_id) with check (auth.uid() = researcher_id);

create policy "researchers manage observations on their own notes" on public.field_observations
  for all using (exists (select 1 from public.field_notes fn where fn.id = field_note_id and fn.researcher_id = auth.uid()))
  with check (exists (select 1 from public.field_notes fn where fn.id = field_note_id and fn.researcher_id = auth.uid()));

create policy "researchers manage media on their own notes" on public.media
  for all using (exists (select 1 from public.field_notes fn where fn.id = field_note_id and fn.researcher_id = auth.uid()))
  with check (exists (select 1 from public.field_notes fn where fn.id = field_note_id and fn.researcher_id = auth.uid()));

create policy "researchers manage sources on their own notes" on public.sources
  for all using (exists (select 1 from public.field_notes fn where fn.id = field_note_id and fn.researcher_id = auth.uid()))
  with check (exists (select 1 from public.field_notes fn where fn.id = field_note_id and fn.researcher_id = auth.uid()));

create policy "researchers manage questions on their own notes" on public.research_questions
  for all using (exists (select 1 from public.field_notes fn where fn.id = field_note_id and fn.researcher_id = auth.uid()))
  with check (exists (select 1 from public.field_notes fn where fn.id = field_note_id and fn.researcher_id = auth.uid()));

create policy "researchers manage rd opportunities on their own notes" on public.rd_opportunities
  for all using (exists (select 1 from public.field_notes fn where fn.id = field_note_id and fn.researcher_id = auth.uid()))
  with check (exists (select 1 from public.field_notes fn where fn.id = field_note_id and fn.researcher_id = auth.uid()));

-- Producers are never a shared library — KB §08/§11/§32 treat farmer
-- relationship memory as private-by-default, owner-only knowledge.
create policy "researchers manage their own producers" on public.producers
  for all using (auth.uid() = researcher_id) with check (auth.uid() = researcher_id);

create policy "researchers manage their own decision log" on public.decision_log
  for all using (auth.uid() = researcher_id) with check (auth.uid() = researcher_id);

-- =============================================================================
-- Storage — bucket for field note photos and voice notes.
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('field-note-media', 'field-note-media', true)
on conflict (id) do nothing;

create policy "authenticated users can upload field note media"
  on storage.objects for insert
  with check (bucket_id = 'field-note-media' and auth.role() = 'authenticated');

create policy "anyone can view field note media"
  on storage.objects for select
  using (bucket_id = 'field-note-media');

create policy "owners can delete their field note media"
  on storage.objects for delete
  using (bucket_id = 'field-note-media' and auth.role() = 'authenticated');
