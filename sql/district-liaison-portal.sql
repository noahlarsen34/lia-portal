-- District liaison accounts and district-scoped portal access.
-- Run this migration in the Supabase SQL editor before deploying the app code.

alter table public.profiles
    drop constraint if exists profiles_role_check;

alter table public.profiles
    add constraint profiles_role_check
    check (role in ('admin', 'rpm', 'teacher', 'district_liaison', 'student'));

create table if not exists public.district_liaisons (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid unique references public.profiles(id) on delete set null,
    first_name text,
    last_name text,
    email text not null,
    status text not null default 'active'
        check (status in ('active', 'inactive')),
    portal_access_status text not null default 'not_invited'
        check (portal_access_status in ('not_invited', 'invited', 'active', 'disabled')),
    invited_at timestamptz,
    invited_by uuid references public.profiles(id) on delete set null,
    activated_at timestamptz,
    last_portal_login_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists district_liaisons_email_key
    on public.district_liaisons (lower(email));

create table if not exists public.district_liaison_districts (
    liaison_id uuid not null references public.district_liaisons(id) on delete cascade,
    district_id uuid not null references public.districts(id) on delete cascade,
    assigned_at timestamptz not null default now(),
    assigned_by uuid references public.profiles(id) on delete set null,
    primary key (liaison_id, district_id)
);

create index if not exists district_liaison_districts_district_id_idx
    on public.district_liaison_districts (district_id);

alter table public.email_deliveries
    add column if not exists district_liaison_id uuid
    references public.district_liaisons(id) on delete set null;

create index if not exists email_deliveries_district_liaison_requested_idx
    on public.email_deliveries (district_liaison_id, requested_at desc);

alter table public.district_liaisons enable row level security;
alter table public.district_liaison_districts enable row level security;

drop policy if exists "district_liaisons_self_or_admin_select"
    on public.district_liaisons;
create policy "district_liaisons_self_or_admin_select"
on public.district_liaisons
for select
to authenticated
using (
    profile_id = auth.uid()
    or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
    )
);

drop policy if exists "district_liaisons_admin_manage"
    on public.district_liaisons;
create policy "district_liaisons_admin_manage"
on public.district_liaisons
for all
to authenticated
using (
    exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
    )
)
with check (
    exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
    )
);

drop policy if exists "district_liaison_districts_self_or_admin_select"
    on public.district_liaison_districts;
create policy "district_liaison_districts_self_or_admin_select"
on public.district_liaison_districts
for select
to authenticated
using (
    exists (
        select 1 from public.district_liaisons liaison
        where liaison.id = liaison_id
          and liaison.profile_id = auth.uid()
    )
    or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
    )
);

drop policy if exists "district_liaison_districts_admin_manage"
    on public.district_liaison_districts;
create policy "district_liaison_districts_admin_manage"
on public.district_liaison_districts
for all
to authenticated
using (
    exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
    )
)
with check (
    exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
    )
);

revoke insert, update, delete on public.district_liaisons
    from anon, authenticated;
revoke insert, update, delete on public.district_liaison_districts
    from anon, authenticated;
grant select on public.district_liaisons to authenticated;
grant select on public.district_liaison_districts to authenticated;

comment on table public.district_liaison_districts is
    'District assignments grant a liaison read-only access to every class in the district. Class access is implemented in a later migration.';
