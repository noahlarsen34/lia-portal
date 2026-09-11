-- Archive support for school onboarding interest submissions.
-- Run once in the Supabase SQL Editor before deploying the archive UI.

alter table public.school_interest_submissions
    add column if not exists archived_at timestamptz,
    add column if not exists archived_by uuid references public.profiles(id) on delete set null,
    add column if not exists archive_reason text,
    add column if not exists converted_school_id uuid references public.schools(id) on delete set null;

alter table public.school_interest_submissions
    drop constraint if exists school_interest_archive_reason_check;

alter table public.school_interest_submissions
    add constraint school_interest_archive_reason_check check (
        archive_reason is null or archive_reason in (
            'onboarding_completed',
            'school_declined',
            'not_qualified',
            'unresponsive',
            'duplicate',
            'other'
        )
    );

create index if not exists school_interest_archive_idx
on public.school_interest_submissions (archived_at, submitted_at desc);

create unique index if not exists school_interest_converted_school_idx
on public.school_interest_submissions (converted_school_id)
where converted_school_id is not null;

drop policy if exists "school_interest_staff_update" on public.school_interest_submissions;
create policy "school_interest_staff_update"
on public.school_interest_submissions
for update
to authenticated
using (
    exists (
        select 1 from public.profiles
        where profiles.id = auth.uid() and profiles.role in ('admin', 'rpm')
    )
)
with check (
    exists (
        select 1 from public.profiles
        where profiles.id = auth.uid() and profiles.role in ('admin', 'rpm')
    )
);

drop policy if exists "school_interest_admin_delete" on public.school_interest_submissions;
create policy "school_interest_admin_delete"
on public.school_interest_submissions
for delete
to authenticated
using (
    exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
    )
);

grant update, delete on public.school_interest_submissions to authenticated;
