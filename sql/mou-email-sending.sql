-- Steps 3-5 of the MOU workflow:
--   3. Review the recipient, message, and locked document before sending.
--   4. Send through Resend and retain the exact document version and delivery state.
--   5. Advance the onboarding workflow only after Resend accepts the message.
--
-- Run this file once in the Supabase SQL Editor before using the MOU send screen.

begin;

create table if not exists public.mou_send_events (
    id uuid primary key default gen_random_uuid(),
    mou_draft_id uuid not null
        references public.school_mou_drafts(id) on delete restrict,
    interest_submission_id uuid not null
        references public.school_interest_submissions(id) on delete restrict,
    document_revision integer not null,
    document_storage_bucket text not null,
    document_storage_path text not null,
    recipient_name text,
    recipient_email text not null,
    email_subject text not null,
    email_message text not null,
    resend_message_id text,
    delivery_status text not null default 'requested',
    status_message text,
    requested_by uuid references public.profiles(id) on delete set null,
    requested_at timestamptz not null default now(),
    sent_at timestamptz,
    event_at timestamptz,
    updated_at timestamptz not null default now(),
    constraint mou_send_events_revision_check check (document_revision > 0),
    constraint mou_send_events_delivery_status_check check (
        delivery_status in (
            'requested',
            'sent',
            'delivered',
            'delayed',
            'bounced',
            'failed',
            'suppressed',
            'complained'
        )
    ),
    constraint mou_send_events_one_send_per_draft unique (mou_draft_id),
    constraint mou_send_events_resend_message_unique unique (resend_message_id)
);

create index if not exists mou_send_events_submission_idx
on public.mou_send_events (interest_submission_id, requested_at desc);

create index if not exists mou_send_events_delivery_status_idx
on public.mou_send_events (delivery_status, updated_at desc);

drop trigger if exists mou_send_events_set_updated_at
on public.mou_send_events;

create trigger mou_send_events_set_updated_at
before update on public.mou_send_events
for each row execute function public.set_mou_updated_at();

alter table public.mou_send_events enable row level security;

drop policy if exists "mou_send_events_staff_select"
on public.mou_send_events;
create policy "mou_send_events_staff_select"
on public.mou_send_events
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

revoke all on public.mou_send_events from anon;
revoke insert, update, delete on public.mou_send_events from authenticated;
grant select on public.mou_send_events to authenticated;

commit;
