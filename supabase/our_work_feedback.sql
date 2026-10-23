-- Our work: feedback round October 2026 (new and rewritten achievements).
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run again.

-- the live achievements table was created before achievements could belong to a council:
-- add that field (needed for "Work in your faculty" and the admin's Council field)
alter table achievements add column if not exists council_id text references councils(id) on delete set null;

-- rewritten achievements (matched by their old title)
update achievements set title = 'English translation in the FHML council', description = 'Requested English translation in the FHML council, so every student representative can contribute equally.' where title = 'Translation in the FHML council';
update achievements set title = 'Free Dutch lessons, international UM', description = 'Pushed for policies that aim to give all students free Dutch lessons up to B2 level, while standing up for UM’s international identity.' where title = 'Dutch lessons, international UM';
update achievements set title = 'Code of conduct working groups', description = 'Our University Council councillors are part of working groups that help develop the code of conduct for student associations, to safeguard social and sexual safety at UM.' where title = 'Social safety working group';

-- new achievements under Education (only added if not there yet)
insert into achievements (pillar_id, council_id, title, description, sort)
select p.id, v.council_id, v.title, v.description, v.sort from (values
  ('No to the UM–MUMC+ merger', 'uc', 'In 2026 the University Council voted against the proposed merger of UM and MUMC+, because it would not put the quality of education first for every faculty, its students and its academic and support staff.', 0),
  ('Stronger student representation', null, 'Pushing for better feedback structures and stronger student representation at every level, for example by connecting councillors through councillors’ assemblies and getting faculty councillors and programme committees (EPCs) to work together.', 1)
) as v(title, council_id, description, sort)
join pillars p on p.title = 'Education'
where not exists (select 1 from achievements a where a.title = v.title);

-- which council each built-in achievement belongs to (only fills in empty ones)
update achievements set council_id = 'uc' where title = 'AI policy in education' and council_id is null;
update achievements set council_id = 'uc' where title = 'Cheaper study materials' and council_id is null;
update achievements set council_id = 'uc' where title = 'No to the UM–MUMC+ merger' and council_id is null;
update achievements set council_id = 'fse' where title = 'Better STEM teaching' and council_id is null;
update achievements set council_id = 'uc' where title = 'English-speaking education' and council_id is null;
update achievements set council_id = 'uc' where title = 'Human rights in partnerships' and council_id is null;
update achievements set council_id = 'fhml' where title = 'English translation in the FHML council' and council_id is null;
update achievements set council_id = 'uc' where title = 'Free Dutch lessons, international UM' and council_id is null;
update achievements set council_id = 'uc' where title = '€16,000 more for social safety' and council_id is null;
update achievements set council_id = 'uc' where title = 'Code of conduct working groups' and council_id is null;
update achievements set council_id = 'uc' where title = 'Disability policy' and council_id is null;
update achievements set council_id = 'uc' where title = 'Campus life in Randwyck' and council_id is null;
update achievements set council_id = 'uc' where title = 'Carbon neutral by 2030' and council_id is null;
update achievements set council_id = 'uc' where title = 'Fossil-free research' and council_id is null;
update achievements set council_id = 'uc' where title = 'Better, cheaper catering' and council_id is null;

notify pgrst, 'reload schema';

-- Check
select p.title as pillar, a.title from achievements a join pillars p on p.id = a.pillar_id order by p.sort, a.sort;
