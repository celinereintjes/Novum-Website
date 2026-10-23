-- Lets the admin page add the advisory council and the confidential person (shown below the board on the Board page).
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run again.
-- After this: Admin page -> Board -> "Add advisory member" / "Add confidential person".

alter table people add column if not exists email text not null default '';
alter table people drop constraint if exists people_kind_check;
alter table people add constraint people_kind_check check (kind in ('board', 'councillor', 'alumni', 'advisory', 'confidential'));

-- The 2026/27 advisory council and confidential person. Only added if they aren't there yet.
insert into people (kind, name, role, photo_url, email, sort)
select v.kind, v.name, v.role, v.photo_url, v.email, v.sort from (values
  ('advisory', 'Karina Meyer', 'Former President 2025–26', 'img/advisor/karinameyer.jpg', '', 1),
  ('advisory', 'Rieke Eschen', 'Former Vice-President & Head of Events 2025–26', 'img/advisor/riekeeschen.jpg', '', 2),
  ('confidential', 'Rocío Megías Pellejero', 'Confidential person', 'img/advisor/rocio.jpg', 'r.megiaspellejero@student.maastrichtuniversity.nl', 1)
) as v(kind, name, role, photo_url, email, sort)
where not exists (select 1 from people p where p.kind = v.kind and p.name = v.name);

notify pgrst, 'reload schema';

-- Check: should list board, councillor and (once added) advisory / confidential
select kind, count(*) from people group by kind order by kind;
