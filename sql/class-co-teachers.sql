-- Shared teacher access for LIA classes.
-- Run this migration in the Supabase SQL editor before deploying the app code.

create table if not exists public.lia_class_teachers (
    class_id uuid not null references public.lia_classes(id) on delete cascade,
    teacher_profile_id uuid not null references public.profiles(id) on delete cascade,
    role text not null default 'co_teacher' check (role in ('primary', 'co_teacher')),
    assigned_at timestamptz not null default now(),
    assigned_by uuid references public.profiles(id) on delete set null,
    primary key (class_id, teacher_profile_id)
);

create index if not exists lia_class_teachers_teacher_profile_id_idx
    on public.lia_class_teachers(teacher_profile_id);

insert into public.lia_class_teachers (class_id, teacher_profile_id, role)
select id, teacher_profile_id, 'primary'
from public.lia_classes
where teacher_profile_id is not null
on conflict (class_id, teacher_profile_id)
do update set role = 'primary';

create or replace function public.sync_lia_class_primary_teacher()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if tg_op = 'UPDATE' and old.teacher_profile_id is distinct from new.teacher_profile_id then
        delete from public.lia_class_teachers
        where class_id = new.id
          and teacher_profile_id = old.teacher_profile_id
          and role = 'primary';
    end if;

    insert into public.lia_class_teachers (class_id, teacher_profile_id, role)
    values (new.id, new.teacher_profile_id, 'primary')
    on conflict (class_id, teacher_profile_id)
    do update set role = 'primary';

    return new;
end;
$$;

drop trigger if exists sync_lia_class_primary_teacher_trigger
    on public.lia_classes;

create trigger sync_lia_class_primary_teacher_trigger
after insert or update of teacher_profile_id on public.lia_classes
for each row execute function public.sync_lia_class_primary_teacher();

alter table public.lia_class_teachers enable row level security;

drop policy if exists "class_teachers_member_select"
    on public.lia_class_teachers;
create policy "class_teachers_member_select"
on public.lia_class_teachers
for select
to authenticated
using (
    teacher_profile_id = auth.uid()
    or exists (
        select 1
        from public.lia_classes c
        where c.id = class_id
          and c.teacher_profile_id = auth.uid()
    )
    or exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
    )
);

drop policy if exists "class_teachers_primary_insert"
    on public.lia_class_teachers;
create policy "class_teachers_primary_insert"
on public.lia_class_teachers
for insert
to authenticated
with check (
    role = 'co_teacher'
    and exists (
        select 1
        from public.lia_classes c
        where c.id = class_id
          and c.teacher_profile_id = auth.uid()
    )
    or exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
    )
);

drop policy if exists "class_teachers_primary_delete"
    on public.lia_class_teachers;
create policy "class_teachers_primary_delete"
on public.lia_class_teachers
for delete
to authenticated
using (
    role = 'co_teacher'
    and exists (
        select 1
        from public.lia_classes c
        where c.id = class_id
          and c.teacher_profile_id = auth.uid()
    )
    or exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
    )
);

