-- Adds the standardized Intermountain Health emotional well-being assignment.
-- Run this in the Supabase SQL editor before deploying the application changes.

alter table public.microcredential_submissions
add column if not exists assignment_key text;

alter table public.microcredential_submissions
add column if not exists responses jsonb;

alter table public.microcredential_submissions
add column if not exists evidence_kind text;

alter table public.microcredential_submissions
drop constraint if exists microcredential_submissions_evidence_kind_check;

alter table public.microcredential_submissions
add constraint microcredential_submissions_evidence_kind_check
check (
    evidence_kind is null
    or evidence_kind in ('document', 'video')
);

create index if not exists microcredential_submissions_assignment_key_idx
on public.microcredential_submissions(lia_class_id, assignment_key);

-- Allow evidence videos up to 100 MB in the existing private bucket.
update storage.buckets
set
    file_size_limit = 104857600,
    allowed_mime_types = array[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'video/mp4',
        'video/quicktime',
        'video/webm'
    ]
where id = 'microcredential-submissions';
