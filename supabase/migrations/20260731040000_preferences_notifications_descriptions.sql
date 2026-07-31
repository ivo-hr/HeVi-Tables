-- User appearance preferences, table descriptions, and durable notifications.

create type public.notification_kind as enum (
  'group_member_joined',
  'table_created',
  'table_row_created',
  'table_closed'
);

alter table public.perfiles
add column theme_preference text not null default 'system'
  check (theme_preference in ('light', 'dark', 'system')),
add column accent_color text not null default 'emerald'
  check (accent_color in ('emerald', 'blue', 'violet', 'orange', 'rose'));

alter table public.tablas
add column description text
  check (description is null or char_length(description) <= 280);

create table public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.perfiles(id) on delete cascade,
  kind public.notification_kind not null,
  group_id uuid references public.grupos(id) on delete cascade,
  table_id uuid references public.tablas(id) on delete cascade,
  actor_id uuid references public.perfiles(id) on delete set null,
  title text not null check (char_length(title) between 1 and 100),
  body text not null check (char_length(body) between 1 and 280),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notificaciones_user_created_idx
  on public.notificaciones(user_id, created_at desc);
create index notificaciones_unread_idx
  on public.notificaciones(user_id, created_at desc)
  where read_at is null;

drop function public.update_table_settings(uuid, text, date);

create or replace function public.update_table_settings(
  p_table_id uuid,
  p_design_url text,
  p_scheduled_close_date date,
  p_description text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_creator_id uuid;
  v_description text := nullif(trim(p_description), '');
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

  if v_description is not null and char_length(v_description) > 280 then
    raise exception 'La descripción no puede superar 280 caracteres';
  end if;

  update public.tablas
  set
    design_url = p_design_url,
    scheduled_close_date = p_scheduled_close_date,
    description = v_description
  where id = p_table_id;
end;
$$;

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
    p_title,
    p_body
  from public.grupo_miembros gm
  where gm.group_id = p_group_id
    and (p_actor_id is null or gm.user_id <> p_actor_id);
$$;

create or replace function public.notify_group_member_joined()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_name text;
  v_username text;
begin
  select name into v_group_name from public.grupos where id = new.group_id;
  select username into v_username from public.perfiles where id = new.user_id;

  perform public.notify_group_members(
    new.group_id,
    'group_member_joined',
    'Nuevo miembro',
    v_username || ' se ha unido a ' || v_group_name || '. Ya podéis repartir responsabilidades.',
    null,
    new.user_id
  );
  return new;
end;
$$;

create trigger grupo_miembros_notify_insert
after insert on public.grupo_miembros
for each row execute procedure public.notify_group_member_joined();

create or replace function public.notify_table_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text;
begin
  select username into v_username from public.perfiles where id = new.creator_id;
  perform public.notify_group_members(
    new.group_id,
    'table_created',
    'Nueva tabla',
    v_username || ' ha creado “' || new.name || '”. Empiezan las decisiones discutibles.',
    new.id,
    new.creator_id
  );
  return new;
end;
$$;

create trigger tablas_notify_insert
after insert on public.tablas
for each row execute procedure public.notify_table_created();

create or replace function public.notify_table_row_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_id uuid;
  v_table_name text;
  v_actor_id uuid;
begin
  select group_id, name, creator_id
  into v_group_id, v_table_name, v_actor_id
  from public.tablas
  where id = new.table_id;

  v_actor_id := coalesce((select auth.uid()), v_actor_id);
  perform public.notify_group_members(
    v_group_id,
    'table_row_created',
    'Nuevo registro',
    'Hay un nuevo registro en “' || v_table_name || '”. Conviene fingir que estaba previsto.',
    new.table_id,
    v_actor_id
  );
  return new;
end;
$$;

create trigger tabla_filas_notify_insert
after insert on public.tabla_filas
for each row execute procedure public.notify_table_row_created();

create or replace function public.notify_table_closed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := coalesce((select auth.uid()), new.creator_id);
begin
  if new.closed = true and old.closed = false then
    perform public.notify_group_members(
      new.group_id,
      'table_closed',
      'Tabla cerrada',
      '“' || new.name || '” ha terminado. Los puntos ya no admiten recursos.',
      new.id,
      v_actor_id
    );
  end if;
  return new;
end;
$$;

create trigger tablas_notify_closed
after update of closed on public.tablas
for each row execute procedure public.notify_table_closed();

alter table public.notificaciones enable row level security;

create policy "Users can read their notifications"
on public.notificaciones for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can mark their notifications as read"
on public.notificaciones for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select on public.notificaciones to authenticated;
grant update (read_at) on public.notificaciones to authenticated;
grant update (theme_preference, accent_color) on public.perfiles to authenticated;
grant insert (description) on public.tablas to authenticated;

revoke all on function public.update_table_settings(uuid, text, date, text)
  from public, anon;
grant execute on function public.update_table_settings(uuid, text, date, text)
  to authenticated;
revoke all on function public.notify_group_members(
  uuid,
  public.notification_kind,
  text,
  text,
  uuid,
  uuid
) from public, anon, authenticated;

alter table public.notificaciones replica identity full;

do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notificaciones'
  ) then
    execute 'alter publication supabase_realtime add table public.notificaciones';
  end if;
end;
$$;
