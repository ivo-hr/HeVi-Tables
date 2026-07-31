-- Editable table artwork and a planned closing date, without mutating scores.

alter table public.tablas
add column scheduled_close_date date;

create or replace function public.update_table_settings(
  p_table_id uuid,
  p_design_url text,
  p_scheduled_close_date date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_creator_id uuid;
begin
  select creator_id into v_creator_id
  from public.tablas
  where id = p_table_id
  for update;

  if not found then
    raise exception 'Tabla no encontrada';
  end if;

  if (select auth.uid()) is null or (select auth.uid()) <> v_creator_id then
    raise exception 'Solo el creador puede cambiar estos ajustes';
  end if;

  update public.tablas
  set
    design_url = p_design_url,
    scheduled_close_date = p_scheduled_close_date
  where id = p_table_id;
end;
$$;

grant insert (scheduled_close_date) on public.tablas to authenticated;
revoke all on function public.update_table_settings(uuid, text, date)
  from public, anon;
grant execute on function public.update_table_settings(uuid, text, date)
  to authenticated;
