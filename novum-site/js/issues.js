// Content for "Who can fix this?" on the Councils page.
// Each issue: what it is, who to go to (in order), what NovUM can do, and how the contact form is pre-filled.
// Keep this general and check it each year: exact procedures differ per faculty and can change.
// `topic` must match an option in the contact form (pages/contact.html).
window.NOVUM_ISSUES = [
  {
    id: 'grade', title: 'A grade or exam that seems unfair', faculty: true, topic: 'An issue in my faculty',
    steps: [
      ['Your examiner or course coordinator', 'Ask for an explanation of your grade and to inspect your exam. Many problems are solved here.'],
      ['The Board of Examiners of your programme', 'Decides on exam rules, extra attempts, exemptions and complaints about how an exam was held.'],
      ['The Examination Appeals Board (CBE)', 'For a formal appeal against a decision by an examiner or the Board of Examiners. Mind the deadline: usually six weeks.']
    ],
    novum: 'If the problem is structural, such as unclear exam rules, bad scheduling or the same issue for many students, our councillors can raise it in your faculty council.'
  },
  {
    id: 'course', title: 'A course or programme that isn’t working well', faculty: true, topic: 'An issue in my faculty',
    steps: [
      ['Your tutor and course coordinator', 'Give feedback directly, and fill in the course evaluation: it is read.'],
      ['The programme committee', 'Students and staff who advise on the quality of your programme and look at evaluations every block.'],
      ['Your faculty council', 'For faculty-wide decisions: education rules, budget, facilities and policy.']
    ],
    novum: 'Our faculty councillors take students’ experiences to the faculty council and follow up until something changes.'
  },
  {
    id: 'policy', title: 'A university-wide decision', subtitle: 'Language policy, fees, AI rules, sustainability, budget', faculty: false, council: 'uc', topic: 'General question',
    steps: [
      ['The University Council', 'The UM-wide body with elected student and staff members. It advises the Executive Board and has to agree to many decisions.']
    ],
    novum: 'NovUM has councillors on the University Council. Tell them what you think: they bring student views into these decisions.'
  },
  {
    id: 'housing', title: 'A housing problem or a difficult landlord', faculty: false, council: 'uc', topic: 'Housing or student life',
    steps: [
      ['Your rental contract', 'Check what you agreed on, and keep messages with your landlord in writing.'],
      ['The Huurcommissie (Rent Tribunal)', 'Handles disputes about rent that is too high, service costs and maintenance. It is independent and cheap.'],
      ['Het Juridisch Loket', 'Free legal advice if you are not sure about your rights as a tenant.']
    ],
    novum: 'Housing is one of our five pillars: we work with the municipality on student housing. Your experience helps us make the case.'
  },
  {
    id: 'wellbeing', title: 'Stress, mental health or falling behind', faculty: true, topic: 'An issue in my faculty',
    steps: [
      ['Your study advisor', 'Helps with study planning, delays and personal circumstances that affect your studies.'],
      ['UM student wellbeing services', 'Student psychologists and wellbeing support for students who are struggling.'],
      ['In an emergency', 'Call 112. If you are thinking about suicide, call 113 or 0800-0113 (free, 24/7), or chat at 113.nl.']
    ],
    novum: 'Wellbeing is one of our pillars: we push for shorter waiting times and better support. Tell us what is missing.'
  },
  {
    id: 'safety', title: 'Harassment, discrimination or unsafe behaviour', faculty: false, council: 'uc', topic: 'General question',
    steps: [
      ['A UM confidential advisor', 'Listens in confidence and helps you think through your options. Nothing happens without your consent.'],
      ['A formal complaint', 'Through UM’s complaints procedure, if you want action to be taken.'],
      ['If you are in danger', 'Call 112. For non-urgent reports to the police, call 0900-8844.']
    ],
    novum: 'Social safety is a priority for us: we secured extra funding and set up a working group on safety in student associations.'
  },
  {
    id: 'money', title: 'Tuition fees, study finance or registration', faculty: false, council: 'uc', topic: 'General question',
    steps: [
      ['UM’s Student Services Centre', 'For registration, tuition fees and proof of enrolment.'],
      ['DUO', 'For Dutch student finance, loans and the public transport card.'],
      ['UM financial support', 'UM can support students who fall behind because of special circumstances such as illness. Ask your study advisor.']
    ],
    novum: 'If rules or costs are unfair for a group of students, our University Council councillors can raise it.'
  },
  {
    id: 'facilities', title: 'Study spaces, buildings, food or accessibility', faculty: true, topic: 'An issue in my faculty',
    steps: [
      ['The faculty office or facility services', 'Report broken facilities, accessibility problems or a lack of study spaces.'],
      ['Your faculty council or the University Council', 'For bigger changes: opening hours, study spaces, catering or accessibility across UM.']
    ],
    novum: 'We helped change UM’s caterer for better and cheaper food, and keep pushing for accessible campuses and enough study spaces.'
  },
  {
    id: 'other', title: 'Something else, or not sure', faculty: true, topic: 'Other',
    steps: [
      ['Ask NovUM', 'Describe the problem and we’ll tell you who can help, or take it up ourselves.']
    ],
    novum: 'Our councillors know how the university works. If no one else can help, we’ll try.'
  }
];
