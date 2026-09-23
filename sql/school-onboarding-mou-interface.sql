-- Adds the launch-meeting gate used by the MOU preview interface.
-- Run this after sql/mou-pricing-and-drafts.sql in the Supabase SQL Editor.

begin;

alter table public.school_interest_submissions
    add column if not exists launch_meeting_completed_at timestamptz,
    add column if not exists launch_meeting_completed_by uuid
        references public.profiles(id) on delete set null;

create index if not exists school_interest_launch_meeting_idx
on public.school_interest_submissions (launch_meeting_completed_at)
where launch_meeting_completed_at is not null;

commit;
