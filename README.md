# NovUM website

The website of NovUM, the student party at Maastricht University, with an admin page for the board.

- **Public pages:** About (`index.html`), Our work, Councils, Board, Contact, Become a member, Privacy
- **Admin page:** `admin.html`, not linked in the menu. Board members sign in there to read membership registrations and contact messages, and to edit the pillars, achievements, councillors, board, poll and privacy statement.
- **Backend:** [Supabase](https://supabase.com) (free plan), which provides the database, the sign-in and photo storage.

It is a plain static site with no build step for visitors, so it can be hosted anywhere (Netlify, Cloudflare Pages, GitHub Pages).

## Folder layout

```
novum-site/          the website: upload this folder to your host
  index.html …       public pages (generated, see "Changing page text")
  admin.html         the admin page
  css/  js/  img/
  js/config.js       Supabase URL and key go here
  js/data.js         built-in content, used until Supabase is connected
pages/               the text of each public page
supabase/
  schema.sql         tables, security rules, photo storage
  seed.sql           starting content (pillars, achievements, board, councils)
tools/
  build_pages.py     rebuilds the public pages from pages/
  make_seed.py       rebuilds seed.sql from js/data.js
```

## Setting up the backend (about 15 minutes, once)

1. **Create a project.** Sign up at supabase.com and create a new project (region: Frankfurt or another EU region). Save the database password somewhere safe.
2. **Create the tables.** Open *SQL Editor → New query*, paste all of `supabase/schema.sql`, and click *Run*. Then do the same with `supabase/seed.sql`.
3. **Connect the website.** Open *Project Settings → API*. Copy the *Project URL* and the *anon public* key into `novum-site/js/config.js`:
   ```js
   window.NOVUM_CONFIG = {
     supabaseUrl: 'https://xxxxxxxx.supabase.co',
     supabaseAnonKey: 'eyJhbGciOi…'
   };
   ```
   The anon key is meant to be public. The security rules in `schema.sql` make sure visitors can only read the published content and submit the two forms.
4. **Turn off public sign-ups.** In *Authentication → Providers → Email*, switch off *Allow new users to sign up*, so only the accounts you create can sign in.
5. **Set the site address.** In *Authentication → URL Configuration*, set *Site URL* to your website address (e.g. `https://novum-maastricht.nl`). Password-reset emails link back there.
6. **Add board members as admins.** For each person:
   - *Authentication → Users → Add user → Create new user*, with their email and a temporary password
   - In the *SQL Editor*, run:
     ```sql
     insert into admins (email) values ('their.email@example.com');
     ```
   They can then sign in at `/admin.html` and change their password using "Forgot your password?".
   To remove someone: `delete from admins where email = '…';` and delete their user.

`schema.sql` is safe to run again (for example after an update that adds a column). `seed.sql` is not: run it only once, or the pillars appear twice.

To try the admin page before any of this, open `admin.html?demo`. It uses sample data and saves nothing.

## Email for contact messages

Every message sent through the Contact page is emailed to novum@maastrichtuniversity.nl. Replying to that email answers the sender directly.

1. Create a free account at [resend.com](https://resend.com) **using novum@maastrichtuniversity.nl**. Until a domain is verified, Resend can only deliver to its own account address.
2. In Resend, go to *API Keys → Create API key* (Sending access) and copy it (`re_…`). Don't share it.
3. Put the key into `supabase/email_notifications.sql` in place of `re_YOUR_API_KEY`, and run the file in the SQL Editor.
4. Send a test message on the Contact page and check the inbox, including the spam folder.

The database accepts at most 3 messages per email address per hour, and 30 in total, so a spammer can't flood the inbox.

## Membership registrations

The *Become a member* page embeds NovUM's Google Form ("Membership registration form 26/27"). Responses go to that form's Google Sheet, not to the website database. The form only loads after the visitor clicks *Load the registration form*, because Google sets cookies. To use a different form, change the two links in `pages/join.html` and rebuild.

## Privacy and security

- The **privacy statement** (required under the GDPR/AVG) is edited in the admin page under *Privacy statement*, with a live preview. Run `supabase/site_texts.sql` once to enable this. **Fill in the parts in [square brackets]** (postal address, KvK number, hosting provider, Supabase region, retention periods) before launch. Until a version is saved, the site shows the built-in text from `novum-site/content/privacy.md`.
- `novum-site/_headers` sets the security headers (Content-Security-Policy, HSTS and others) on Cloudflare Pages or Netlify. If you add an outside embed or script later, add its domain there, or the browser will block it.
- Fonts and the Supabase library are served from the site itself, so visitors' browsers don't contact Google or a CDN.

## Student priorities poll

The home page asks "What should NovUM fight for next?". Students pick one pillar (and optionally their faculty), and see the live results. Votes are anonymous: no names, emails or IP addresses are stored.

- **Setup (once):** run `supabase/priority_poll.sql` in the Supabase SQL Editor.
- **Results:** in the admin page under *Poll results*, as a total per pillar and a breakdown per faculty.
- **New year:** click *Reset poll* in the admin page at the start of each academic year. Each browser can vote once per academic year.
- **Spam limit:** at most 300 votes per hour across the whole site.

## Putting it online

- **Netlify (simplest):** log in at app.netlify.com, open *Add new site → Deploy manually*, and drag the `novum-site` folder onto the page. Then connect the `novum-maastricht.nl` domain under *Domain settings*.
- To preview on your own computer:
  ```bash
  python3 -m http.server 8766 --directory novum-site
  ```
  Then open http://localhost:8766.

## Day-to-day use (admin page)

| Screen | What it's for |
| --- | --- |
| Messages | Messages from the *Contact* page. "Reply by email" opens your mail app with the reply started; then set the status to Answered. |
| Our work | The five pillars, their illustrations and their achievements. Linking an achievement to a council also shows it under that council. |
| Councils | The councillors for each of the seven councils. |
| Board | The current board. When a new board starts, delete the old members (or untick “Show on the website”) and add the new ones. |
| Poll results | Live results of the home page poll, per pillar and per faculty. *Reset poll* starts a new year. |
| Privacy statement | Edit the privacy statement with simple formatting (`## heading`, `- list`, `**bold**`, `[link](https://…)`) and a live preview. *Save and publish* puts it live immediately. |
| Handbook | What Supabase and Resend are, how to log in to them, common tasks, and a checklist for handing over to a new board. Edit it in `renderHandbook()` in `novum-site/js/admin.js`. |

Photos are uploaded straight from the edit panel (JPG or PNG under 5 MB, portrait works best).

## Changing page text

The fixed text of each public page (headings, intros, the About story) is in `pages/<name>.html`. After editing, rebuild:

```bash
python3 tools/build_pages.py
```

The menu, header and footer for every page are in `tools/build_pages.py`. Content that changes often (people, pillars, achievements) comes from the database, so edit it in the admin page instead.

## Before launch

- [ ] Steps 1–6 above, re-run `schema.sql` (it now blocks website sign-ups and adds the spam limit), then send a test message and check it arrives in the admin page and by email.
- [ ] Run `supabase/priority_poll.sql` so the home page poll can save votes.
- [ ] Run `supabase/site_texts.sql` so the privacy statement can be edited in the admin page.
- [ ] Fill in the [bracketed] details in the privacy statement (admin page → Privacy statement).
- [ ] Paste NovUM's LinkedIn URL into `LINKEDIN` in `tools/build_pages.py` and rebuild.
- [ ] Delete the "TEST - delete me" message(s) in the admin page.
- [ ] Add the real councillors for each council (Councils screen).
- [ ] Check the board texts. They are copied from the current site.
- [ ] Keep the photo credit in the footer: the Hoge Brug photo is by R. Henrik Nilsson, CC BY 4.0, from Wikimedia Commons. The pillar illustrations (`img/pillars/`) were drawn for this site. The Tapijn photo is by Kleon3 (CC BY-SA 4.0) and the pillar photos are from Wikimedia Commons; all credits are on the privacy page under *Photo credits*.

## Photos

Photos on the website should be web-sized (around 1,000 px on the long side, under 300 KB). Full-resolution originals of the board photos are kept in `photo-originals/`, which is **not** uploaded with the site. Photos uploaded through the admin page are stored in Supabase; keep them under 1 MB where you can.
