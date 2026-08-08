-- Minik Tabaklar — sosyal özellikler için RLS + grant + storage
-- İlke korunur: veritabanı, "iyi niyete" değil zorunlu kurallara dayanır.
-- Eski tariflerin sahiplik kuralları değişmez; yalnızca public tariflere
-- okuma açılır (keşfet akışı için).

-- ---------------------------------------------------------------------------
-- recipes: herkese açık tarifler herkes (authenticated) tarafından görülebilir
-- ---------------------------------------------------------------------------
create policy "Anyone can view public recipes"
  on public.recipes for select
  using (visibility = 'public');

-- ---------------------------------------------------------------------------
-- recipe children: public tariflerin alt kayıtları da herkese açıktır
-- ---------------------------------------------------------------------------
create policy "Anyone can view ingredients of public recipes"
  on public.recipe_ingredients for select
  using (exists (
    select 1 from public.recipes
    where recipes.id = recipe_ingredients.recipe_id
      and recipes.visibility = 'public'
  ));

create policy "Anyone can view steps of public recipes"
  on public.recipe_steps for select
  using (exists (
    select 1 from public.recipes
    where recipes.id = recipe_steps.recipe_id
      and recipes.visibility = 'public'
  ));

create policy "Anyone can view tags of public recipes"
  on public.recipe_tags for select
  using (exists (
    select 1 from public.recipes
    where recipes.id = recipe_tags.recipe_id
      and recipes.visibility = 'public'
  ));

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (user_id = auth.uid());

create policy "Users can update own profile"
  on public.profiles for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- favorites
-- ---------------------------------------------------------------------------
alter table public.favorites enable row level security;

create policy "Users can view own favorites"
  on public.favorites for select
  using (user_id = auth.uid());

create policy "Users can insert own favorites"
  on public.favorites for insert
  with check (user_id = auth.uid());

create policy "Users can update own favorites"
  on public.favorites for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete own favorites"
  on public.favorites for delete
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- friendships: yalnızca taraf olan kullanıcılar görür/günceller
-- ---------------------------------------------------------------------------
alter table public.friendships enable row level security;

create policy "Users can view own friendships"
  on public.friendships for select
  using (user_id = auth.uid() or friend_id = auth.uid());

create policy "Users can insert friendships"
  on public.friendships for insert
  with check (user_id = auth.uid());

create policy "Users can update own friendships"
  on public.friendships for update
  using (user_id = auth.uid() or friend_id = auth.uid())
  with check (user_id = auth.uid() or friend_id = auth.uid());

create policy "Users can delete own friendships"
  on public.friendships for delete
  using (user_id = auth.uid() or friend_id = auth.uid());

-- ---------------------------------------------------------------------------
-- messages: gönderen veya alıcı olan kullanıcı
-- ---------------------------------------------------------------------------
alter table public.messages enable row level security;

create policy "Users can view own messages"
  on public.messages for select
  using (sender_id = auth.uid() or recipient_id = auth.uid());

create policy "Users can insert own messages"
  on public.messages for insert
  with check (sender_id = auth.uid());

create policy "Users can update own messages"
  on public.messages for update
  using (sender_id = auth.uid() or recipient_id = auth.uid())
  with check (sender_id = auth.uid() or recipient_id = auth.uid());

create policy "Users can delete own messages"
  on public.messages for delete
  using (sender_id = auth.uid() or recipient_id = auth.uid());

-- ---------------------------------------------------------------------------
-- GRANT — anon yalnızca okuma, authenticated tüm DML (satır izni RLS'te)
-- ---------------------------------------------------------------------------
grant select on table public.profiles to anon;
grant select, insert, update, delete on table public.profiles to authenticated;

grant select on table public.favorites to anon;
grant select, insert, update, delete on table public.favorites to authenticated;

grant select on table public.friendships to anon;
grant select, insert, update, delete on table public.friendships to authenticated;

grant select on table public.messages to anon;
grant select, insert, update, delete on table public.messages to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: tarif kapakları artık herkese açık (keşfet akışı fotoğraf gösterir)
-- Yükleme izni hâlâ yalnızca kendi klasörüne (auth.uid() ile sınırlı).
-- ---------------------------------------------------------------------------
update storage.buckets
  set public = true
  where id = 'recipe-covers';

create policy "Recipe covers are publicly viewable"
  on storage.objects for select
  to public
  using (bucket_id = 'recipe-covers');

-- ---------------------------------------------------------------------------
-- Storage: avatarlar (public bucket) — yükleme kendi klasörüne
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatars are publicly viewable"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

create policy "Users can upload own avatars"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update own avatars"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own avatars"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
