-- Creates the private bucket used for finalized MOU drafts.
-- Run once in the Supabase SQL Editor before generating a finalized MOU.

begin;

insert into storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
values (
    'mou-documents',
    'mou-documents',
    false,
    20971520,
    array[
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/pdf'
    ]
)
on conflict (id) do update
set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

commit;
