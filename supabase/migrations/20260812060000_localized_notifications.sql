-- Keep durable and background Push notifications in each recipient's saved
-- language. Existing Spanish copy remains the source for Spanish recipients.

create or replace function public.notify_group_members(
  p_group_id uuid,
  p_kind public.notification_kind,
  p_title text,
  p_body text,
  p_table_id uuid default null,
  p_actor_id uuid default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  with notification_context as (
    select
      g.name as group_name,
      t.name as table_name,
      coalesce(actor.username, 'Someone') as actor_name,
      private.notification_variant(coalesce(p_table_id, p_actor_id, p_group_id)) as variant
    from public.grupos g
    left join public.tablas t on t.id = p_table_id
    left join public.perfiles actor on actor.id = p_actor_id
    where g.id = p_group_id
  )
  insert into public.notificaciones (
    user_id,
    kind,
    group_id,
    table_id,
    actor_id,
    title,
    body
  )
  select
    gm.user_id,
    p_kind,
    p_group_id,
    p_table_id,
    p_actor_id,
    case when recipient.locale = 'en' then
      case p_kind
        when 'group_member_joined' then case c.variant
          when 1 then 'Someone found the door'
          when 2 then 'Reinforcements have arrived'
          when 3 then 'The list just got longer'
          when 4 then 'New arrival'
          else 'Another person joins the case'
        end
        when 'table_created' then case c.variant
          when 1 then 'New table just dropped'
          when 2 then 'Another matter pending'
          when 3 then 'A new case is open'
          when 4 then 'Another table. Inevitable.'
          else 'A fresh problem has appeared'
        end
        when 'table_row_created' then case c.variant
          when 1 then 'New entry on the record'
          when 2 then 'Movement on the table'
          when 3 then 'Someone put it in writing'
          when 4 then 'The table gets complicated'
          else 'A new piece on the board'
        end
        when 'table_closed' then case c.variant
          when 1 then 'Case closed'
          when 2 then 'No room left'
          when 3 then 'Final result'
          when 4 then 'The table has spoken'
          else 'Official discussion over'
        end
      end
    else p_title end,
    case when recipient.locale = 'en' then
      case p_kind
        when 'group_member_joined' then case c.variant
          when 1 then c.actor_name || ' is now inside ' || c.group_name || '. Let the record show it.'
          when 2 then c.actor_name || ' joined ' || c.group_name || '. There is now another witness.'
          when 3 then c.actor_name || ' entered ' || c.group_name || '. References were not requested.'
          when 4 then c.actor_name || ' is now part of ' || c.group_name || '. This is escalating nicely.'
          else c.actor_name || ' joins ' || c.group_name || '. Everything remains perfectly under control. 👀'
        end
        when 'table_created' then case c.variant
          when 1 then c.actor_name || ' created “' || c.table_name || '” in ' || c.group_name || '. You may now disagree methodically.'
          when 2 then '“' || c.table_name || '” appeared in ' || c.group_name || '. Unsupported opinions have lost market value.'
          when 3 then c.actor_name || ' opened “' || c.table_name || '”. From here on, everything can go on the record.'
          when 4 then '“' || c.table_name || '” now exists. Clearly there were not enough things to score.'
          else c.actor_name || ' created “' || c.table_name || '”. The questionable-decisions committee is in session. 📋'
        end
        when 'table_row_created' then case c.variant
          when 1 then c.actor_name || ' added an entry to “' || c.table_name || '”. The leaderboard has taken note.'
          when 2 then '“' || c.table_name || '” has one more entry. Statistical peace did not last.'
          when 3 then c.actor_name || ' wrote something down in “' || c.table_name || '”. Denial will be harder now.'
          when 4 then 'New entry in “' || c.table_name || '”. The figures have changed again.'
          else c.actor_name || ' made a move in “' || c.table_name || '”. The leaderboard may be worth checking. 👀'
        end
        when 'table_closed' then case c.variant
          when 1 then c.actor_name || ' closed “' || c.table_name || '”. The points are no longer accepting appeals.'
          when 2 then '“' || c.table_name || '” is closed. Being late still earns no points.'
          when 3 then 'The figures for “' || c.table_name || '” are final. Time to fake sportsmanship.'
          when 4 then '“' || c.table_name || '” is over. The leaderboard may now inconvenience the relevant parties.'
          else c.actor_name || ' ended “' || c.table_name || '”. Complaints go directly to archives. 🏁'
        end
      end
    else p_body end
  from public.grupo_miembros gm
  join public.perfiles recipient on recipient.id = gm.user_id
  cross join notification_context c
  where gm.group_id = p_group_id
    and (p_actor_id is null or gm.user_id <> p_actor_id);
$$;
