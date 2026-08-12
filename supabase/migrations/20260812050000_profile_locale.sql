-- Persist the interface language with the account while the locale cookie
-- keeps SSR and public/auth pages consistent in the current browser.

alter table public.perfiles
add column locale text not null default 'es'
  check (locale in ('es', 'en'));

grant update (locale) on public.perfiles to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, username, locale)
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
    ),
    case
      when new.raw_user_meta_data ->> 'locale' in ('es', 'en')
        then new.raw_user_meta_data ->> 'locale'
      else 'es'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
