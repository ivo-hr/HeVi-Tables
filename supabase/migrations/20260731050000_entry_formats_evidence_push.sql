-- Typed entry information, private evidence images, and per-device Web Push.

create type public.entry_info_format as enum ('text', 'number');
create type public.number_sort_order as enum ('asc', 'desc');

alter table public.tablas
add column info_format public.entry_info_format not null default 'text',
add column number_sort_order public.number_sort_order;

alter table public.tablas
add constraint table_number_sort_consistency check (
  (info_format = 'text' and number_sort_order is null)
  or (info_format = 'number' and number_sort_order is not null)
);

alter table public.tabla_filas
add column numeric_value numeric,
add column evidence_paths text[] not null default '{}',
add constraint row_evidence_limit check (cardinality(evidence_paths) <= 3);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.perfiles(id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) between 1 and 2048),
  p256dh text not null check (char_length(p256dh) between 1 and 512),
  auth text not null check (char_length(auth) between 1 and 256),
  user_agent text check (user_agent is null or char_length(user_agent) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index push_subscriptions_user_id_idx
  on public.push_subscriptions(user_id);

create trigger push_subscriptions_set_updated_at
before update on public.push_subscriptions
for each row execute procedure public.set_updated_at();

drop trigger tabla_filas_validate on public.tabla_filas;

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
  v_info_format public.entry_info_format;
begin
  if cardinality(new.user_ids) <> (
    select count(distinct participant_id)
    from unnest(new.user_ids) as ids(participant_id)
  ) then
    raise exception 'Una persona no puede repetirse dentro de la misma fila';
  end if;

  if cardinality(new.evidence_paths) > 3 then
    raise exception 'Cada registro admite un máximo de tres evidencias';
  end if;

  if exists (
    select 1
    from unnest(new.user_ids) as ids(participant_id)
    left join public.perfiles p on p.id = participant_id
    where p.id is null
  ) then
    raise exception 'Todos los participantes deben tener un perfil';
  end if;

  select point_system, max_point, closed, group_id, info_format
  into v_system, v_max_point, v_closed, v_group_id, v_info_format
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

  if v_info_format = 'number' then
    if new.numeric_value is null then
      raise exception 'Este registro necesita una cantidad numérica';
    end if;
    new.notes = null;
  else
    new.numeric_value = null;
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
    if v_info_format = 'text' and v_system = 'WtA'
      and new.position is not null and new.position <> 1 then
      raise exception 'WtA solo admite la posición ganadora';
    elsif v_info_format = 'text' and v_system = 'Pod' and new.position is null then
      raise exception 'Las filas de Pod necesitan una posición';
    end if;
  end if;

  return new;
end;
$$;

create trigger tabla_filas_validate
before insert or update of
  table_id,
  user_ids,
  notes,
  numeric_value,
  evidence_paths,
  points_receivable,
  position
on public.tabla_filas
for each row execute procedure public.validate_table_row();

drop function public.update_table_settings(uuid, text, date, text);

create or replace function public.update_table_settings(
  p_table_id uuid,
  p_design_url text,
  p_scheduled_close_date date,
  p_description text,
  p_info_format public.entry_info_format,
  p_number_sort_order public.number_sort_order
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_creator_id uuid;
  v_description text := nullif(trim(p_description), '');
  v_info_format public.entry_info_format;
  v_number_sort_order public.number_sort_order;
begin
  select creator_id, info_format, number_sort_order
  into v_creator_id, v_info_format, v_number_sort_order
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

  if p_info_format = 'number' and p_number_sort_order is null then
    raise exception 'El formato numérico necesita un orden';
  end if;

  if p_info_format = 'text' then
    p_number_sort_order := null;
  end if;

  if (
    p_info_format is distinct from v_info_format
    or p_number_sort_order is distinct from v_number_sort_order
  ) and exists (
    select 1 from public.tabla_filas where table_id = p_table_id
  ) then
    raise exception 'El formato solo puede cambiarse antes de añadir registros';
  end if;

  update public.tablas
  set
    design_url = p_design_url,
    scheduled_close_date = p_scheduled_close_date,
    description = v_description,
    info_format = p_info_format,
    number_sort_order = p_number_sort_order
  where id = p_table_id;
end;
$$;

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
  v_info_format public.entry_info_format;
  v_number_sort_order public.number_sort_order;
begin
  select
    creator_id,
    point_system,
    max_point,
    closed,
    info_format,
    number_sort_order
  into
    v_creator_id,
    v_system,
    v_max_point,
    v_closed,
    v_info_format,
    v_number_sort_order
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

  if v_info_format = 'number' and exists (
    select 1
    from public.tabla_filas
    where table_id = p_table_id and numeric_value is null
  ) then
    raise exception 'Todos los registros necesitan una cantidad numérica';
  end if;

  if v_info_format = 'number' and v_system in ('WtA', 'Pod') then
    with ranked as (
      select
        id,
        row_number() over (
          order by
            case when v_number_sort_order = 'asc' then numeric_value end asc,
            case when v_number_sort_order = 'desc' then numeric_value end desc,
            created_at asc,
            id asc
        )::integer as automatic_position
      from public.tabla_filas
      where table_id = p_table_id
    )
    update public.tabla_filas f
    set position = case
      when v_system = 'WtA' and ranked.automatic_position = 1 then 1
      when v_system = 'WtA' then null
      else ranked.automatic_position
    end
    from ranked
    where f.id = ranked.id;
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

alter table public.push_subscriptions enable row level security;

create policy "Users manage their own push subscriptions"
on public.push_subscriptions for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update, delete
  on public.push_subscriptions to authenticated;
grant insert (info_format, number_sort_order)
  on public.tablas to authenticated;
grant insert (numeric_value, evidence_paths)
  on public.tabla_filas to authenticated;
grant update (numeric_value, evidence_paths)
  on public.tabla_filas to authenticated;

revoke all on function public.update_table_settings(
  uuid,
  text,
  date,
  text,
  public.entry_info_format,
  public.number_sort_order
) from public, anon;
grant execute on function public.update_table_settings(
  uuid,
  text,
  date,
  text,
  public.entry_info_format,
  public.number_sort_order
) to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'tabla_evidencias',
  'tabla_evidencias',
  false,
  1048576,
  array['image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_access_table_evidence(p_object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_parts text[];
  v_table_id uuid;
begin
  v_parts := storage.foldername(p_object_name);
  if cardinality(v_parts) < 2 then
    return false;
  end if;

  begin
    v_table_id := v_parts[2]::uuid;
  exception when invalid_text_representation then
    return false;
  end;

  return exists (
    select 1
    from public.tablas t
    where t.id = v_table_id
      and public.is_group_member(t.group_id)
  );
end;
$$;

create policy "Group members can read table evidence"
on storage.objects for select
to authenticated
using (
  bucket_id = 'tabla_evidencias'
  and public.can_access_table_evidence(name)
);

create policy "Creators upload table evidence"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'tabla_evidencias'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.tablas t
    where t.id::text = (storage.foldername(name))[2]
      and t.creator_id = (select auth.uid())
      and t.closed = false
  )
);

create policy "Creators delete table evidence"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'tabla_evidencias'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.tablas t
    where t.id::text = (storage.foldername(name))[2]
      and t.creator_id = (select auth.uid())
      and t.closed = false
  )
);

revoke all on function public.can_access_table_evidence(text)
  from public, anon;
grant execute on function public.can_access_table_evidence(text)
  to authenticated;

-- The webhook configuration is deliberately empty. Production stores its URL and
-- shared secret here, while VAPID keys stay in Edge Function secrets.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.push_delivery_config (
  singleton boolean primary key default true check (singleton),
  webhook_url text not null,
  webhook_secret text not null,
  updated_at timestamptz not null default now()
);

create extension if not exists pg_net with schema extensions;

create or replace function private.dispatch_web_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  select webhook_url, webhook_secret
  into v_url, v_secret
  from private.push_delivery_config
  where singleton = true;

  if v_url is null or v_secret is null then
    return new;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-hevi-webhook-secret', v_secret
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'schema', 'public',
      'table', 'notificaciones',
      'record', to_jsonb(new)
    ),
    timeout_milliseconds := 5000
  );

  return new;
end;
$$;

create trigger notificaciones_dispatch_web_push
after insert on public.notificaciones
for each row execute procedure private.dispatch_web_push();
