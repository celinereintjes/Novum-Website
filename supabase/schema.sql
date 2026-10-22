-- NovUM website backend
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Then run seed.sql for the starting content.
--
-- Visitors can read the published content and submit the two forms (membership and contact).
-- Board members listed in `admins` can sign in at /admin.html and edit everything.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- Admins: board members allowed to use the admin page.
-- 1. Authentication -> Users -> Add user (email + password)
-- 2. insert into admins (email) values ('their.email@example.com');
-- ---------------------------------------------------------------
create table if not exists admins (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where email = lower(auth.jwt() ->> 'email'));
$$;

-- ---------------------------------------------------------------
-- Content shown on the website
-- ---------------------------------------------------------------
create table if not exists councils (
  id text primary key,                 -- short code, e.g. 'uc', 'fasos'
  name text not null,
  short_name text not null,
  photo_url text,                      -- group photo of our councillors in this council
  sort int not null default 0
);
alter table councils add column if not exists photo_url text;

create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('board', 'councillor', 'alumni')),
  name text not null,
  role text not null default '',       -- board: position; councillor: seat; alumni: role they had
  period text not null default '',     -- e.g. '2024–25' (used for alumni)
  bio text not null default '',        -- alumni: what they do now
  photo_url text,
  council_id text references councils(id) on delete set null,  -- councillors only
  study text not null default '',
  hometown text not null default '',
  study_year text not null default '',
  why_novum text not null default '',
  interests text not null default '',
  sort int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists pillars (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null default '',
  image_url text,                      -- illustration, e.g. img/pillars/housing.svg
  sort int not null default 0
);
alter table pillars add column if not exists image_url text;

create table if not exists achievements (
  id uuid primary key default gen_random_uuid(),
  pillar_id uuid references pillars(id) on delete cascade,
  council_id text references councils(id) on delete set null,  -- also shown under that council
  title text not null,
  description text not null default '',
  sort int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Form submissions: visitors can only insert; admins read and manage them.
-- ---------------------------------------------------------------
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 200),
  faculty text not null default '' check (char_length(faculty) <= 80),
  programme text not null default '' check (char_length(programme) <= 120),
  study_year text not null default '' check (char_length(study_year) <= 40),
  interests text[] not null default '{}' check (cardinality(interests) <= 10),
  message text not null default '' check (char_length(message) <= 2000),
  status text not null default 'new' check (status in ('new', 'contacted', 'member', 'declined')),
  notes text not null default ''
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 200),
  topic text not null default 'General question' check (char_length(topic) <= 60),
  council text not null default '' check (char_length(council) <= 80),
  message text not null check (char_length(message) between 5 and 4000),
  status text not null default 'new' check (status in ('new', 'answered', 'closed')),
  notes text not null default ''
);

-- ---------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------
alter table admins enable row level security;
alter table councils enable row level security;
-- added later: board profile details (safe on existing databases)
alter table people add column if not exists hometown text not null default '',
  add column if not exists study_year text not null default '',
  add column if not exists why_novum text not null default '',
  add column if not exists interests text not null default '';

alter table people enable row level security;
alter table pillars enable row level security;
alter table achievements enable row level security;
alter table members enable row level security;
alter table messages enable row level security;

drop policy if exists "admins read admins" on admins;
create policy "admins read admins" on admins for select using (is_admin());

-- admins can do everything on every table except the admin list itself
do $$
declare t text;
begin
  foreach t in array array['councils','people','pillars','achievements','members','messages'] loop
    execute format('drop policy if exists "admin all %1$s" on %1$I', t);
    execute format('create policy "admin all %1$s" on %1$I for all to authenticated using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;

-- visitors: read content
drop policy if exists "public read councils" on councils;
create policy "public read councils" on councils for select using (true);
drop policy if exists "public read people" on people;
create policy "public read people" on people for select using (active);
drop policy if exists "public read pillars" on pillars;
create policy "public read pillars" on pillars for select using (true);
drop policy if exists "public read achievements" on achievements;
create policy "public read achievements" on achievements for select using (true);

-- visitors: submit the forms
-- Membership registrations go through the Google Form, so the website may no longer insert here.
drop policy if exists "public sign up" on members;

-- Spam brake for the contact form (each message is also emailed to the board):
-- at most 3 messages per email address per hour, and 30 messages in total per hour.
create or replace function limit_contact_messages() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from messages where lower(email) = lower(new.email) and created_at > now() - interval '1 hour') >= 3
     or (select count(*) from messages where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Too many messages, please try again later' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists limit_contact_messages on messages;
create trigger limit_contact_messages before insert on messages
  for each row execute function limit_contact_messages();
drop policy if exists "public contact" on messages;
create policy "public contact" on messages for insert to anon, authenticated
  with check (status = 'new' and notes = '');

-- ---------------------------------------------------------------
-- Image storage: public bucket "media"; only admins can upload or delete.
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "admin write media" on storage.objects;
create policy "admin write media" on storage.objects for insert to authenticated with check (bucket_id = 'media' and is_admin());
drop policy if exists "admin update media" on storage.objects;
create policy "admin update media" on storage.objects for update to authenticated using (bucket_id = 'media' and is_admin());
drop policy if exists "admin delete media" on storage.objects;
create policy "admin delete media" on storage.objects for delete to authenticated using (bucket_id = 'media' and is_admin());

-- ---------------------------------------------------------------
-- Student priorities poll (also in priority_poll.sql)
-- ---------------------------------------------------------------
create table if not exists priority_votes (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  pillar_id uuid references pillars(id) on delete cascade,   -- null = "something else"
  faculty text not null default '',
  detail text not null default ''                            -- "what exactly?", optional
);

-- bring an older version of the table up to date
alter table priority_votes add column if not exists detail text not null default '';
alter table priority_votes alter column pillar_id drop not null;
alter table priority_votes drop constraint if exists priority_votes_faculty_check;
alter table priority_votes add constraint priority_votes_faculty_check check (char_length(faculty) <= 20);
alter table priority_votes drop constraint if exists priority_votes_detail_check;
alter table priority_votes add constraint priority_votes_detail_check check (char_length(detail) <= 280);
alter table priority_votes drop constraint if exists priority_votes_choice_check;
alter table priority_votes add constraint priority_votes_choice_check check (pillar_id is not null or char_length(btrim(detail)) >= 3);

alter table priority_votes enable row level security;

drop policy if exists "public vote" on priority_votes;
create policy "public vote" on priority_votes for insert to anon, authenticated with check (true);
drop policy if exists "admin manage votes" on priority_votes;
create policy "admin manage votes" on priority_votes for all to authenticated using (is_admin()) with check (is_admin());

-- Spam brake: at most 300 votes per hour in total.
create or replace function limit_priority_votes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from priority_votes where created_at > now() - interval '1 hour') >= 300 then
    raise exception 'Too many votes right now, please try again later' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists limit_priority_votes on priority_votes;
create trigger limit_priority_votes before insert on priority_votes
  for each row execute function limit_priority_votes();

-- Totals per pillar plus "Something else", for everyone. No individual votes or texts are exposed.
drop function if exists priority_results();
create function priority_results()
returns table (pillar_id uuid, title text, votes bigint)
language sql stable security definer set search_path = public as $$
  select * from (
    select p.id, p.title, count(v.id)
    from pillars p left join priority_votes v on v.pillar_id = p.id
    group by p.id, p.title, p.sort
    order by p.sort
  ) per_pillar
  union all
  select null::uuid, 'Something else', count(*) from priority_votes where pillar_id is null;
$$;
revoke all on function priority_results() from public;
grant execute on function priority_results() to anon, authenticated;

-- make the new table and function visible to the website straight away
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------
-- Editable website texts (also in site_texts.sql)
-- ---------------------------------------------------------------
create table if not exists site_texts (
  slug text primary key,                         -- e.g. 'privacy'
  body text not null check (char_length(body) <= 60000),
  updated_at timestamptz not null default now(),
  updated_by text not null default ''
);

alter table site_texts enable row level security;

drop policy if exists "public read site texts" on site_texts;
create policy "public read site texts" on site_texts for select using (true);
drop policy if exists "admin all site texts" on site_texts;
create policy "admin all site texts" on site_texts for all to authenticated using (is_admin()) with check (is_admin());

-- keep updated_at and updated_by right on every save
create or replace function touch_site_text() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(lower(auth.jwt() ->> 'email'), '');
  return new;
end $$;
drop trigger if exists touch_site_text on site_texts;
create trigger touch_site_text before insert or update on site_texts
  for each row execute function touch_site_text();

notify pgrst, 'reload schema';
