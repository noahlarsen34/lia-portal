alter table public.email_deliveries
add column if not exists reference_code text;

create unique index if not exists email_deliveries_reference_code_key
on public.email_deliveries (reference_code)
where reference_code is not null;

alter table public.teachers
add column if not exists last_portal_login_at timestamptz;

