-- Scheda Home Gym: schema del database per Supabase (PostgreSQL).
-- Esegui questo file nel SQL Editor di Supabase, poi esegui seed.sql.

-- ============ Catalogo (lettura pubblica) ============
create table if not exists public.exercises (
  id           text primary key,
  name         text not null,
  muscle_group text,
  kind         text not null check (kind in ('load', 'time', 'bw'))
);

-- Gruppi muscolari (aggiunti in un secondo momento: sicuro anche se la tabella esiste già)
alter table public.exercises add column if not exists main_muscles text[] not null default '{}';
alter table public.exercises add column if not exists also_muscles text[] not null default '{}';

create table if not exists public.plan_days (
  key       text primary key,
  title     text not null,
  focus     text,
  weekday   text,
  sort      int  not null
);

create table if not exists public.plan_exercises (
  day_key      text not null references public.plan_days (key) on delete cascade,
  exercise_id  text not null references public.exercises (id) on delete cascade,
  position     int  not null,
  sets         int  not null,
  reps         text not null,
  rest_seconds int  not null,
  primary key (day_key, exercise_id)
);

-- ============ Dati dell'utente ============
create table if not exists public.workout_sessions (
  id          uuid primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plan_day    text not null references public.plan_days (key),
  started_at  timestamptz not null,
  ended_at    timestamptz,
  notes       text,
  knee_pain   smallint check (knee_pain between 0 and 10),
  updated_at  timestamptz not null default now()
);

create table if not exists public.set_logs (
  id           uuid primary key,
  session_id   uuid not null references public.workout_sessions (id) on delete cascade,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_id  text not null references public.exercises (id),
  set_no       int  not null,
  weight_kg    numeric(6, 2),
  reps         int,
  seconds      int,
  created_at   timestamptz not null default now()
);

create index if not exists workout_sessions_user_started_idx on public.workout_sessions (user_id, started_at desc);
create index if not exists set_logs_session_idx  on public.set_logs (session_id);
create index if not exists set_logs_user_ex_idx  on public.set_logs (user_id, exercise_id);

-- ============ Sicurezza (Row Level Security) ============
alter table public.exercises         enable row level security;
alter table public.plan_days         enable row level security;
alter table public.plan_exercises    enable row level security;
alter table public.workout_sessions  enable row level security;
alter table public.set_logs          enable row level security;

drop policy if exists "catalogo leggibile" on public.exercises;
drop policy if exists "catalogo leggibile" on public.plan_days;
drop policy if exists "catalogo leggibile" on public.plan_exercises;
create policy "catalogo leggibile" on public.exercises      for select using (true);
create policy "catalogo leggibile" on public.plan_days      for select using (true);
create policy "catalogo leggibile" on public.plan_exercises for select using (true);

drop policy if exists "sedute: solo proprietario" on public.workout_sessions;
create policy "sedute: solo proprietario" on public.workout_sessions
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "serie: solo proprietario" on public.set_logs;
create policy "serie: solo proprietario" on public.set_logs
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============ Vista per i progressi (rispetta la RLS dell'utente) ============
create or replace view public.exercise_progress with (security_invoker = true) as
select s.user_id,
       l.exercise_id,
       s.started_at::date                 as day,
       max(l.weight_kg)                   as top_weight_kg,
       max(l.reps)                        as top_reps,
       max(l.seconds)                     as top_seconds,
       sum(coalesce(l.weight_kg, 0) * coalesce(l.reps, 0)) as volume_kg
from public.set_logs l
join public.workout_sessions s on s.id = l.session_id
group by s.user_id, l.exercise_id, s.started_at::date;
