-- The available committees and roles are now validated against
-- lia_class_committees and lia_class_roles in the application.
-- These older checks only permit the original hardcoded values.

do $$
declare
    constraint_record record;
begin
    for constraint_record in
        select constraint_name.conname
        from pg_constraint as constraint_name
        where constraint_name.conrelid =
            'public.lia_class_students'::regclass
          and constraint_name.contype = 'c'
          and (
              pg_get_constraintdef(constraint_name.oid) ilike '%committee%'
              or pg_get_constraintdef(constraint_name.oid) ilike '%officer_role%'
          )
    loop
        execute format(
            'alter table public.lia_class_students drop constraint %I',
            constraint_record.conname
        );
    end loop;
end
$$;
