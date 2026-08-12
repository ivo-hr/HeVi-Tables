-- Allow one to three user-visible symbols in the application, including
-- multi-code-point emoji. PostgreSQL keeps a generous code-point safety bound;
-- the Server Action performs the precise Unicode grapheme validation.

alter table public.grupos
drop constraint group_mark_length;

alter table public.grupos
add constraint group_mark_storage_bound check (
  char_length(mark) between 1 and 96
  and mark !~ '[[:space:]]'
);

create or replace function public.create_group(p_name text, p_mark text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_group_id uuid;
  v_name text := trim(p_name);
  v_mark text := upper(trim(p_mark));
begin
  if v_user_id is null then
    raise exception 'Necesitas iniciar sesión';
  end if;

  if char_length(v_name) < 1 or char_length(v_name) > 80 then
    raise exception 'El nombre debe tener entre 1 y 80 caracteres';
  end if;

  if char_length(v_mark) < 1
    or char_length(v_mark) > 96
    or v_mark ~ '[[:space:]]'
  then
    raise exception 'La marca debe contener entre uno y tres símbolos sin espacios';
  end if;

  insert into public.grupos (name, mark, owner_id)
  values (v_name, v_mark, v_user_id)
  returning id into v_group_id;

  insert into public.grupo_miembros (group_id, user_id, role)
  values (v_group_id, v_user_id, 'owner');

  return v_group_id;
end;
$$;

revoke all on function public.create_group(text, text) from public, anon;
grant execute on function public.create_group(text, text) to authenticated;
