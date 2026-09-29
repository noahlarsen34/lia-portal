-- Adds the 2026-2027 three-section MOU pricing model.
-- Run once in the Supabase SQL Editor before deploying the updated MOU UI.

begin;

alter table public.school_mou_drafts
    add column if not exists startup_base_price numeric(12, 2) not null default 4500.00,
    add column if not exists startup_discount_name text,
    add column if not exists startup_discount_percent numeric(5, 2) not null default 0,
    add column if not exists startup_discount_amount numeric(12, 2) not null default 0,
    add column if not exists startup_final_price numeric(12, 2) not null default 4500.00,
    add column if not exists first_year_base_price numeric(12, 2) not null default 6000.00,
    add column if not exists first_year_discount_name text,
    add column if not exists first_year_discount_percent numeric(5, 2) not null default 0,
    add column if not exists first_year_discount_amount numeric(12, 2) not null default 0,
    add column if not exists first_year_final_price numeric(12, 2) not null default 6000.00,
    add column if not exists renewal_program_base_price numeric(12, 2) not null default 6000.00,
    add column if not exists renewal_discount_percent numeric(5, 2) not null default 0,
    add column if not exists renewal_program_final_price numeric(12, 2) not null default 6000.00;

-- Preserve legacy draft discounts as closely as possible. The former launch
-- discount is assigned to the first-year program section; start-up begins
-- undiscounted. Existing renewal discounts retain their names and amounts.
update public.school_mou_drafts
set
    startup_base_price = 4500.00,
    startup_discount_name = null,
    startup_discount_percent = 0,
    startup_discount_amount = 0,
    startup_final_price = 4500.00,
    first_year_base_price = 6000.00,
    first_year_discount_name = case
        when launch_discount_amount > 0 then launch_discount_name
        else null
    end,
    first_year_discount_amount = least(launch_discount_amount, 6000.00),
    first_year_discount_percent = case
        when launch_discount_amount > 0
            then round(least(launch_discount_amount, 6000.00) / 6000.00 * 100, 2)
        else 0
    end,
    first_year_final_price = 6000.00 - least(launch_discount_amount, 6000.00),
    renewal_program_base_price = 6000.00,
    renewal_discount_amount = least(renewal_discount_amount, 6000.00),
    renewal_discount_percent = case
        when renewal_discount_amount > 0
            then round(least(renewal_discount_amount, 6000.00) / 6000.00 * 100, 2)
        else 0
    end,
    renewal_program_final_price = 6000.00 - least(renewal_discount_amount, 6000.00);

alter table public.school_mou_drafts
    drop constraint if exists school_mou_drafts_startup_discount_percent_check,
    drop constraint if exists school_mou_drafts_startup_discount_amount_check,
    drop constraint if exists school_mou_drafts_startup_discount_name_check,
    drop constraint if exists school_mou_drafts_startup_final_check,
    drop constraint if exists school_mou_drafts_first_year_discount_percent_check,
    drop constraint if exists school_mou_drafts_first_year_discount_amount_check,
    drop constraint if exists school_mou_drafts_first_year_discount_name_check,
    drop constraint if exists school_mou_drafts_first_year_final_check,
    drop constraint if exists school_mou_drafts_renewal_discount_percent_check,
    drop constraint if exists school_mou_drafts_renewal_program_final_check;

alter table public.school_mou_drafts
    add constraint school_mou_drafts_startup_discount_percent_check
        check (startup_discount_percent between 0 and 100),
    add constraint school_mou_drafts_startup_discount_amount_check
        check (startup_discount_amount between 0 and startup_base_price),
    add constraint school_mou_drafts_startup_discount_name_check
        check (
            (startup_discount_percent = 0 and nullif(btrim(startup_discount_name), '') is null)
            or
            (startup_discount_percent > 0 and nullif(btrim(startup_discount_name), '') is not null)
        ),
    add constraint school_mou_drafts_startup_final_check
        check (startup_final_price = startup_base_price - startup_discount_amount),
    add constraint school_mou_drafts_first_year_discount_percent_check
        check (first_year_discount_percent between 0 and 100),
    add constraint school_mou_drafts_first_year_discount_amount_check
        check (first_year_discount_amount between 0 and first_year_base_price),
    add constraint school_mou_drafts_first_year_discount_name_check
        check (
            (first_year_discount_percent = 0 and nullif(btrim(first_year_discount_name), '') is null)
            or
            (first_year_discount_percent > 0 and nullif(btrim(first_year_discount_name), '') is not null)
        ),
    add constraint school_mou_drafts_first_year_final_check
        check (first_year_final_price = first_year_base_price - first_year_discount_amount),
    add constraint school_mou_drafts_renewal_discount_percent_check
        check (renewal_discount_percent between 0 and 100),
    add constraint school_mou_drafts_renewal_program_final_check
        check (renewal_program_final_price = renewal_program_base_price - renewal_discount_amount);

comment on column public.school_mou_drafts.startup_discount_percent is
    'Custom discount percentage applied only to initial start-up costs.';
comment on column public.school_mou_drafts.first_year_discount_percent is
    'Custom discount percentage applied only to first-year program costs.';
comment on column public.school_mou_drafts.renewal_discount_percent is
    'Custom discount percentage applied only to second-year renewal costs.';

commit;
