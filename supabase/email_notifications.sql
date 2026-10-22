-- Email notifications: every message sent through the website's contact form is emailed to
-- novum@maastrichtuniversity.nl. Emails are sent through Resend (resend.com, free plan).
-- (Membership registrations now go through the Google Form, which has its own notifications.)
--
-- BEFORE RUNNING
--   1. Create a free account at resend.com WITH novum@maastrichtuniversity.nl as its email
--      address (Resend only delivers to the account's own address until a domain is verified).
--   2. In Resend: API Keys -> Create API key (permission "Sending access"). Copy it (starts with re_).
--   3. Replace re_YOUR_API_KEY below with the key from step 2.
--   4. Paste this whole file into SQL Editor -> New query -> Run.
--
-- Safe to run again, e.g. to change the recipients. To stop the emails:
--   drop trigger if exists notify_new_message on messages;

create extension if not exists pg_net with schema extensions;

-- The API key is kept encrypted in Supabase Vault, never in a table or on the website.
do $$
begin
  if exists (select 1 from vault.secrets where name = 'resend_api_key') then
    perform vault.update_secret((select id from vault.secrets where name = 'resend_api_key'), '
  re_YOUR_API_KEY');
  else
    perform vault.create_secret('re_YOUR_API_KEY', 'resend_api_key', 'Resend API key for NovUM website notifications');
  end if;
end $$;

-- Who gets the emails and who they come from. Only visible in the dashboard (no policies).
create table if not exists notification_settings (
  id int primary key default 1 check (id = 1),
  recipients text[] not null,
  from_address text not null default 'NovUM website <onboarding@resend.dev>'
);
alter table notification_settings enable row level security;

insert into notification_settings (id, recipients)
values (1, array['novum@maastrichtuniversity.nl'])   -- several: array['a@x.nl', 'b@x.nl']
on conflict (id) do update set recipients = excluded.recipients;

create or replace function notify_by_email() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  api_key text;
  s notification_settings;
  subj text;
  body text;
begin
  select decrypted_secret into api_key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  select * into s from notification_settings where id = 1;
  if api_key is null or api_key like 're_YOUR_API_KEY' or s is null then
    return new;
  end if;

  if tg_table_name = 'members' then
    subj := 'New membership registration: ' || new.full_name;
    body := concat_ws(E'\n',
      'Someone registered as a member on the NovUM website.', '',
      'Name: ' || new.full_name,
      'Email: ' || new.email,
      'Faculty: ' || nullif(new.faculty, ''),
      'Programme: ' || nullif(new.programme, ''),
      'Year: ' || nullif(new.study_year, ''),
      'Interested in: ' || nullif(array_to_string(new.interests, ', '), ''),
      case when new.message <> '' then E'\nTheir message:\n' || new.message end,
      '', 'Reply to this email to answer them, and update the status on the admin page.');
  else
    subj := 'New message: ' || new.topic || ' (from ' || new.name || ')';
    body := concat_ws(E'\n',
      'Someone sent a message through the NovUM website.', '',
      'From: ' || new.name,
      'Email: ' || new.email,
      'Topic: ' || new.topic,
      'Council: ' || nullif(new.council, ''),
      '', new.message,
      '', 'Reply to this email to answer them, and mark it as answered on the admin page.');
  end if;

  -- pg_net sends in the background, so a slow or failed email never blocks the form.
  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || api_key, 'Content-Type', 'application/json'),
    body := jsonb_build_object(
      'from', s.from_address,
      'to', to_jsonb(s.recipients),
      'reply_to', new.email,
      'subject', subj,
      'text', body)
  );
  return new;
exception when others then
  raise warning 'notify_by_email failed: %', sqlerrm;
  return new;  -- never lose a submission because of an email problem
end $$;

revoke all on function notify_by_email() from public, anon, authenticated;

drop trigger if exists notify_new_member on members;  -- registrations are no longer emailed

drop trigger if exists notify_new_message on messages;
create trigger notify_new_message after insert on messages
  for each row execute function notify_by_email();
