-- Adds private image/video attachments to announcements.
-- Run this file in the Supabase SQL Editor. Safe to run more than once.

alter table public.announcements
add column if not exists media_bucket text,
add column if not exists media_path text,
add column if not exists media_kind text,
add column if not exists media_mime_type text,
add column if not exists media_file_name text,
add column if not exists media_file_size bigint;

alter table public.announcements
drop constraint if exists announcements_media_kind_check;

alter table public.announcements
add constraint announcements_media_kind_check
check (media_kind is null or media_kind in ('image', 'video'));

insert into storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
values (
    'announcement-media',
    'announcement-media',
    false,
    262144000,
    array[
        'image/jpeg',
        'image/png',
        'image/webp',
        'video/mp4',
        'video/webm',
        'video/quicktime'
    ]
)
on conflict (id) do update
set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
