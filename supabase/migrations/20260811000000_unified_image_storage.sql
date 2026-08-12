-- Normalize every user image bucket to the application-wide storage contract:
-- the server stores WebP files no larger than 1 MiB and 512 px on either axis.
-- Existing PNG/JPEG objects remain readable; allowed_mime_types only affects
-- new uploads.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values
  (
    'avatars',
    'avatars',
    true,
    1048576,
    array['image/webp']
  ),
  (
    'tablas_disenos',
    'tablas_disenos',
    true,
    1048576,
    array['image/webp']
  ),
  (
    'tabla_evidencias',
    'tabla_evidencias',
    false,
    1048576,
    array['image/webp']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Recreate the evidence policies here as a repair migration. This also fixes
-- databases that received the original evidence migration but not the later
-- group-member policy update.
drop policy if exists "Creators upload table evidence" on storage.objects;
drop policy if exists "Creators delete table evidence" on storage.objects;
drop policy if exists "Members upload table evidence" on storage.objects;
drop policy if exists "Members delete table evidence" on storage.objects;

create policy "Members upload table evidence"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'tabla_evidencias'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.tablas t
    where t.id::text = (storage.foldername(name))[2]
      and public.is_group_member(t.group_id)
      and t.closed = false
  )
);

create policy "Members delete table evidence"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'tabla_evidencias'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.tablas t
    where t.id::text = (storage.foldername(name))[2]
      and public.is_group_member(t.group_id)
      and t.closed = false
  )
);
