-- Let clients inspect a specific calendar week or month. A null anchor keeps
-- the current Europe/Madrid period, preserving the previous default.

drop function if exists public.get_group_leaderboard(uuid, text, uuid);
drop function if exists public.get_group_leaderboard(uuid, text, uuid, date);

create function public.get_group_leaderboard(
  p_group_id uuid,
  p_period text default 'all',
  p_table_id uuid default null,
  p_anchor_date date default null
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
  with period_bounds as (
    select
      case p_period
        when 'week' then
          date_trunc(
            'week',
            coalesce(
              p_anchor_date,
              (now() at time zone 'Europe/Madrid')::date
            )::timestamp
          ) at time zone 'Europe/Madrid'
        when 'month' then
          date_trunc(
            'month',
            coalesce(
              p_anchor_date,
              (now() at time zone 'Europe/Madrid')::date
            )::timestamp
          ) at time zone 'Europe/Madrid'
        else null
      end as starts_at,
      case p_period
        when 'week' then
          (
            date_trunc(
              'week',
              coalesce(
                p_anchor_date,
                (now() at time zone 'Europe/Madrid')::date
              )::timestamp
            ) + interval '1 week'
          ) at time zone 'Europe/Madrid'
        when 'month' then
          (
            date_trunc(
              'month',
              coalesce(
                p_anchor_date,
                (now() at time zone 'Europe/Madrid')::date
              )::timestamp
            ) + interval '1 month'
          ) at time zone 'Europe/Madrid'
        else null
      end as ends_at
  ),
  members as (
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
    cross join period_bounds bounds
    where t.group_id = p_group_id
      and (p_table_id is null or t.id = p_table_id)
      and case p_period
        when 'week' then
          coalesce(t.closed_date, t.created_at) >= bounds.starts_at
          and coalesce(t.closed_date, t.created_at) < bounds.ends_at
        when 'month' then
          coalesce(t.closed_date, t.created_at) >= bounds.starts_at
          and coalesce(t.closed_date, t.created_at) < bounds.ends_at
        when 'all' then true
        else false
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

revoke all on function public.get_group_leaderboard(uuid, text, uuid, date)
  from public, anon;
grant execute on function public.get_group_leaderboard(uuid, text, uuid, date)
  to authenticated;
