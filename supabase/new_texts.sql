-- New wording for pillars, achievements and board bios, so no text is copied from the old website.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run again.
-- Only rows with these exact titles/names are changed; anything you added yourself stays as it is.

update pillars set summary = 'Teaching that works for students: fair and clear rules on AI and exams, study materials you can afford, and the support you need to learn well.' where title = 'Education';
update pillars set summary = 'Keeping UM a university for students from everywhere: teaching in English, good translation and language help, and a place for Dutch and international students side by side.' where title = 'Internationalism';
update pillars set summary = 'A campus where everyone feels safe and supported, with attention for mental health, sexual safety, and students with visible or invisible disabilities.' where title = 'Wellbeing';
update pillars set summary = 'A safe, affordable room for every student: quick fixes for the September rush, decent living conditions, and long-term plans together with the municipality.' where title = 'Housing';
update pillars set summary = 'A university that takes the climate seriously: reaching carbon neutrality, greener day-to-day operations, and honest choices about who UM works with and invests in.' where title = 'Sustainability';

update achievements set description = 'Gave input on UM’s rules for generative AI in teaching and exams, aiming for rules that are clear and workable for students.' where title = 'AI policy in education';
update achievements set description = 'Pushed faculties to make books and readers cheaper and easier to get.' where title = 'Cheaper study materials';
update achievements set description = 'Raised the quality of teaching in science and engineering programmes in the FSE council.' where title = 'Better STEM teaching';
update achievements set description = 'Keeps standing up for English-taught programmes at UM.' where title = 'English-speaking education';
update achievements set description = 'Voted for a framework that checks UM’s international partners on human rights.' where title = 'Human rights in partnerships';
update achievements set description = 'Asked for better translation in FHML council meetings, so every student can follow and take part.' where title = 'Translation in the FHML council';
update achievements set description = 'Asked for more ways to learn Dutch, and for UM to stay international if it merges parts of its administration with MUMC+.' where title = 'Dutch lessons, international UM';
update achievements set description = 'Secured an extra €16,000 in the budget for social safety.' where title = '€16,000 more for social safety';
update achievements set description = 'Started a working group that looks at how safe students are within fraternities and student associations.' where title = 'Social safety working group';
update achievements set description = 'Teamed up with Green Dot so members and councillors can follow training on sexual safety.' where title = 'Sexual safety training';
update achievements set description = 'Helped shape UM’s disability policy for students and staff, from exam arrangements to support for invisible disabilities.' where title = 'Disability policy';
update achievements set description = 'Looked for temporary places to live for students arriving at the start of the year without a room.' where title = 'Short-term housing';
update achievements set description = 'Made the case for a dedicated student housing corporation in Maastricht and Heerlen.' where title = 'A student housing corporation';
update achievements set description = 'Teamed up with members of the municipal council on safer streets, better living conditions and the housing shortage.' where title = 'With the municipality';
update achievements set description = 'Pushed to turn Randwyck into a real campus with its own student life.' where title = 'Campus life in Randwyck';
update achievements set description = 'Supported UM’s goal to be carbon neutral by 2030, with €26 million set aside for it over ten years.' where title = 'Carbon neutral by 2030';
update achievements set description = 'Gave input on the rules that end research collaborations between UM and fossil-fuel companies, including their subsidiaries.' where title = 'Fossil-free research';
update achievements set description = 'Pushed for a switch to a new caterer for better and cheaper food on campus.' where title = 'Better, cheaper catering';

update people set bio = 'Leads the board’s strategic direction and represents NovUM across campus.' where kind = 'board' and name = 'Laurenz Schmidt';
update people set bio = 'Looks after the budget, responsible spending and campaign planning.' where kind = 'board' and name = 'Ernest Fleurot';
update people set bio = 'Organises events and coordinates the teams.' where kind = 'board' and name = 'Chrysi Dimoragka';
update people set bio = 'Runs internal operations, planning and communication between teams.' where kind = 'board' and name = 'Max Thompson';
update people set bio = 'Shapes messaging, campaign content and member communications.' where kind = 'board' and name = 'Céline Reintjes';
update people set bio = 'Coordinates outreach and partnerships with societies and councils.' where kind = 'board' and name = 'Maialan Iglesias-Alfageme';

-- Check
select title, left(summary, 60) from pillars order by sort;
