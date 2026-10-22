-- Editable texts for the website, such as the privacy statement (Admin page -> Privacy statement).
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run again.
-- Until a text is saved here, the website shows its built-in version.

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

-- Check: an empty result means no text has been edited yet (the website uses its built-in version).
select slug, updated_at, updated_by from site_texts;
