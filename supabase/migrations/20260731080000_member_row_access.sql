-- Allow any group member to add, edit and delete rows (and upload evidence)
-- in open tables.  Previously only the table creator could do this.

-- Row policies: replace creator-only with group-member checks.
drop policy if exists "Creators can insert rows in open tables" on public.tabla_filas;
drop policy if exists "Creators can update rows in open tables" on public.tabla_filas;
drop policy if exists "Creators can delete rows in open tables" on public.tabla_filas;

create policy "Members can insert rows in open tables"
on public.tabla_filas for insert
to authenticated
with check (
  exists (
    select 1
    from public.tablas t
    where t.id = table_id
      and public.is_group_member(t.group_id)
      and t.closed = false
  )
);

create policy "Members can update rows in open tables"
on public.tabla_filas for update
to authenticated
using (
  exists (
    select 1
    from public.tablas t
    where t.id = table_id
      and public.is_group_member(t.group_id)
      and t.closed = false
  )
)
with check (
  exists (
    select 1
    from public.tablas t
    where t.id = table_id
      and public.is_group_member(t.group_id)
      and t.closed = false
  )
);

create policy "Members can delete rows in open tables"
on public.tabla_filas for delete
to authenticated
using (
  exists (
    select 1
    from public.tablas t
    where t.id = table_id
      and public.is_group_member(t.group_id)
      and t.closed = false
  )
);

-- Storage policies: allow any group member to upload and delete evidence.
drop policy if exists "Creators upload table evidence" on storage.objects;
drop policy if exists "Creators delete table evidence" on storage.objects;

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