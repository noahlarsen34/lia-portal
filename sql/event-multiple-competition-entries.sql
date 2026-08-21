-- Allows one event registration to contain one optional entry per category.
-- Safe to run more than once.

alter table public.event_registrations
alter column competition_category drop not null;

alter table public.event_registrations
alter column entry_title drop not null;

create table if not exists public.event_competition_entries (
    id uuid primary key default gen_random_uuid(),
    registration_id uuid not null references public.event_registrations(id) on delete cascade,
    category text not null,
    title text,
    external_url text,
    created_at timestamptz not null default now(),
    constraint event_competition_entries_registration_category_key
        unique (registration_id, category)
);

-- Historical registrations may contain earlier labels such as "Written".
-- New submissions are validated against the current category list by the app,
-- while the database preserves those older values without rewriting them.
alter table public.event_competition_entries
drop constraint if exists event_competition_entries_category_check;

alter table public.event_registration_files
add column if not exists competition_entry_id uuid
references public.event_competition_entries(id) on delete cascade;

-- Preserve competition entries submitted before this upgrade.
insert into public.event_competition_entries (
    registration_id,
    category,
    title,
    external_url
)
select
    id,
    competition_category,
    nullif(entry_title, ''),
    external_url
from public.event_registrations
where nullif(competition_category, '') is not null
on conflict (registration_id, category) do nothing;

-- Associate legacy uploaded files with the migrated entry.
update public.event_registration_files as files
set competition_entry_id = entries.id
from public.event_competition_entries as entries
where entries.registration_id = files.registration_id
  and files.competition_entry_id is null;

create index if not exists event_competition_entries_registration_id_idx
on public.event_competition_entries(registration_id);

create index if not exists event_registration_files_competition_entry_id_idx
on public.event_registration_files(competition_entry_id);
