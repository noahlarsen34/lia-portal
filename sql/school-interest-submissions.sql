-- Step 1 of the school onboarding pipeline: public interest submissions.
-- Run this file once in the Supabase SQL Editor before publishing /interest.

create table if not exists public.school_interest_submissions (
    id uuid primary key default gen_random_uuid(),
    school_name text not null,
    district_name text,
    -- Matches the legacy schools.city column, which stores the full address.
    city text not null,
    state text not null,
    website text,
    contact_first_name text not null,
    contact_last_name text not null,
    contact_title text not null,
    contact_email text not null,
    contact_phone text,
    is_decision_maker boolean not null default false,
    principal_name text,
    principal_email text,
    signer_name text,
    signer_email text,
    billing_email text,
    grade_levels text[] not null default '{}',
    estimated_student_count integer,
    desired_start_term text not null,
    funding_status text not null,
    referral_source text,
    notes text,
    consent_to_contact boolean not null,
    source text not null default 'direct',
    pipeline_stage text not null default 'new_interest',
    next_action text not null default 'Review and qualify submission',
    status text not null default 'open',
    assigned_to uuid references public.profiles(id) on delete set null,
    submitted_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint school_interest_pipeline_stage_check check (
        pipeline_stage in (
            'new_interest',
            'scheduling',
            'meeting_scheduled',
            'qualified',
            'awaiting_school_signature',
            'awaiting_lia_signature',
            'fully_executed',
            'active',
            'unqualified',
            'unresponsive',
            'declined'
        )
    ),
    constraint school_interest_status_check check (
        status in ('open', 'completed', 'closed')
    ),
    constraint school_interest_student_count_check check (
        estimated_student_count is null or estimated_student_count > 0
    )
);

create index if not exists school_interest_pipeline_idx
on public.school_interest_submissions (status, pipeline_stage, submitted_at desc);

create index if not exists school_interest_email_idx
on public.school_interest_submissions (lower(contact_email), submitted_at desc);

alter table public.school_interest_submissions enable row level security;

drop policy if exists "school_interest_staff_select" on public.school_interest_submissions;
create policy "school_interest_staff_select"
on public.school_interest_submissions
for select
to authenticated
using (
    exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role in ('admin', 'rpm')
    )
);

-- Public writes go through a validated server action using the service-role client.
revoke insert, update, delete on public.school_interest_submissions from anon, authenticated;
grant select on public.school_interest_submissions to authenticated;
