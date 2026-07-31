-- HeVi Tables: initial schema, rule engine, RLS and Storage policies.
-- Apply with `supabase db push` or paste this migration in Supabase SQL Editor.

create extension if not exists pgcrypto;

create type public.point_system as enum ('WtA', 'Pod', 'EC');

create table public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (char_length(username) between 1 and 30),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tablas (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  creator_id uuid not null references public.perfiles(id) on delete restrict,
  point_system public.point_system not null,
  max_point integer not null check (max_point between 1 and 100000),
  design_url text,
  closed boolean not null default false,
  closed_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint closed_date_consistency check (
    (closed = false and closed_date is null)
    or (closed = true and closed_date is not null)
  )
);

create table public.tabla_filas (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.tablas(id) on delete cascade,
  user_ids uuid[] not null check (cardinality(user_ids) > 0),
  notes text check (char_length(notes) <= 500),
  points_receivable integer,
  position integer,
  points_won integer not null default 0 check (points_won >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint non_negative_receivable check (
    points_receivable is null or points_receivable >= 0
  ),
  constraint positive_position check (position is null or position > 0)
);

create index tablas_creator_id_idx on public.tablas(creator_id);
create index tablas_closed_date_idx
  on public.tablas(closed, closed_date desc);
create index tabla_filas_table_id_idx on public.tabla_filas(table_id);
create index tabla_filas_user_ids_idx
  on public.tabla_filas using gin(user_ids);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger perfiles_set_updated_at
before update on public.perfiles
for each row execute procedure public.set_updated_at();

create trigger tablas_set_updated_at
before update on public.tablas
for each row execute procedure public.set_updated_at();

create trigger tabla_filas_set_updated_at
before update on public.tabla_filas
for each row execute procedure public.set_updated_at();

create or replace function public.validate_table_row()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_system public.point_system;
  v_max_point integer;
  v_closed boolean;
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

  select point_system, max_point, closed
  into v_system, v_max_point, v_closed
  from public.tablas
  where id = new.table_id;

  if not found then
    raise exception 'Tabla no encontrada';
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

create trigger tabla_filas_validate
before insert or update of table_id, user_ids, points_receivable, position
on public.tabla_filas
for each row execute procedure public.validate_table_row();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, username)
  values (
    new.id,
    left(
      coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
        nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(split_part(new.email, '@', 1), ''),
        'amigo'
      ),
      30
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- The authoritative, atomic and irreversible closing operation.
create or replace function public.close_table(p_table_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_creator_id uuid;
  v_system public.point_system;
  v_max_point integer;
  v_closed boolean;
  v_row_count integer;
begin
  select creator_id, point_system, max_point, closed
  into v_creator_id, v_system, v_max_point, v_closed
  from public.tablas
  where id = p_table_id
  for update;

  if not found then
    raise exception 'Tabla no encontrada';
  end if;

  if (select auth.uid()) is null or (select auth.uid()) <> v_creator_id then
    raise exception 'Solo el creador puede cerrar la tabla';
  end if;

  if v_closed then
    raise exception 'La tabla ya está cerrada';
  end if;

  select count(*) into v_row_count
  from public.tabla_filas
  where table_id = p_table_id;

  if v_row_count = 0 then
    raise exception 'Añade al menos una fila antes de cerrar';
  end if;

  if v_system = 'WtA' and (
    select count(*)
    from public.tabla_filas
    where table_id = p_table_id and position = 1
  ) <> 1 then
    raise exception 'WtA necesita exactamente una fila ganadora';
  end if;

  if v_system = 'Pod' and exists (
    select 1
    from public.tabla_filas
    where table_id = p_table_id
      and (position is null or position < 1)
  ) then
    raise exception 'Todas las filas de Pod necesitan una posición';
  end if;

  if v_system = 'Pod' and exists (
    select position
    from public.tabla_filas
    where table_id = p_table_id
    group by position
    having count(*) > 1
  ) then
    raise exception 'Las posiciones de Pod no pueden repetirse';
  end if;

  if v_system = 'EC' and exists (
    select 1
    from public.tabla_filas
    where table_id = p_table_id
      and (
        points_receivable is null
        or points_receivable < 0
        or points_receivable > v_max_point
      )
  ) then
    raise exception 'Los puntos EC deben estar entre 0 y el máximo';
  end if;

  update public.tabla_filas
  set points_won = case v_system
    when 'WtA' then case when position = 1 then v_max_point else 0 end
    when 'Pod' then greatest(v_max_point - ((position - 1) * 2), 0)
    when 'EC' then points_receivable
  end
  where table_id = p_table_id;

  update public.tablas
  set closed = true, closed_date = now()
  where id = p_table_id;
end;
$$;

create or replace function public.get_leaderboard(
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
  with participants as (
    select
      unnest(f.user_ids) as participant_id,
      f.table_id,
      f.points_won
    from public.tabla_filas f
    join public.tablas t on t.id = f.table_id
    where t.closed = true
      and (p_table_id is null or t.id = p_table_id)
      and t.closed_date >= case p_period
        when 'week' then now() - interval '7 days'
        when 'month' then now() - interval '30 days'
        when 'all' then '-infinity'::timestamptz
        else now()
      end
  )
  select
    p.id as user_id,
    p.username,
    p.avatar_url,
    coalesce(sum(participants.points_won), 0)::bigint as points,
    count(distinct participants.table_id)::bigint as tables_count
  from public.perfiles p
  left join participants on participants.participant_id = p.id
  group by p.id, p.username, p.avatar_url
  order by points desc, p.username asc;
$$;

create or replace function public.healthcheck()
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select now();
$$;

alter table public.perfiles enable row level security;
alter table public.tablas enable row level security;
alter table public.tabla_filas enable row level security;

create policy "Authenticated users can read profiles"
on public.perfiles for select
to authenticated
using (true);

create policy "Users can insert their own profile"
on public.perfiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
on public.perfiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Authenticated users can read tables"
on public.tablas for select
to authenticated
using (true);

create policy "Creators can insert tables"
on public.tablas for insert
to authenticated
with check (
  (select auth.uid()) = creator_id
  and closed = false
  and closed_date is null
);

create policy "Creators can update open tables"
on public.tablas for update
to authenticated
using ((select auth.uid()) = creator_id and closed = false)
with check (
  (select auth.uid()) = creator_id
  and closed = false
  and closed_date is null
);

create policy "Creators can delete open tables"
on public.tablas for delete
to authenticated
using ((select auth.uid()) = creator_id and closed = false);

create policy "Authenticated users can read rows"
on public.tabla_filas for select
to authenticated
using (true);

create policy "Creators can insert rows in open tables"
on public.tabla_filas for insert
to authenticated
with check (
  exists (
    select 1
    from public.tablas t
    where t.id = table_id
      and t.creator_id = (select auth.uid())
      and t.closed = false
  )
);

create policy "Creators can update rows in open tables"
on public.tabla_filas for update
to authenticated
using (
  exists (
    select 1
    from public.tablas t
    where t.id = table_id
      and t.creator_id = (select auth.uid())
      and t.closed = false
  )
)
with check (
  exists (
    select 1
    from public.tablas t
    where t.id = table_id
      and t.creator_id = (select auth.uid())
      and t.closed = false
  )
);

create policy "Creators can delete rows in open tables"
on public.tabla_filas for delete
to authenticated
using (
  exists (
    select 1
    from public.tablas t
    where t.id = table_id
      and t.creator_id = (select auth.uid())
      and t.closed = false
  )
);

grant usage on schema public to anon, authenticated;
grant select on public.perfiles, public.tablas, public.tabla_filas to authenticated;
grant insert (id, username, avatar_url) on public.perfiles to authenticated;
grant update (username, avatar_url) on public.perfiles to authenticated;
grant insert (name, creator_id, point_system, max_point, design_url)
  on public.tablas to authenticated;
grant update (name, point_system, max_point, design_url)
  on public.tablas to authenticated;
grant delete on public.tablas to authenticated;
grant insert (table_id, user_ids, notes, points_receivable, position)
  on public.tabla_filas to authenticated;
grant update (user_ids, notes, points_receivable, position)
  on public.tabla_filas to authenticated;
grant delete on public.tabla_filas to authenticated;
revoke all on function public.close_table(uuid) from public, anon;
grant execute on function public.close_table(uuid) to authenticated;
revoke all on function public.get_leaderboard(text, uuid) from public, anon;
grant execute on function public.get_leaderboard(text, uuid) to authenticated;
revoke all on function public.healthcheck() from public;
grant execute on function public.healthcheck() to anon, authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values
  (
    'avatars',
    'avatars',
    true,
    2097152,
    array['image/png', 'image/jpeg', 'image/webp']
  ),
  (
    'tablas_disenos',
    'tablas_disenos',
    true,
    5242880,
    array['image/png']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Public images are readable"
on storage.objects for select
to anon, authenticated
using (bucket_id in ('avatars', 'tablas_disenos'));

create policy "Users upload avatars to their folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users update avatars in their folder"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users delete avatars in their folder"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users upload designs to their folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'tablas_disenos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users update designs in their folder"
on storage.objects for update
to authenticated
using (
  bucket_id = 'tablas_disenos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'tablas_disenos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users delete designs in their folder"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'tablas_disenos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
