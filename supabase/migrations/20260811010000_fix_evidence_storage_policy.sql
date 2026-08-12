-- The former policy referenced `name` from inside a subquery over `tablas`.
-- PostgreSQL bound that identifier to `tablas.name` instead of the outer
-- `storage.objects.name`, so every upload failed RLS. Parse the object path in
-- a dedicated function to remove that ambiguity.

create or replace function public.can_modify_table_evidence(p_object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_parts text[];
  v_table_id uuid;
begin
  v_parts := storage.foldername(p_object_name);
  if cardinality(v_parts) < 2 then
    return false;
  end if;

  begin
    v_table_id := v_parts[2]::uuid;
  exception when invalid_text_representation then
    return false;
  end;

  return exists (
    select 1
    from public.tablas t
    where t.id = v_table_id
      and public.is_group_member(t.group_id)
      and t.closed = false
  );
end;
$$;

revoke all on function public.can_modify_table_evidence(text)
  from public, anon;
grant execute on function public.can_modify_table_evidence(text)
  to authenticated;

drop policy if exists "Members upload table evidence" on storage.objects;
drop policy if exists "Members delete table evidence" on storage.objects;

create policy "Members upload table evidence"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'tabla_evidencias'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.can_modify_table_evidence(name)
);

create policy "Members delete table evidence"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'tabla_evidencias'
  and public.can_modify_table_evidence(name)
);
