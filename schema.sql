-- =====================================================================
-- Pineta Tennis & Padel - schema database di produzione (PostgreSQL / Supabase)
-- Include: tabelle, vincolo anti doppia prenotazione, funzioni, sicurezza (RLS),
-- dati iniziali. Eseguire per intero nell'SQL Editor di Supabase.
-- Richiede lo schema "auth" di Supabase (auth.users, auth.uid()).
-- =====================================================================

-- ---------- tipi ----------
create type sport_t          as enum ('tennis', 'padel');
create type pay_method_t     as enum ('circolo', 'online', 'bank');
create type booking_status_t as enum ('al_circolo', 'da_pagare', 'in_verifica', 'pagata', 'annullata');
create type enroll_status_t  as enum ('richiesta', 'da_pagare', 'in_verifica', 'confermata', 'annullata');
create type event_cat_t      as enum ('Tennis', 'Padel', 'Sociale');

-- ---------- impostazioni del circolo (una sola riga) ----------
create table club_settings (
  id              int primary key default 1 check (id = 1),
  name            text not null,
  legal_name      text,
  tax_code        text,
  address         text,
  phone           text,
  email           text,
  hold_online_min int  not null default 30,
  hold_bank_hours int  not null default 12,
  enroll_fee      numeric(8,2) not null default 30,
  cancel_hours    int  not null default 24,
  bank_holder     text,
  bank_iban       text,
  bank_name       text,
  payment_links   jsonb not null default '[]'::jsonb   -- [{"id":"card","label":"Carta","url":"https://..."}]
);

-- ---------- personale di segreteria (accede con credenziali Supabase Auth) ----------
create table staff (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role         text not null default 'segreteria' check (role in ('segreteria', 'admin')),
  created_at   timestamptz not null default now()
);

create function is_staff() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from staff where user_id = auth.uid()) $$;

-- ---------- campi ----------
create table courts (
  id         text primary key,
  sport      sport_t not null,
  name       text not null,
  surface    text not null,
  covered    boolean not null default false,
  price_hour numeric(8,2) not null check (price_hour >= 0),
  active     boolean not null default true,
  sort_order int not null default 0
);

-- ---------- prenotazioni ----------
create table bookings (
  id             uuid primary key default gen_random_uuid(),
  ref            text not null unique,
  court_id       text not null references courts(id),
  slot_start     timestamptz not null,
  user_id        uuid not null references auth.users(id),
  customer_name  text not null check (length(trim(customer_name)) > 1),
  customer_email text,
  customer_phone text,
  pay_method     pay_method_t not null,
  status         booking_status_t not null,
  amount         numeric(8,2) not null check (amount >= 0),
  hold_until     timestamptz,
  paid_at        timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (date_trunc('hour', slot_start) = slot_start)
);
-- Un campo non puo' avere due prenotazioni attive nello stesso slot.
create unique index bookings_one_active_per_slot on bookings (court_id, slot_start) where status <> 'annullata';
create index bookings_user_idx on bookings (user_id, slot_start);

-- ---------- istruttori ----------
create table instructors (
  id             text primary key,
  name           text not null,
  role           text not null,
  short_bio      text,
  bio            text[] not null default '{}',
  qualifications text[] not null default '{}',
  specialties    text[] not null default '{}',
  years          int,
  photo_path     text,          -- percorso nel bucket "photos"; se vuoto il sito mostra le iniziali
  active         boolean not null default true,
  sort_order     int not null default 0
);

-- ---------- blocchi dei campi (prenotazioni telefoniche, tornei, manutenzione) ----------
create table court_blocks (
  id         uuid primary key default gen_random_uuid(),
  court_id   text references courts(id),      -- null = tutti i campi
  start_at   timestamptz not null,
  end_at     timestamptz not null,
  reason     text,                            -- visibile solo alla segreteria
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (end_at > start_at),
  check (date_trunc('hour', start_at) = start_at and date_trunc('hour', end_at) = end_at)
);
create index court_blocks_idx on court_blocks (court_id, start_at);

-- ---------- corsi e iscrizioni ----------
create table courses (
  id         text primary key,
  sport      sport_t not null,
  name       text not null,
  level      text not null,
  age_label  text not null,
  age_min    int not null default 0,
  age_max    int not null default 99,
  days       text not null,
  time_label text not null,
  lessons    int  not null check (lessons > 0),
  group_size text,
  coach      text,
  instructor_id text references instructors(id),
  starts_on  text,
  price      numeric(8,2) not null check (price >= 0),
  description text,
  active     boolean not null default true,
  sort_order int not null default 0
);

create table enrollments (
  id               uuid primary key default gen_random_uuid(),
  ref              text not null unique,
  course_id        text not null references courses(id),
  user_id          uuid not null references auth.users(id),
  participant_name text not null,
  birth_date       date not null,
  guardian_name    text,
  email            text not null,
  phone            text not null,
  pay_method       pay_method_t not null,
  amount           numeric(8,2) not null,
  status           enroll_status_t not null,
  medical_cert_ok  boolean not null default false,
  consent_at       timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index enrollments_user_idx on enrollments (user_id);

-- ---------- eventi ----------
create table events (
  id          text primary key,
  event_date  date not null,
  starts_at   text,
  category    event_cat_t not null,
  title       text not null,
  summary     text not null,
  description text[] not null default '{}',
  place       text,
  price_label text,
  signup_info text,
  poster_path text,             -- percorso nel bucket "posters"; se vuoto il sito genera la locandina
  published   boolean not null default true
);

-- ---------- pagamenti registrati dalla segreteria ----------
create table payments (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid references bookings(id),
  enrollment_id uuid references enrollments(id),
  amount        numeric(8,2) not null check (amount > 0),
  method        pay_method_t not null,
  received_at   timestamptz not null default now(),
  recorded_by   uuid references auth.users(id),
  note          text,
  check (num_nonnulls(booking_id, enrollment_id) = 1)
);

-- ---------- aggiornamento automatico di updated_at ----------
create function touch_updated_at() returns trigger language plpgsql as
$$ begin new.updated_at := now(); return new; end $$;
create trigger bookings_touch    before update on bookings    for each row execute function touch_updated_at();
create trigger enrollments_touch before update on enrollments for each row execute function touch_updated_at();

-- ---------- disponibilita' pubblica: solo campo e orario, nessun dato personale ----------
create view slot_occupancy as
  select court_id, slot_start
  from bookings
  where status <> 'annullata'
    and not (status = 'da_pagare' and hold_until < now())
  union
  select c.id as court_id, g.slot as slot_start
  from court_blocks b
  join courts c on c.active and (b.court_id is null or b.court_id = c.id)
  cross join lateral generate_series(b.start_at, b.end_at - interval '1 second', interval '1 hour') as g(slot);

-- ---------- funzioni usate dal sito ----------
create function release_expired_holds() returns int
language sql security definer set search_path = public as
$$ with r as (
     update bookings set status = 'annullata'
     where status = 'da_pagare' and hold_until < now() returning 1)
   select count(*)::int from r $$;

create function book_slot(p_court text, p_slot timestamptz, p_name text, p_email text, p_phone text, p_method pay_method_t)
returns bookings
language plpgsql security definer set search_path = public as
$$
declare
  c courts; s club_settings; b bookings; v_hold timestamptz; v_status booking_status_t;
begin
  if auth.uid() is null then raise exception 'login_required'; end if;
  select * into c from courts where id = p_court and active;
  if not found then raise exception 'court_not_found'; end if;
  if p_slot <= now() then raise exception 'slot_in_past'; end if;
  select * into s from club_settings where id = 1;
  perform release_expired_holds();
  if exists (select 1 from court_blocks cb
             where (cb.court_id is null or cb.court_id = p_court) and p_slot >= cb.start_at and p_slot < cb.end_at) then
    raise exception 'slot_blocked';
  end if;
  if p_method = 'circolo' then v_status := 'al_circolo'; v_hold := null;
  else
    v_status := 'da_pagare';
    v_hold := least(now() + case when p_method = 'bank' then make_interval(hours => s.hold_bank_hours)
                                 else make_interval(mins => s.hold_online_min) end, p_slot);
  end if;
  begin
    insert into bookings (ref, court_id, slot_start, user_id, customer_name, customer_email, customer_phone, pay_method, status, amount, hold_until)
    values ('PTP-' || upper(substr(md5(gen_random_uuid()::text), 1, 5)), p_court, p_slot, auth.uid(), trim(p_name), p_email, p_phone, p_method, v_status, c.price_hour, v_hold)
    returning * into b;
  exception when unique_violation then
    raise exception 'slot_taken';
  end;
  return b;
end $$;

create function declare_booking_payment(p_ref text) returns void
language plpgsql security definer set search_path = public as
$$
begin
  update bookings set status = 'in_verifica'
  where ref = p_ref and user_id = auth.uid() and status = 'da_pagare';
  if not found then raise exception 'not_allowed'; end if;
end $$;

create function cancel_booking(p_ref text) returns void
language plpgsql security definer set search_path = public as
$$
declare s club_settings;
begin
  select * into s from club_settings where id = 1;
  update bookings set status = 'annullata'
  where ref = p_ref and status <> 'annullata' and status <> 'pagata'
    and (is_staff() or (user_id = auth.uid() and slot_start - now() >= make_interval(hours => s.cancel_hours)));
  if not found then raise exception 'not_allowed'; end if;
end $$;

create function enroll(p_course text, p_name text, p_birth date, p_guardian text, p_email text, p_phone text, p_method pay_method_t)
returns enrollments
language plpgsql security definer set search_path = public as
$$
declare c courses; s club_settings; e enrollments;
begin
  if auth.uid() is null then raise exception 'login_required'; end if;
  select * into c from courses where id = p_course and active;
  if not found then raise exception 'course_not_found'; end if;
  select * into s from club_settings where id = 1;
  insert into enrollments (ref, course_id, user_id, participant_name, birth_date, guardian_name, email, phone, pay_method, amount, status)
  values ('PTP-' || upper(substr(md5(gen_random_uuid()::text), 1, 5)), p_course, auth.uid(), trim(p_name), p_birth, nullif(trim(p_guardian), ''),
          trim(p_email), trim(p_phone), p_method, c.price + s.enroll_fee,
          case when p_method = 'circolo' then 'richiesta' else 'da_pagare' end::enroll_status_t)
  returning * into e;
  return e;
end $$;

create function declare_enrollment_payment(p_ref text) returns void
language plpgsql security definer set search_path = public as
$$
begin
  update enrollments set status = 'in_verifica'
  where ref = p_ref and user_id = auth.uid() and status = 'da_pagare';
  if not found then raise exception 'not_allowed'; end if;
end $$;

-- Segreteria: conferma un pagamento dopo averlo trovato sul conto
create function confirm_booking_payment(p_ref text) returns void
language plpgsql security definer set search_path = public as
$$
declare b bookings;
begin
  if not is_staff() then raise exception 'not_allowed'; end if;
  update bookings set status = 'pagata', paid_at = now() where ref = p_ref and status <> 'annullata' returning * into b;
  if not found then raise exception 'not_found'; end if;
  insert into payments (booking_id, amount, method, recorded_by) values (b.id, b.amount, b.pay_method, auth.uid());
end $$;

create function confirm_enrollment(p_ref text, p_certificate boolean default false) returns void
language plpgsql security definer set search_path = public as
$$
declare e enrollments;
begin
  if not is_staff() then raise exception 'not_allowed'; end if;
  update enrollments set status = 'confermata', medical_cert_ok = medical_cert_ok or p_certificate
  where ref = p_ref and status <> 'annullata' returning * into e;
  if not found then raise exception 'not_found'; end if;
  if e.pay_method <> 'circolo' or e.status = 'confermata' then
    insert into payments (enrollment_id, amount, method, recorded_by) values (e.id, e.amount, e.pay_method, auth.uid());
  end if;
end $$;

-- ---------- sicurezza a livello di riga (RLS) ----------
alter table club_settings enable row level security;
alter table staff         enable row level security;
alter table courts        enable row level security;
alter table bookings      enable row level security;
alter table courses       enable row level security;
alter table enrollments   enable row level security;
alter table events        enable row level security;
alter table payments      enable row level security;
alter table court_blocks  enable row level security;
alter table instructors   enable row level security;

-- impostazioni: lettura pubblica solo delle colonne non sensibili tramite vista; scrittura solo staff
create view club_public as
  select name, legal_name, address, phone, email, hold_online_min, hold_bank_hours, enroll_fee, cancel_hours, bank_holder, bank_iban, bank_name, payment_links
  from club_settings where id = 1;
create policy settings_staff on club_settings for all using (is_staff()) with check (is_staff());

create policy staff_self_read on staff for select using (user_id = auth.uid() or is_staff());
create policy staff_admin_write on staff for all
  using (exists (select 1 from staff s where s.user_id = auth.uid() and s.role = 'admin'))
  with check (exists (select 1 from staff s where s.user_id = auth.uid() and s.role = 'admin'));

create policy courts_read    on courts  for select using (true);
create policy courts_staff   on courts  for all using (is_staff()) with check (is_staff());
create policy courses_read   on courses for select using (active or is_staff());
create policy courses_staff  on courses for all using (is_staff()) with check (is_staff());
create policy events_read    on events  for select using (published or is_staff());
create policy events_staff   on events  for all using (is_staff()) with check (is_staff());

-- prenotazioni e iscrizioni: ognuno vede le proprie, la segreteria tutte. Le scritture passano dalle funzioni.
create policy bookings_read    on bookings    for select using (user_id = auth.uid() or is_staff());
create policy bookings_staff   on bookings    for update using (is_staff()) with check (is_staff());
create policy enroll_read      on enrollments for select using (user_id = auth.uid() or is_staff());
create policy enroll_staff     on enrollments for update using (is_staff()) with check (is_staff());
create policy payments_staff   on payments    for all using (is_staff()) with check (is_staff());
create policy blocks_staff     on court_blocks for all using (is_staff()) with check (is_staff());
create policy instr_read       on instructors for select using (active or is_staff());
create policy instr_staff      on instructors for all using (is_staff()) with check (is_staff());

-- ---------- permessi ----------
revoke all on all tables in schema public from anon, authenticated;
grant select on courts, courses, events, instructors, slot_occupancy, club_public to anon, authenticated;
grant select on bookings, enrollments, staff to authenticated;
grant insert, update, delete on courts, courses, events, instructors, court_blocks, club_settings, payments to authenticated;  -- limitati dalle policy: solo staff
grant select on club_settings, payments, court_blocks to authenticated;
grant update on bookings, enrollments to authenticated;                                            -- limitato dalle policy: solo staff
grant insert, update, delete on staff to authenticated;                                            -- limitato dalle policy: solo admin
revoke all on function release_expired_holds() from public, anon, authenticated;
revoke all on function book_slot(text, timestamptz, text, text, text, pay_method_t) from public, anon;
revoke all on function enroll(text, text, date, text, text, text, pay_method_t) from public, anon;
revoke all on function declare_booking_payment(text), declare_enrollment_payment(text), cancel_booking(text),
       confirm_booking_payment(text), confirm_enrollment(text, boolean) from public, anon;
grant execute on function book_slot(text, timestamptz, text, text, text, pay_method_t) to authenticated;
grant execute on function enroll(text, text, date, text, text, text, pay_method_t) to authenticated;
grant execute on function declare_booking_payment(text), declare_enrollment_payment(text), cancel_booking(text),
      confirm_booking_payment(text), confirm_enrollment(text, boolean), is_staff() to authenticated;

-- ---------- archiviazione locandine (solo Supabase) ----------
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public) values ('posters', 'posters', true) on conflict (id) do nothing;
    create policy posters_staff_write on storage.objects for all to authenticated
      using (bucket_id = 'posters' and public.is_staff()) with check (bucket_id = 'posters' and public.is_staff());
    insert into storage.buckets (id, name, public) values ('photos', 'photos', true) on conflict (id) do nothing;
    create policy photos_staff_write on storage.objects for all to authenticated
      using (bucket_id = 'photos' and public.is_staff()) with check (bucket_id = 'photos' and public.is_staff());
  end if;
end $$;
