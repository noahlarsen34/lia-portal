-- Admin-controlled classification used by teacher reporting and exports.
-- This is intentionally separate from lia_class_teachers because a teacher's
-- role in a specific class does not necessarily describe their reporting role.

alter table public.teachers
add column if not exists reporting_role text not null default 'standard';

alter table public.teachers
drop constraint if exists teachers_reporting_role_check;

alter table public.teachers
add constraint teachers_reporting_role_check
check (reporting_role in ('standard', 'co_teacher_only'));

comment on column public.teachers.reporting_role is
    'Controls teacher reporting: standard records count; co_teacher_only records remain accessible but are excluded from teacher totals and exports.';
