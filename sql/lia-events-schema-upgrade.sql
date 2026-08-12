-- Upgrade an existing lia_events table created before event capacity was added.
-- Safe to run more than once.

alter table public.lia_events
add column if not exists capacity integer;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'lia_events_capacity_positive'
          and conrelid = 'public.lia_events'::regclass
    ) then
        alter table public.lia_events
        add constraint lia_events_capacity_positive
        check (capacity is null or capacity > 0);
    end if;
end
$$;
