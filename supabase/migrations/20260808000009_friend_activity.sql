-- Arkadaş etkinlik akışı (Keşfet üstü).
-- Arkadaşların yeni public tarifleri + favorilerini tek sorguda döndürür.
-- favorites RLS'i sahip görünümüne kapalı olduğundan security definer kullanılır;
-- fonksiyon yalnızca akrabalık doğrulanmış satırları ve public tarifleri döndürür.

create or replace function public.get_friend_activity(p_limit int default 8)
returns table (
  kind text,
  recipe_id uuid,
  title text,
  category text,
  cover_image_url text,
  difficulty text,
  prep_time_minutes int,
  cook_time_minutes int,
  created_at timestamptz,
  author_id uuid,
  author_name text,
  actor_id uuid,
  actor_name text
)
language sql
security definer
set search_path = ''
as $$
with friend_ids as (
  select f.friend_id as fid
    from public.friendships f
   where f.status = 'accepted' and f.user_id = auth.uid()
  union
  select f.user_id as fid
    from public.friendships f
   where f.status = 'accepted' and f.friend_id = auth.uid()
),
recent_recipes as (
  select
    'recipe'::text as kind,
    r.id::uuid as recipe_id,
    r.title::text as title,
    r.category::text as category,
    r.cover_image_url::text as cover_image_url,
    r.difficulty::text as difficulty,
    r.prep_time_minutes::int as prep_time_minutes,
    r.cook_time_minutes::int as cook_time_minutes,
    r.created_at::timestamptz as created_at,
    r.user_id::uuid as author_id,
    coalesce(nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''), 'Minik Tabaklar')::text as author_name,
    r.user_id::uuid as actor_id,
    coalesce(nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''), 'Minik Tabaklar')::text as actor_name
  from public.recipes r
  join friend_ids f on f.fid = r.user_id
  join public.profiles p on p.user_id = r.user_id
  where r.visibility = 'public'
),
recent_favorites as (
  select
    'favorite'::text as kind,
    r.id::uuid as recipe_id,
    r.title::text as title,
    r.category::text as category,
    r.cover_image_url::text as cover_image_url,
    r.difficulty::text as difficulty,
    r.prep_time_minutes::int as prep_time_minutes,
    r.cook_time_minutes::int as cook_time_minutes,
    fav.created_at::timestamptz as created_at,
    r.user_id::uuid as author_id,
    coalesce(nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''), 'Minik Tabaklar')::text as author_name,
    fav.user_id::uuid as actor_id,
    coalesce(nullif(trim(coalesce(pp.first_name, '') || ' ' || coalesce(pp.last_name, '')), ''), 'Minik Tabaklar')::text as actor_name
  from public.favorites fav
  join friend_ids f on f.fid = fav.user_id
  join public.recipes r on r.id = fav.recipe_id
  join public.profiles p on p.user_id = r.user_id
  join public.profiles pp on pp.user_id = fav.user_id
  where r.visibility = 'public'
)
select * from recent_recipes
union all
select * from recent_favorites
order by created_at desc
limit p_limit;
$$;

revoke execute on function public.get_friend_activity(int) from public;
grant execute on function public.get_friend_activity(int) to authenticated;
