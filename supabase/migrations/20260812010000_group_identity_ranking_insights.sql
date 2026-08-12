-- Custom two-character group marks and richer live ranking statistics.

alter table public.grupos
add column mark text;

with normalized as (
  select
    id,
    upper(regexp_replace(name, '[^[:alnum:]]', '', 'g')) as clean_name
  from public.grupos
)
update public.grupos g
set mark = case
  when char_length(n.clean_name) >= 2 then left(n.clean_name, 2)
  when char_length(n.clean_name) = 1 then n.clean_name || n.clean_name
  else 'GR'
end
from normalized n
where n.id = g.id;

alter table public.grupos
alter column mark set not null,
add constraint group_mark_length check (char_length(mark) = 2);

drop function public.create_group(text);

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

  if char_length(v_mark) <> 2 then
    raise exception 'Las siglas deben tener exactamente dos caracteres';
  end if;

  insert into public.grupos (name, mark, owner_id)
  values (v_name, v_mark, v_user_id)
  returning id into v_group_id;

  insert into public.grupo_miembros (group_id, user_id, role)
  values (v_group_id, v_user_id, 'owner');

  return v_group_id;
end;
$$;

drop function public.get_group_leaderboard(uuid, text, uuid);

create or replace function public.get_group_leaderboard(
  p_group_id uuid,
  p_period text default 'all',
  p_table_id uuid default null
)
returns table (
  user_id uuid,
  username text,
  avatar_url text,
  points bigint,
  tables_count bigint,
  entries_count bigint,
  wins_count bigint,
  average_points double precision,
  best_score bigint,
  closed_points bigint,
  provisional_points bigint,
  last_activity_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  with members as (
    select p.id, p.username, p.avatar_url
    from public.grupo_miembros gm
    join public.perfiles p on p.id = gm.user_id
    where gm.group_id = p_group_id
  ),
  ranked_rows as (
    select
      f.user_ids,
      f.table_id,
      f.position,
      f.points_receivable,
      f.points_won,
      f.created_at,
      t.point_system,
      t.max_point,
      t.info_format,
      t.closed,
      row_number() over (
        partition by f.table_id
        order by
          case
            when t.info_format = 'number' and t.number_sort_order = 'asc'
              then f.numeric_value
          end asc,
          case
            when t.info_format = 'number' and t.number_sort_order = 'desc'
              then f.numeric_value
          end desc,
          f.created_at asc,
          f.id asc
      )::bigint as automatic_position
    from public.tabla_filas f
    join public.tablas t on t.id = f.table_id
    where t.group_id = p_group_id
      and (p_table_id is null or t.id = p_table_id)
      and coalesce(t.closed_date, t.created_at) >= case p_period
        when 'week' then now() - interval '7 days'
        when 'month' then now() - interval '30 days'
        when 'all' then '-infinity'::timestamptz
        else now()
      end
  ),
  positioned_rows as (
    select
      ranked_rows.*,
      case
        when info_format = 'number' and point_system in ('WtA', 'Pod')
          then automatic_position
        else position::bigint
      end as effective_position
    from ranked_rows
  ),
  scored_rows as (
    select
      user_ids,
      table_id,
      effective_position,
      closed,
      created_at,
      case
        when closed then points_won::bigint
        when point_system = 'EC' then coalesce(points_receivable, 0)::bigint
        when point_system = 'WtA' then
          case when effective_position = 1 then max_point::bigint else 0::bigint end
        when point_system = 'Pod' and effective_position is not null then
          greatest(max_point::bigint - ((effective_position - 1) * 2), 0::bigint)
        else 0::bigint
      end as row_points
    from positioned_rows
  ),
  participants as (
    select
      unnest(user_ids) as participant_id,
      table_id,
      effective_position,
      closed,
      created_at,
      row_points
    from scored_rows
  )
  select
    m.id as user_id,
    m.username,
    m.avatar_url,
    coalesce(sum(participants.row_points), 0)::bigint as points,
    count(distinct participants.table_id)::bigint as tables_count,
    count(participants.table_id)::bigint as entries_count,
    count(participants.table_id) filter (
      where participants.effective_position = 1
    )::bigint as wins_count,
    coalesce(round(avg(participants.row_points)::numeric, 1), 0)::double precision
      as average_points,
    coalesce(max(participants.row_points), 0)::bigint as best_score,
    coalesce(sum(participants.row_points) filter (where participants.closed), 0)::bigint
      as closed_points,
    coalesce(sum(participants.row_points) filter (where not participants.closed), 0)::bigint
      as provisional_points,
    max(participants.created_at) as last_activity_at
  from members m
  left join participants on participants.participant_id = m.id
  group by m.id, m.username, m.avatar_url
  order by points desc, wins_count desc, average_points desc, m.username asc;
$$;

grant update (mark) on public.grupos to authenticated;

revoke all on function public.create_group(text, text) from public, anon;
grant execute on function public.create_group(text, text) to authenticated;

revoke all on function public.get_group_leaderboard(uuid, text, uuid)
  from public, anon;
grant execute on function public.get_group_leaderboard(uuid, text, uuid)
  to authenticated;

alter table public.tabla_filas replica identity full;
alter table public.grupo_miembros replica identity full;
alter table public.tablas replica identity full;

do $$
declare
  v_table text;
begin
  foreach v_table in array array['grupo_miembros', 'tablas'] loop
    if exists (
      select 1 from pg_publication where pubname = 'supabase_realtime'
    ) and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = v_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    end if;
  end loop;
end;
$$;
