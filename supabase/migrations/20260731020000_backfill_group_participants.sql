-- Keep every participant from pre-group tables connected to the migrated group.

insert into public.grupo_miembros (group_id, user_id, role)
select distinct t.group_id, participant.user_id, 'member'::public.group_role
from public.tablas t
join public.tabla_filas f on f.table_id = t.id
cross join lateral unnest(f.user_ids) as participant(user_id)
on conflict (group_id, user_id) do nothing;
