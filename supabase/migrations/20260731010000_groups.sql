-- Group-first navigation, invite codes, scoped tables and group leaderboards.

create type public.group_role as enum ('owner', 'member');

create table public.grupos (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  owner_id uuid not null references public.perfiles(id) on delete cascade,
  invite_code text not null unique
    default upper(left(replace(gen_random_uuid()::text, '-', ''), 10)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invite_code_format check (invite_code ~ '^[A-F0-9]{10}$')
);

create table public.grupo_miembros (
  group_id uuid not null references public.grupos(id) on delete cascade,
  user_id uuid not null references public.perfiles(id) on delete cascade,
  role public.group_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table public.tablas
add column group_id uuid references public.grupos(id) on delete cascade;

create index grupos_owner_id_idx on public.grupos(owner_id);
create index grupo_miembros_user_id_idx on public.grupo_miembros(user_id);
create index tablas_group_id_idx on public.tablas(group_id);

create trigger grupos_set_updated_at
before update on public.grupos
for each row execute procedure public.set_updated_at();

-- Preserve existing tables by creating one private group per existing profile.
insert into public.grupos (name, owner_id)
select left('Grupo de ' || p.username, 80), p.id
from public.perfiles p;

insert into public.grupo_miembros (group_id, user_id, role)
select g.id, g.owner_id, 'owner'::public.group_role
from public.grupos g;

update public.tablas t
set group_id = g.id
from public.grupos g
where g.owner_id = t.creator_id;

alter table public.tablas
alter column group_id set not null;

create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.grupo_miembros gm
    where gm.group_id = p_group_id
      and gm.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_group_owner(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.grupos g
    where g.id = p_group_id
      and g.owner_id = (select auth.uid())
  );
$$;

create or replace function public.shares_group_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id = (select auth.uid()) or exists (
    select 1
    from public.grupo_miembros mine
    join public.grupo_miembros theirs
      on theirs.group_id = mine.group_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = p_user_id
  );
$$;

create or replace function public.create_group(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_group_id uuid;
  v_name text := trim(p_name);
begin
  if v_user_id is null then
    raise exception 'Necesitas iniciar sesión';
  end if;

  if char_length(v_name) < 1 or char_length(v_name) > 80 then
    raise exception 'El nombre debe tener entre 1 y 80 caracteres';
  end if;

  insert into public.grupos (name, owner_id)
  values (v_name, v_user_id)
  returning id into v_group_id;

  insert into public.grupo_miembros (group_id, user_id, role)
  values (v_group_id, v_user_id, 'owner');

  return v_group_id;
end;
$$;

create or replace function public.join_group_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_group_id uuid;
  v_code text := upper(replace(replace(trim(p_code), '-', ''), ' ', ''));
begin
  if v_user_id is null then
    raise exception 'Necesitas iniciar sesión';
  end if;

  select g.id into v_group_id
  from public.grupos g
  where g.invite_code = v_code;

  if v_group_id is null then
    raise exception 'El código de invitación no es válido';
  end if;

  insert into public.grupo_miembros (group_id, user_id, role)
  values (v_group_id, v_user_id, 'member')
  on conflict (group_id, user_id) do nothing;

  return v_group_id;
end;
$$;

create or replace function public.rotate_group_invite_code(p_group_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  if not public.is_group_owner(p_group_id) then
    raise exception 'Solo el creador puede renovar el código';
  end if;

  update public.grupos
  set invite_code = upper(left(replace(gen_random_uuid()::text, '-', ''), 10))
  where id = p_group_id
  returning invite_code into v_code;

  return v_code;
end;
$$;

create or replace function public.validate_table_row()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_system public.point_system;
  v_max_point integer;
  v_closed boolean;
  v_group_id uuid;
begin
  if cardinality(new.user_ids) <> (
    select count(distinct participant_id)
    from unnest(new.user_ids) as ids(participant_id)
  ) then
    raise exception 'Una persona no puede repetirse dentro de la misma fila';
  end if;

  if exists (
    select 1
    from unnest(new.user_ids) as ids(participant_id)
    left join public.perfiles p on p.id = participant_id
    where p.id is null
  ) then
    raise exception 'Todos los participantes deben tener un perfil';
  end if;

  select point_system, max_point, closed, group_id
  into v_system, v_max_point, v_closed, v_group_id
  from public.tablas
  where id = new.table_id;

  if not found then
    raise exception 'Tabla no encontrada';
  end if;

  if exists (
    select 1
    from unnest(new.user_ids) as ids(participant_id)
    left join public.grupo_miembros gm
      on gm.group_id = v_group_id and gm.user_id = participant_id
    where gm.user_id is null
  ) then
    raise exception 'Todos los participantes deben pertenecer al grupo';
  end if;

  if v_closed then
    raise exception 'No se puede modificar una tabla cerrada';
  end if;

  if v_system = 'EC' then
    if (
      new.points_receivable is null
      or new.points_receivable < 0
      or new.points_receivable > v_max_point
    ) then
      raise exception 'Los puntos EC deben estar entre 0 y el máximo';
    end if;
    new.position = null;
  else
    new.points_receivable = null;
    if v_system = 'WtA' and new.position is not null and new.position <> 1 then
      raise exception 'WtA solo admite la posición ganadora';
    end if;
    if v_system = 'Pod' and new.position is null then
      raise exception 'Las filas de Pod necesitan una posición';
    end if;
  end if;

  return new;
end;
$$;

drop function public.get_leaderboard(text, uuid);

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
  participants as (
    select
      unnest(f.user_ids) as participant_id,
      f.table_id,
      f.points_won
    from public.tabla_filas f
    join public.tablas t on t.id = f.table_id
    where t.group_id = p_group_id
      and t.closed = true
      and (p_table_id is null or t.id = p_table_id)
      and t.closed_date >= case p_period
        when 'week' then now() - interval '7 days'
        when 'month' then now() - interval '30 days'
        when 'all' then '-infinity'::timestamptz
        else now()
      end
  )
  select
    m.id as user_id,
    m.username,
    m.avatar_url,
    coalesce(sum(participants.points_won), 0)::bigint as points,
    count(distinct participants.table_id)::bigint as tables_count
  from members m
  left join participants on participants.participant_id = m.id
  group by m.id, m.username, m.avatar_url
  order by points desc, m.username asc;
$$;

alter table public.grupos enable row level security;
alter table public.grupo_miembros enable row level security;

drop policy "Authenticated users can read profiles" on public.perfiles;
create policy "Users can read profiles from shared groups"
on public.perfiles for select
to authenticated
using (public.shares_group_with(id));

drop policy "Authenticated users can read tables" on public.tablas;
drop policy "Creators can insert tables" on public.tablas;
drop policy "Creators can update open tables" on public.tablas;
drop policy "Creators can delete open tables" on public.tablas;

create policy "Members can read group tables"
on public.tablas for select
to authenticated
using (public.is_group_member(group_id));

create policy "Members can create group tables"
on public.tablas for insert
to authenticated
with check (
  (select auth.uid()) = creator_id
  and public.is_group_member(group_id)
  and closed = false
  and closed_date is null
);

create policy "Creators can update open group tables"
on public.tablas for update
to authenticated
using ((select auth.uid()) = creator_id and closed = false)
with check (
  (select auth.uid()) = creator_id
  and public.is_group_member(group_id)
  and closed = false
  and closed_date is null
);

create policy "Creators can delete open group tables"
on public.tablas for delete
to authenticated
using ((select auth.uid()) = creator_id and closed = false);

drop policy "Authenticated users can read rows" on public.tabla_filas;
create policy "Members can read rows from group tables"
on public.tabla_filas for select
to authenticated
using (
  exists (
    select 1
    from public.tablas t
    where t.id = table_id
      and public.is_group_member(t.group_id)
  )
);

create policy "Members can read their groups"
on public.grupos for select
to authenticated
using (public.is_group_member(id));

create policy "Owners can update their groups"
on public.grupos for update
to authenticated
using (public.is_group_owner(id))
with check ((select auth.uid()) = owner_id);

create policy "Members can read group memberships"
on public.grupo_miembros for select
to authenticated
using (public.is_group_member(group_id));

grant select on public.grupos, public.grupo_miembros to authenticated;
grant update (name) on public.grupos to authenticated;
grant insert (name, creator_id, group_id, point_system, max_point, design_url)
  on public.tablas to authenticated;

revoke all on function public.is_group_member(uuid) from public, anon;
revoke all on function public.is_group_owner(uuid) from public, anon;
revoke all on function public.shares_group_with(uuid) from public, anon;
grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.is_group_owner(uuid) to authenticated;
grant execute on function public.shares_group_with(uuid) to authenticated;

revoke all on function public.create_group(text) from public, anon;
revoke all on function public.join_group_by_code(text) from public, anon;
revoke all on function public.rotate_group_invite_code(uuid) from public, anon;
revoke all on function public.get_group_leaderboard(uuid, text, uuid)
  from public, anon;
grant execute on function public.create_group(text) to authenticated;
grant execute on function public.join_group_by_code(text) to authenticated;
grant execute on function public.rotate_group_invite_code(uuid) to authenticated;
grant execute on function public.get_group_leaderboard(uuid, text, uuid)
  to authenticated;
