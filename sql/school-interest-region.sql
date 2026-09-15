-- Add the LIA region selected for Utah and Florida interest submissions.
-- Run once in the Supabase SQL Editor before deploying the updated form.

alter table public.school_interest_submissions
    add column if not exists region text;

alter table public.school_interest_submissions
    drop constraint if exists school_interest_region_check;

alter table public.school_interest_submissions
    add constraint school_interest_region_check check (
        region is null or region in ('North', 'Central', 'South')
    );
