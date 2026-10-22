-- "What should NovUM fight for next?" — the student priorities poll on the home page.
-- Run in Supabase: SQL Editor -> New query -> paste ALL of this -> Run. Safe to run again.
--
-- Votes are anonymous: only the chosen pillar (or "something else"), an optional faculty and an
-- optional short explanation are stored. Visitors can add a vote and see the totals per pillar,
-- but can never read individual votes or the written explanations; only admins can.
-- To start a new poll (e.g. each academic year), use "Reset poll" in the admin page.

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

-- Check: should list the five pillars and "Something else", each with a vote count.
select * from priority_results();
