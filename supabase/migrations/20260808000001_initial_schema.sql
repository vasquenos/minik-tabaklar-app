-- TarifAI — initial schema
-- Postgres 15+ hedeflenir (Supabase local/cloud varsayılanı).

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- recipes: ana tarif kaydı
-- user_id -> auth.users (Supabase Auth tarafından yönetilir, custom users yok)
-- ---------------------------------------------------------------------------
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text,
  servings integer check (servings is null or servings > 0),
  prep_time_minutes integer check (prep_time_minutes is null or prep_time_minutes >= 0),
  cook_time_minutes integer check (cook_time_minutes is null or cook_time_minutes >= 0),
  difficulty text check (difficulty is null or difficulty in ('easy', 'medium', 'hard')),
  category text,
  cover_image_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recipes_user_id_idx on public.recipes (user_id);
create index recipes_created_at_idx on public.recipes (created_at desc);
create index recipes_category_idx on public.recipes (category);
create index recipes_title_trgm_idx on public.recipes using gin (title gin_trgm_ops);
create index recipes_description_trgm_idx on public.recipes using gin (description gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- recipe_ingredients: tarifin malzeme listesi (sıralı)
-- ---------------------------------------------------------------------------
create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  quantity numeric check (quantity is null or quantity > 0),
  unit text,
  order_index integer not null default 0
);

create index recipe_ingredients_recipe_id_idx on public.recipe_ingredients (recipe_id);
create index recipe_ingredients_name_trgm_idx on public.recipe_ingredients using gin (name gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- recipe_steps: tarifin adım adım anlatımı (sıralı)
-- ---------------------------------------------------------------------------
create table public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  step_number integer not null check (step_number > 0),
  instruction text not null check (char_length(btrim(instruction)) > 0),
  unique (recipe_id, step_number)
);

create index recipe_steps_recipe_id_idx on public.recipe_steps (recipe_id);

-- ---------------------------------------------------------------------------
-- recipe_tags: serbest metin etiketler (normalize edilmemiş, MVP için yeterli)
-- ---------------------------------------------------------------------------
create table public.recipe_tags (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  tag_name text not null check (char_length(btrim(tag_name)) between 1 and 50),
  unique (recipe_id, tag_name)
);

create index recipe_tags_tag_name_idx on public.recipe_tags (tag_name);

-- ---------------------------------------------------------------------------
-- ai_conversations: bir tarife bağlı AI sohbet oturumları
-- ---------------------------------------------------------------------------
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index ai_conversations_recipe_id_idx on public.ai_conversations (recipe_id);
create index ai_conversations_user_id_idx on public.ai_conversations (user_id);

-- ---------------------------------------------------------------------------
-- ai_messages: bir konuşmadaki mesajlar
-- role: 'user' | 'assistant' (check constraint ile sınırlı)
-- ---------------------------------------------------------------------------
create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(btrim(content)) > 0),
  created_at timestamptz not null default now()
);

create index ai_messages_conversation_id_idx on public.ai_messages (conversation_id);
create index ai_messages_created_at_idx on public.ai_messages (created_at asc);

-- ---------------------------------------------------------------------------
-- updated_at trigger: recipes satırı güncellenince otomatik güncelle
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger recipes_set_updated_at
  before update on public.recipes
  for each row
  execute function public.set_updated_at();
