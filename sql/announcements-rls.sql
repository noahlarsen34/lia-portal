-- Run this file in the Supabase SQL Editor.
-- It replaces policies on the two announcement tables without deleting data.

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
    select p.role::text
    from public.profiles as p
    where p.id = (select auth.uid())
    limit 1;
$$;

create or replace function public.current_teacher_rpm_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
    select s.assigned_rpm_id
    from public.teachers as t
    join public.schools as s on s.id = t.school_id
    where t.profile_id = (select auth.uid())
    limit 1;
$$;

revoke all on function public.current_profile_role() from public;
revoke all on function public.current_teacher_rpm_id() from public;
grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.current_teacher_rpm_id() to authenticated;

alter table public.announcements enable row level security;
alter table public.rpm_whatsapp_communities enable row level security;

-- Remove earlier policies so a permissive legacy policy cannot bypass these rules.
do $$
declare
    policy_record record;
begin
    for policy_record in
        select schemaname, tablename, policyname
        from pg_policies
        where schemaname = 'public'
          and tablename in ('announcements', 'rpm_whatsapp_communities')
    loop
        execute format(
            'drop policy if exists %I on %I.%I',
            policy_record.policyname,
            policy_record.schemaname,
            policy_record.tablename
        );
    end loop;
end
$$;

create policy "announcement_select_by_audience"
on public.announcements
for select
to authenticated
using (
    public.current_profile_role() = 'admin'
    or (
        public.current_profile_role() = 'rpm'
        and author_profile_id = (select auth.uid())
    )
    or (
        public.current_profile_role() = 'teacher'
        and status = 'published'
        and (
            audience = 'all_teachers'
            or (
                audience = 'rpm_teachers'
                and target_rpm_id = public.current_teacher_rpm_id()
            )
        )
    )
);

create policy "announcement_insert_by_staff_role"
on public.announcements
for insert
to authenticated
with check (
    author_profile_id = (select auth.uid())
    and (
        (
            public.current_profile_role() = 'admin'
            and audience = 'all_teachers'
            and target_rpm_id is null
        )
        or (
            public.current_profile_role() = 'rpm'
            and audience = 'rpm_teachers'
            and target_rpm_id = (select auth.uid())
        )
    )
);

create policy "announcement_update_by_staff_role"
on public.announcements
for update
to authenticated
using (
    public.current_profile_role() = 'admin'
    or (
        public.current_profile_role() = 'rpm'
        and author_profile_id = (select auth.uid())
        and target_rpm_id = (select auth.uid())
    )
)
with check (
    public.current_profile_role() = 'admin'
    or (
        public.current_profile_role() = 'rpm'
        and author_profile_id = (select auth.uid())
        and audience = 'rpm_teachers'
        and target_rpm_id = (select auth.uid())
    )
);

create policy "announcement_delete_by_staff_role"
on public.announcements
for delete
to authenticated
using (
    public.current_profile_role() = 'admin'
    or (
        public.current_profile_role() = 'rpm'
        and author_profile_id = (select auth.uid())
        and target_rpm_id = (select auth.uid())
    )
);

create policy "community_select_by_assignment"
on public.rpm_whatsapp_communities
for select
to authenticated
using (
    public.current_profile_role() = 'admin'
    or (
        public.current_profile_role() = 'rpm'
        and rpm_profile_id = (select auth.uid())
    )
    or (
        public.current_profile_role() = 'teacher'
        and rpm_profile_id = public.current_teacher_rpm_id()
    )
);

create policy "community_insert_by_admin"
on public.rpm_whatsapp_communities
for insert
to authenticated
with check (public.current_profile_role() = 'admin');

create policy "community_update_by_admin"
on public.rpm_whatsapp_communities
for update
to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

create policy "community_delete_by_admin"
on public.rpm_whatsapp_communities
for delete
to authenticated
using (public.current_profile_role() = 'admin');

create index if not exists announcements_status_audience_rpm_idx
on public.announcements (status, audience, target_rpm_id, published_at desc);

create index if not exists teachers_profile_id_idx
on public.teachers (profile_id);
