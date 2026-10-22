-- Board profiles: where they are from, what and which year they study, why they joined, and interests.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run again.
-- After this, the details can be edited in the admin page (Board -> click a person).

alter table people add column if not exists hometown text not null default '',
  add column if not exists study_year text not null default '',
  add column if not exists why_novum text not null default '',
  add column if not exists interests text not null default '';

update people set hometown = 'Hamburg, Germany', study = 'Economics and Business Economics', study_year = '2nd year', why_novum = 'To have an impact at UM and deepen my political skills.', interests = 'Politics, dancing, teaching, travelling'
  where kind = 'board' and name = 'Laurenz Schmidt';
update people set hometown = 'Paris, France', study = 'European Studies', study_year = '2nd year', why_novum = 'To promote the international side of student life in Maastricht.', interests = 'Sport, reading, international affairs'
  where kind = 'board' and name = 'Ernest Fleurot';
update people set hometown = 'Athens, Greece', study = 'European Law', study_year = '2nd year', why_novum = 'To champion student interests.', interests = 'Reading, movies, debate'
  where kind = 'board' and name = 'Chrysi Dimoragka';
update people set hometown = 'Colorado, USA', study = 'Maastricht Science Programme', study_year = '2nd year', why_novum = 'To help advocate for student rights at UM.', interests = 'Climbing, crochet, side quests'
  where kind = 'board' and name = 'Max Thompson';
update people set hometown = 'Germany', study = 'Data Science and AI', study_year = '2nd year', why_novum = 'To get involved and meet new people.', interests = 'Gym, music, travelling'
  where kind = 'board' and name = 'Céline Reintjes';
update people set hometown = 'Spain', study = 'European Studies', study_year = '2nd year', why_novum = 'I like politics and getting involved, to make a change.', interests = 'Reading and writing, hiking and nature, being a freak ;)'
  where kind = 'board' and name = 'Maialan Iglesias-Alfageme';

notify pgrst, 'reload schema';

-- Check: six rows with details
select name, hometown, study, study_year from people where kind = 'board' order by sort;
