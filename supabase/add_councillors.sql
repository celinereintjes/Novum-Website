
begin;
delete from people where kind = 'councillor';
insert into people (kind, name, role, council_id, sort) values
  ('councillor', 'Héloïse Henrard', 'Councillor', 'fasos', 1),
  ('councillor', 'Judith Michel', 'Councillor', 'fasos', 2),
  ('councillor', 'Rieke Eschen', 'Councillor', 'fasos', 3),
  ('councillor', 'Angela Chong', 'Councillor', 'fhml', 4),
  ('councillor', 'Lia Soraya Wallraff', 'Councillor', 'fhml', 5),
  ('councillor', 'Eliante Martha', 'Councillor', 'fpn', 6),
  ('councillor', 'Sofi Tirana', 'Councillor', 'fpn', 7),
  ('councillor', 'Claudia Magis', 'Councillor', 'fse', 8),
  ('councillor', 'Maryam Hammam', 'Councillor', 'fse', 9),
  ('councillor', 'Sophie Groll', 'Councillor', 'fse', 10),
  ('councillor', 'Tijn van Heesewijk', 'Councillor', 'fse', 11),
  ('councillor', 'Efe Satici', 'Councillor', 'law', 12),
  ('councillor', 'Olivia Nixon', 'Councillor', 'law', 13),
  ('councillor', 'Réka Nagy', 'Councillor', 'law', 14),
  ('councillor', 'Ahmet Eskici', 'Councillor', 'sbe', 15),
  ('councillor', 'Laurenz Schmidt', 'Councillor', 'sbe', 16),
  ('councillor', 'Ophélie Mazé', 'Councillor', 'sbe', 17),
  ('councillor', 'Matthieu Marienbach', 'Councillor', 'uc', 18),
  ('councillor', 'Rocío Megías Pellejero', 'Councillor', 'uc', 19),
  ('councillor', 'Roos Goorman', 'Councillor', 'uc', 20);
commit;

-- Check: should list 7 councils and 20 councillors in total.
select council_id, count(*) from people where kind = 'councillor' group by council_id order by council_id; 
