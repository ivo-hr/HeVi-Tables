-- Increase the evidence bucket file size limit from 1 MB to 5 MB so that
-- re-encoded WebP images never hit the storage-level ceiling, even when the
-- source is large or the browser produces a heavier encode.  The application
-- still compresses client-side, but this removes the hard storage failure.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'tabla_evidencias',
  'tabla_evidencias',
  false,
  5242880,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;