-- Steps 1 and 2 of the MOU workflow:
--   1. Standardized state pricing for Middle/High School programs.
--   2. Versioned MOU drafts with immutable pricing snapshots.
--
-- Run this file once in the Supabase SQL Editor before deploying the MOU UI.

begin;

create or replace function public.set_mou_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Step 1: Standardized state pricing
-- ---------------------------------------------------------------------------

create table if not exists public.mou_state_pricing (
    id uuid primary key default gen_random_uuid(),
    state_code text not null,
    state_name text not null,
    program_level text not null default 'middle_high',
    effective_school_year text not null,
    launch_base_price numeric(12, 2) not null,
    renewal_base_price numeric(12, 2) not null,
    is_active boolean not null default true,
    source_note text,
    created_by uuid references public.profiles(id) on delete set null,
    updated_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint mou_state_pricing_state_code_check check (
        state_code ~ '^[A-Z]{2}$'
    ),
    constraint mou_state_pricing_program_level_check check (
        program_level in ('middle_high', 'elementary')
    ),
    constraint mou_state_pricing_school_year_check check (
        effective_school_year ~ '^\d{4}-\d{4}$'
    ),
    constraint mou_state_pricing_launch_price_check check (
        launch_base_price >= 0
    ),
    constraint mou_state_pricing_renewal_price_check check (
        renewal_base_price >= 0
    ),
    constraint mou_state_pricing_unique_version unique (
        state_code,
        program_level,
        effective_school_year
    )
);

create index if not exists mou_state_pricing_lookup_idx
on public.mou_state_pricing (
    state_code,
    program_level,
    effective_school_year,
    is_active
);

drop trigger if exists mou_state_pricing_set_updated_at
on public.mou_state_pricing;

create trigger mou_state_pricing_set_updated_at
before update on public.mou_state_pricing
for each row execute function public.set_mou_updated_at();

-- Standardized Middle/High School prices from the workbook's States sheet.
-- The source workbook covers pricing through the 2026-2027 school year.
insert into public.mou_state_pricing (
    state_code,
    state_name,
    program_level,
    effective_school_year,
    launch_base_price,
    renewal_base_price,
    is_active,
    source_note
)
values
    ('AZ', 'Arizona',        'middle_high', '2026-2027', 10000.00, 5000.00, true, 'LIA_Pricing_By_State_2024-2027.xlsx - States'),
    ('CO', 'Colorado',       'middle_high', '2026-2027', 10000.00, 5000.00, true, 'LIA_Pricing_By_State_2024-2027.xlsx - States'),
    ('CT', 'Connecticut',    'middle_high', '2026-2027', 10000.00, 5000.00, true, 'LIA_Pricing_By_State_2024-2027.xlsx - States'),
    ('FL', 'Florida',        'middle_high', '2026-2027', 12000.00, 6000.00, true, 'LIA_Pricing_By_State_2024-2027.xlsx - States'),
    ('GA', 'Georgia',        'middle_high', '2026-2027',  8500.00, 4250.00, true, 'LIA_Pricing_By_State_2024-2027.xlsx - States'),
    ('IA', 'Iowa',           'middle_high', '2026-2027',  6000.00, 3000.00, true, 'LIA_Pricing_By_State_2024-2027.xlsx - States'),
    ('ID', 'Idaho',          'middle_high', '2026-2027',  7350.00, 3675.00, true, 'LIA_Pricing_By_State_2024-2027.xlsx - States'),
    ('IL', 'Illinois',       'middle_high', '2026-2027',  8500.00, 4250.00, true, 'LIA_Pricing_By_State_2024-2027.xlsx - States'),
    ('MA', 'Massachusetts',  'middle_high', '2026-2027', 10000.00, 5000.00, true, 'LIA_Pricing_By_State_2024-2027.xlsx - States'),
    ('NJ', 'New Jersey',     'middle_high', '2026-2027', 10000.00, 5000.00, true, 'LIA_Pricing_By_State_2024-2027.xlsx - States'),
    ('NM', 'New Mexico',     'middle_high', '2026-2027', 10500.00, 5250.00, true, 'LIA_Pricing_By_State_2024-2027.xlsx - States'),
    ('NV', 'Nevada',         'middle_high', '2026-2027',  8800.00, 4400.00, true, 'LIA_Pricing_By_State_2024-2027.xlsx - States'),
    ('NY', 'New York',       'middle_high', '2026-2027',  7500.00, 3750.00, true, 'LIA_Pricing_By_State_2024-2027.xlsx - States'),
    ('SC', 'South Carolina', 'middle_high', '2026-2027', 12000.00, 6000.00, true, 'LIA_Pricing_By_State_2024-2027.xlsx - States'),
    ('TN', 'Tennessee',      'middle_high', '2026-2027', 10000.00, 7500.00, true, 'LIA_Pricing_By_State_2024-2027.xlsx - States'),
    ('TX', 'Texas',          'middle_high', '2026-2027',  8000.00, 4000.00, true, 'LIA_Pricing_By_State_2024-2027.xlsx - States'),
    ('UT', 'Utah',           'middle_high', '2026-2027',  5000.00, 2500.00, true, 'LIA_Pricing_By_State_2024-2027.xlsx - States'),
    ('WA', 'Washington',     'middle_high', '2026-2027', 12000.00, 6000.00, true, 'LIA_Pricing_By_State_2024-2027.xlsx - States'),
    ('WI', 'Wisconsin',      'middle_high', '2026-2027', 12000.00, 6000.00, true, 'LIA_Pricing_By_State_2024-2027.xlsx - States')
on conflict (state_code, program_level, effective_school_year)
do update set
    state_name = excluded.state_name,
    launch_base_price = excluded.launch_base_price,
    renewal_base_price = excluded.renewal_base_price,
    is_active = excluded.is_active,
    source_note = excluded.source_note,
    updated_at = now();

alter table public.mou_state_pricing enable row level security;

drop policy if exists "mou_state_pricing_staff_select"
on public.mou_state_pricing;
create policy "mou_state_pricing_staff_select"
on public.mou_state_pricing
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

drop policy if exists "mou_state_pricing_admin_insert"
on public.mou_state_pricing;
create policy "mou_state_pricing_admin_insert"
on public.mou_state_pricing
for insert
to authenticated
with check (
    exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
    )
);

drop policy if exists "mou_state_pricing_admin_update"
on public.mou_state_pricing;
create policy "mou_state_pricing_admin_update"
on public.mou_state_pricing
for update
to authenticated
using (
    exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
    )
)
with check (
    exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
    )
);

drop policy if exists "mou_state_pricing_admin_delete"
on public.mou_state_pricing;
create policy "mou_state_pricing_admin_delete"
on public.mou_state_pricing
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

revoke all on public.mou_state_pricing from anon;
revoke insert, update, delete on public.mou_state_pricing from authenticated;
grant select on public.mou_state_pricing to authenticated;
grant insert, update, delete on public.mou_state_pricing to authenticated;

-- ---------------------------------------------------------------------------
-- Step 2: Versioned MOU drafts and pricing snapshots
-- ---------------------------------------------------------------------------

create table if not exists public.school_mou_drafts (
    id uuid primary key default gen_random_uuid(),
    interest_submission_id uuid not null
        references public.school_interest_submissions(id) on delete restrict,
    pricing_id uuid
        references public.mou_state_pricing(id) on delete restrict,
    revision integer not null default 1,
    is_current boolean not null default true,
    supersedes_draft_id uuid
        references public.school_mou_drafts(id) on delete set null,
    status text not null default 'draft',

    contracting_party_name text not null,
    school_name text not null,
    district_name text,
    state_code text not null,
    program_level text not null default 'middle_high',
    authorized_signer_name text,
    authorized_signer_email text,
    billing_email text,
    effective_school_year text not null,
    launch_school_year text not null,
    renewal_school_year text not null,
    lia_signature_date date,

    launch_base_price numeric(12, 2) not null,
    launch_discount_name text,
    launch_discount_amount numeric(12, 2) not null default 0,
    launch_final_price numeric(12, 2) generated always as (
        launch_base_price - launch_discount_amount
    ) stored,

    renewal_base_price numeric(12, 2) not null,
    renewal_discount_name text,
    renewal_discount_amount numeric(12, 2) not null default 0,
    renewal_final_price numeric(12, 2) generated always as (
        renewal_base_price - renewal_discount_amount
    ) stored,

    document_storage_bucket text,
    document_storage_path text,
    generated_at timestamptz,
    sent_to_email text,
    docusign_envelope_id text,
    sent_at timestamptz,
    signed_at timestamptz,
    voided_at timestamptz,
    void_reason text,

    created_by uuid references public.profiles(id) on delete set null,
    updated_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint school_mou_drafts_revision_check check (revision > 0),
    constraint school_mou_drafts_status_check check (
        status in (
            'draft',
            'ready_to_send',
            'sent',
            'viewed',
            'signed',
            'voided',
            'superseded'
        )
    ),
    constraint school_mou_drafts_state_code_check check (
        state_code ~ '^[A-Z]{2}$'
    ),
    constraint school_mou_drafts_program_level_check check (
        program_level in ('middle_high', 'elementary')
    ),
    constraint school_mou_drafts_effective_year_check check (
        effective_school_year ~ '^\d{4}-\d{4}$'
    ),
    constraint school_mou_drafts_launch_year_check check (
        launch_school_year ~ '^\d{4}-\d{4}$'
    ),
    constraint school_mou_drafts_renewal_year_check check (
        renewal_school_year ~ '^\d{4}-\d{4}$'
    ),
    constraint school_mou_drafts_launch_base_check check (
        launch_base_price >= 0
    ),
    constraint school_mou_drafts_launch_discount_check check (
        launch_discount_amount >= 0
        and launch_discount_amount <= launch_base_price
    ),
    constraint school_mou_drafts_launch_discount_name_check check (
        (
            launch_discount_amount = 0
            and nullif(btrim(launch_discount_name), '') is null
        )
        or (
            launch_discount_amount > 0
            and nullif(btrim(launch_discount_name), '') is not null
        )
    ),
    constraint school_mou_drafts_renewal_base_check check (
        renewal_base_price >= 0
    ),
    constraint school_mou_drafts_renewal_discount_check check (
        renewal_discount_amount >= 0
        and renewal_discount_amount <= renewal_base_price
    ),
    constraint school_mou_drafts_renewal_discount_name_check check (
        (
            renewal_discount_amount = 0
            and nullif(btrim(renewal_discount_name), '') is null
        )
        or (
            renewal_discount_amount > 0
            and nullif(btrim(renewal_discount_name), '') is not null
        )
    ),
    constraint school_mou_drafts_signed_at_check check (
        signed_at is null or sent_at is not null
    ),
    constraint school_mou_drafts_void_reason_check check (
        status <> 'voided' or nullif(btrim(void_reason), '') is not null
    ),
    constraint school_mou_drafts_unique_revision unique (
        interest_submission_id,
        revision
    )
);

create unique index if not exists school_mou_drafts_one_current_idx
on public.school_mou_drafts (interest_submission_id)
where is_current;

create index if not exists school_mou_drafts_status_idx
on public.school_mou_drafts (status, updated_at desc);

create index if not exists school_mou_drafts_pricing_idx
on public.school_mou_drafts (pricing_id);

create unique index if not exists school_mou_drafts_docusign_envelope_idx
on public.school_mou_drafts (docusign_envelope_id)
where docusign_envelope_id is not null;

drop trigger if exists school_mou_drafts_set_updated_at
on public.school_mou_drafts;

create trigger school_mou_drafts_set_updated_at
before update on public.school_mou_drafts
for each row execute function public.set_mou_updated_at();

alter table public.school_mou_drafts enable row level security;

drop policy if exists "school_mou_drafts_staff_select"
on public.school_mou_drafts;
create policy "school_mou_drafts_staff_select"
on public.school_mou_drafts
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

drop policy if exists "school_mou_drafts_staff_insert"
on public.school_mou_drafts;
create policy "school_mou_drafts_staff_insert"
on public.school_mou_drafts
for insert
to authenticated
with check (
    exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role in ('admin', 'rpm')
    )
);

drop policy if exists "school_mou_drafts_staff_update"
on public.school_mou_drafts;
create policy "school_mou_drafts_staff_update"
on public.school_mou_drafts
for update
to authenticated
using (
    exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role in ('admin', 'rpm')
    )
)
with check (
    exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role in ('admin', 'rpm')
    )
);

drop policy if exists "school_mou_drafts_admin_delete_draft"
on public.school_mou_drafts;
create policy "school_mou_drafts_admin_delete_draft"
on public.school_mou_drafts
for delete
to authenticated
using (
    status = 'draft'
    and exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
    )
);

revoke all on public.school_mou_drafts from anon;
revoke insert, update, delete on public.school_mou_drafts from authenticated;
grant select, insert, update, delete on public.school_mou_drafts to authenticated;

commit;
