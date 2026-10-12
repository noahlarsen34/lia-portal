-- Steps 6-7 of the MOU workflow: DocuSign envelope tracking, webhook events,
-- and immutable executed-document history.
-- Run once in Supabase before sending a DocuSign test envelope.

begin;

alter table public.school_mou_drafts
    add column if not exists docusign_status text,
    add column if not exists docusign_status_updated_at timestamptz,
    add column if not exists executed_document_storage_bucket text,
    add column if not exists executed_document_storage_path text,
    add column if not exists certificate_storage_bucket text,
    add column if not exists certificate_storage_path text;

create table if not exists public.mou_document_history (
    id uuid primary key default gen_random_uuid(),
    mou_draft_id uuid not null
        references public.school_mou_drafts(id) on delete restrict,
    interest_submission_id uuid not null
        references public.school_interest_submissions(id) on delete restrict,
    document_revision integer not null,
    document_kind text not null,
    storage_bucket text not null,
    storage_path text not null,
    content_type text not null,
    docusign_envelope_id text,
    created_at timestamptz not null default now(),
    constraint mou_document_history_kind_check check (
        document_kind in ('approved_original', 'executed', 'certificate')
    ),
    constraint mou_document_history_revision_check check (document_revision > 0),
    constraint mou_document_history_unique_document unique (
        mou_draft_id,
        document_kind
    )
);

create index if not exists mou_document_history_submission_idx
on public.mou_document_history (interest_submission_id, created_at desc);

create table if not exists public.mou_docusign_events (
    id uuid primary key default gen_random_uuid(),
    docusign_envelope_id text not null,
    event_type text not null,
    event_at timestamptz not null,
    payload_sha256 text not null unique,
    payload jsonb not null,
    processed_at timestamptz,
    processing_error text,
    created_at timestamptz not null default now()
);

create index if not exists mou_docusign_events_envelope_idx
on public.mou_docusign_events (docusign_envelope_id, event_at desc);

alter table public.mou_document_history enable row level security;
alter table public.mou_docusign_events enable row level security;

drop policy if exists "mou_document_history_staff_select"
on public.mou_document_history;
create policy "mou_document_history_staff_select"
on public.mou_document_history
for select to authenticated
using (
    exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
          and profiles.role in ('admin', 'rpm')
    )
);

drop policy if exists "mou_docusign_events_staff_select"
on public.mou_docusign_events;
create policy "mou_docusign_events_staff_select"
on public.mou_docusign_events
for select to authenticated
using (
    exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
          and profiles.role in ('admin', 'rpm')
    )
);

revoke all on public.mou_document_history from anon;
revoke insert, update, delete on public.mou_document_history from authenticated;
grant select on public.mou_document_history to authenticated;

revoke all on public.mou_docusign_events from anon;
revoke insert, update, delete on public.mou_docusign_events from authenticated;
grant select on public.mou_docusign_events to authenticated;

commit;
