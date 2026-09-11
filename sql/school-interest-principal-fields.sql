-- Add principal contact information to existing school interest submissions.
-- Run this file once in the Supabase SQL Editor before publishing the updated form.

alter table public.school_interest_submissions
add column if not exists principal_name text,
add column if not exists principal_email text;

create index if not exists school_interest_principal_email_idx
on public.school_interest_submissions (lower(principal_email));
