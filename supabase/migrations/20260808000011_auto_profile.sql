-- Minik Tabaklar — otomatik profil oluşturma
-- Auth kullanıcısı oluşur oluşmaz profiller satırı metadata'daki isimlerle kurulur.
-- Bu, e-posta onayı kapalı/açık her durumda profil boşluğunu önler.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, first_name, last_name)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', '')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mevcut kullanıcılar için geriye dönük dolgu (profil satırı olmayanlar).
insert into public.profiles (user_id, first_name, last_name)
select
  u.id,
  nullif(u.raw_user_meta_data ->> 'first_name', ''),
  nullif(u.raw_user_meta_data ->> 'last_name', '')
from auth.users u
where not exists (
  select 1 from public.profiles p where p.user_id = u.id
)
on conflict (user_id) do nothing;
