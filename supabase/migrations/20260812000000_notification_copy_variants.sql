-- Give each event one of five stable copy variants. The chosen wording is stored
-- with the notification, so in-app and device notifications always agree.

create or replace function private.notification_variant(p_seed uuid)
returns smallint
language sql
immutable
strict
set search_path = ''
as $$
  select (
    mod(
      ('x' || substr(md5(p_seed::text), 1, 8))::bit(32)::bigint,
      5
    ) + 1
  )::smallint;
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
  v_variant smallint := private.notification_variant(new.user_id);
  v_title text;
  v_body text;
begin
  select name into v_group_name from public.grupos where id = new.group_id;
  select username into v_username from public.perfiles where id = new.user_id;
  v_username := coalesce(v_username, 'Alguien');

  v_title := case v_variant
    when 1 then 'Alguien ha encontrado la puerta'
    when 2 then 'Tenemos refuerzo'
    when 3 then 'La lista acaba de crecer'
    when 4 then 'Nueva incorporación'
    else 'Se suma otra persona'
  end;
  v_body := case v_variant
    when 1 then v_username || ' ya está dentro de ' || v_group_name || '. Que conste en acta.'
    when 2 then v_username || ' se ha unido a ' || v_group_name || '. Ahora hay otro testigo.'
    when 3 then v_username || ' entra en ' || v_group_name || '. Nadie ha pedido referencias.'
    when 4 then v_username || ' ya forma parte de ' || v_group_name || '. Esto escala con rapidez.'
    else v_username || ' se suma a ' || v_group_name || '. Todo perfectamente bajo control. 👀'
  end;

  perform public.notify_group_members(
    new.group_id,
    'group_member_joined',
    v_title,
    v_body,
    null,
    new.user_id
  );
  return new;
end;
$$;

create or replace function public.notify_table_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_name text;
  v_username text;
  v_variant smallint := private.notification_variant(new.id);
  v_title text;
  v_body text;
begin
  select name into v_group_name from public.grupos where id = new.group_id;
  select username into v_username from public.perfiles where id = new.creator_id;
  v_username := coalesce(v_username, 'Alguien');

  v_title := case v_variant
    when 1 then 'Hay tabla nueva'
    when 2 then 'Nuevo asunto pendiente'
    when 3 then 'Se abre el expediente'
    when 4 then 'Otra tabla. Era inevitable.'
    else 'Tenemos un frente nuevo'
  end;
  v_body := case v_variant
    when 1 then v_username || ' ha creado “' || new.name || '” en ' || v_group_name || '. Ya podéis discrepar con método.'
    when 2 then '“' || new.name || '” acaba de aparecer en ' || v_group_name || '. Las opiniones sin datos pierden valor.'
    when 3 then v_username || ' abre “' || new.name || '”. A partir de aquí, todo puede quedar por escrito.'
    when 4 then 'Ya existe “' || new.name || '”. Claramente faltaban más cosas que puntuar.'
    else v_username || ' ha creado “' || new.name || '”. El comité de decisiones cuestionables queda convocado. 📋'
  end;

  perform public.notify_group_members(
    new.group_id,
    'table_created',
    v_title,
    v_body,
    new.id,
    new.creator_id
  );
  return new;
end;
$$;

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
  v_username text;
  v_variant smallint := private.notification_variant(new.id);
  v_title text;
  v_body text;
begin
  select group_id, name, creator_id
  into v_group_id, v_table_name, v_actor_id
  from public.tablas
  where id = new.table_id;

  v_actor_id := coalesce((select auth.uid()), v_actor_id);
  select username into v_username from public.perfiles where id = v_actor_id;
  v_username := coalesce(v_username, 'Alguien');

  v_title := case v_variant
    when 1 then 'Hay un registro nuevo'
    when 2 then 'Movimiento en la tabla'
    when 3 then 'Alguien ha dejado constancia'
    when 4 then 'La tabla se complica'
    else 'Nueva pieza en el tablero'
  end;
  v_body := case v_variant
    when 1 then v_username || ' ha añadido una fila a “' || v_table_name || '”. El ranking ya ha tomado nota.'
    when 2 then '“' || v_table_name || '” tiene un registro más. La calma estadística ha durado poco.'
    when 3 then v_username || ' ha escrito en “' || v_table_name || '”. Negarlo ya será más difícil.'
    when 4 then 'Nueva fila en “' || v_table_name || '”. Las cuentas acaban de cambiar otra vez.'
    else v_username || ' mueve ficha en “' || v_table_name || '”. Conviene mirar el ranking. 👀'
  end;

  perform public.notify_group_members(
    v_group_id,
    'table_row_created',
    v_title,
    v_body,
    new.table_id,
    v_actor_id
  );
  return new;
end;
$$;

create or replace function public.notify_table_closed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := coalesce((select auth.uid()), new.creator_id);
  v_username text;
  v_variant smallint := private.notification_variant(new.id);
  v_title text;
  v_body text;
begin
  if new.closed = true and old.closed = false then
    select username into v_username from public.perfiles where id = v_actor_id;
    v_username := coalesce(v_username, 'Alguien');

    v_title := case v_variant
      when 1 then 'Caso cerrado'
      when 2 then 'Se acabó el margen'
      when 3 then 'Resultado definitivo'
      when 4 then 'La tabla ha hablado'
      else 'Fin de la discusión oficial'
    end;
    v_body := case v_variant
      when 1 then v_username || ' ha cerrado “' || new.name || '”. Los puntos ya no aceptan recursos.'
      when 2 then '“' || new.name || '” queda cerrada. Llegar tarde sigue sin dar puntos.'
      when 3 then 'Las cuentas de “' || new.name || '” son definitivas. Ahora toca fingir deportividad.'
      when 4 then '“' || new.name || '” ha terminado. El ranking puede proceder a incomodar a quien corresponda.'
      else v_username || ' pone fin a “' || new.name || '”. Las reclamaciones pasan al archivo. 🏁'
    end;

    perform public.notify_group_members(
      new.group_id,
      'table_closed',
      v_title,
      v_body,
      new.id,
      v_actor_id
    );
  end if;
  return new;
end;
$$;

revoke all on function private.notification_variant(uuid)
  from public, anon, authenticated;
