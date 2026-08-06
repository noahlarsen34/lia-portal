create table if not exists public.email_deliveries (
    id uuid primary key default gen_random_uuid(),
    resend_email_id text unique,
    teacher_id uuid references public.teachers(id) on delete set null,
    recipient text not null,
    subject text not null,
    email_kind text not null default 'other',
    status text not null default 'requested',
    status_message text,
    bounce_type text,
    bounce_subtype text,
    event_data jsonb,
    requested_at timestamptz not null default now(),
    event_at timestamptz,
    updated_at timestamptz not null default now(),
    constraint email_deliveries_status_check check (
        status in (
            'requested',
            'sent',
            'delivered',
            'delayed',
            'bounced',
            'failed',
            'suppressed',
            'complained'
        )
    )
);

create index if not exists email_deliveries_teacher_requested_idx
on public.email_deliveries (teacher_id, requested_at desc);

create index if not exists email_deliveries_recipient_requested_idx
on public.email_deliveries (lower(recipient), requested_at desc);

alter table public.email_deliveries enable row level security;

drop policy if exists "email_deliveries_staff_select" on public.email_deliveries;

create policy "email_deliveries_staff_select"
on public.email_deliveries
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

revoke insert, update, delete on public.email_deliveries
from anon, authenticated;

grant select on public.email_deliveries to authenticated;

