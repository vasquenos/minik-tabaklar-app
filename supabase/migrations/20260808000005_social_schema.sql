-- Minik Tabaklar — sosyal özellikler için şema
-- Tarifler artık "herkese açık" veya "gizli" olabilir; keşfet akışı (public),
-- favoriler, arkadaşlıklar ve birebir mesajlaşma bu migration ile gelir.

-- ---------------------------------------------------------------------------
-- recipes: görünürlük
-- ---------------------------------------------------------------------------
alter table public.recipes
  add column visibility text not null default 'public'
  check (visibility in ('private', 'public'));

-- ---------------------------------------------------------------------------
-- profiles: kullanıcının görünen kimliği (isim, soyisim, avatar)
-- Not: e-posta burada TUTULMAZ; auth.users'ta kalır ve arayüzde gösterilmez.
-- ---------------------------------------------------------------------------
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  first_name text,
  last_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_first_name_trgm_idx on public.profiles using gin (first_name gin_trgm_ops);
create index profiles_last_name_trgm_idx on public.profiles using gin (last_name gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- favorites: kullanıcının favori tarifleri (tarif sahibi farklı olabilir)
-- ---------------------------------------------------------------------------
create table public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

create index favorites_recipe_id_idx on public.favorites (recipe_id);

-- ---------------------------------------------------------------------------
-- friendships: arkadaşlık istekleri (pending) ve arkadaşlar (accepted)
-- user_id -> isteği gönderen / friend_id -> isteği alan
-- ---------------------------------------------------------------------------
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  friend_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, friend_id),
  check (user_id <> friend_id)
);

create index friendships_user_id_idx on public.friendships (user_id);
create index friendships_friend_id_idx on public.friendships (friend_id);
create index friendships_status_idx on public.friendships (status);

-- ---------------------------------------------------------------------------
-- messages: birebir mesajlar; bir mesaj bir tarif referansı taşıyabilir
-- (tarif gönderme — içerik veya recipe_id en az biri zorunlu)
-- ---------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  recipe_id uuid references public.recipes (id) on delete set null,
  content text check (content is null or char_length(btrim(content)) > 0),
  created_at timestamptz not null default now(),
  check (recipe_id is not null or (content is not null and char_length(btrim(content)) > 0))
);

create index messages_sender_id_idx on public.messages (sender_id);
create index messages_recipient_id_idx on public.messages (recipient_id);
create index messages_created_at_idx on public.messages (created_at asc);

-- ---------------------------------------------------------------------------
-- Realtime: yeni mesajlar canlı sohbet için yayınlanır
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
