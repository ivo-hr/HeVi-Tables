-- Include provisional points from open tables and publish row inserts so an
-- already-open group ranking can refresh immediately.

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
  tables_count bigint
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
      row_points
    from scored_rows
  )
  select
    m.id as user_id,
    m.username,
    m.avatar_url,
    coalesce(sum(participants.row_points), 0)::bigint as points,
    count(distinct participants.table_id)::bigint as tables_count
  from members m
  left join participants on participants.participant_id = m.id
  group by m.id, m.username, m.avatar_url
  order by points desc, m.username asc;
$$;

revoke all on function public.get_group_leaderboard(uuid, text, uuid)
  from public, anon;
grant execute on function public.get_group_leaderboard(uuid, text, uuid)
  to authenticated;

do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tabla_filas'
  ) then
    execute 'alter publication supabase_realtime add table public.tabla_filas';
  end if;
end;
$$;
