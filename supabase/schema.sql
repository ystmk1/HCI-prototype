-- Dynamic few-shot prompt pool for the AI driving assistant.
-- Run this in the Supabase SQL Editor (https://app.supabase.com → SQL).

create table if not exists public.prompt_examples (
  id              uuid primary key default gen_random_uuid(),
  scenario_id     text not null,
  target_affect   text,
  user_input      text not null,
  ideal_response  text not null,
  actual_response text,
  approved        boolean not null default true,
  quality         smallint,            -- optional 1–5 operator rating
  created_at      timestamptz not null default now()
);

-- Fast lookup for the runtime few-shot fetch (approved examples per scenario).
create index if not exists prompt_examples_scenario_approved_idx
  on public.prompt_examples (scenario_id, approved, created_at desc);

-- Row Level Security: the client uses the public (anon/publishable) key, so lock
-- down what it can do. This prototype allows the anon role to read approved rows
-- and insert new examples. Tighten further (e.g. require auth) for production.
alter table public.prompt_examples enable row level security;

drop policy if exists "read approved examples" on public.prompt_examples;
create policy "read approved examples"
  on public.prompt_examples
  for select
  using (approved = true);

drop policy if exists "insert examples" on public.prompt_examples;
create policy "insert examples"
  on public.prompt_examples
  for insert
  with check (true);
