-- TarifAI — Row Level Security (RLS) politikaları
-- Kural: her kullanıcı yalnızca kendi tariflerine ve onlara bağlı verilere erişebilir.
-- Child tablolarda sahiplik, recipes tablosundan EXISTS alt sorgusu ile doğrulanır.

-- ---------------------------------------------------------------------------
-- recipes
-- ---------------------------------------------------------------------------
alter table public.recipes enable row level security;

create policy "Users can view own recipes"
  on public.recipes for select
  using (user_id = auth.uid());

create policy "Users can insert own recipes"
  on public.recipes for insert
  with check (user_id = auth.uid());

create policy "Users can update own recipes"
  on public.recipes for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete own recipes"
  on public.recipes for delete
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- recipe_ingredients
-- ---------------------------------------------------------------------------
alter table public.recipe_ingredients enable row level security;

create policy "Users can view ingredients of own recipes"
  on public.recipe_ingredients for select
  using (exists (
    select 1 from public.recipes
    where recipes.id = recipe_ingredients.recipe_id
      and recipes.user_id = auth.uid()
  ));

create policy "Users can insert ingredients of own recipes"
  on public.recipe_ingredients for insert
  with check (exists (
    select 1 from public.recipes
    where recipes.id = recipe_ingredients.recipe_id
      and recipes.user_id = auth.uid()
  ));

create policy "Users can update ingredients of own recipes"
  on public.recipe_ingredients for update
  using (exists (
    select 1 from public.recipes
    where recipes.id = recipe_ingredients.recipe_id
      and recipes.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.recipes
    where recipes.id = recipe_ingredients.recipe_id
      and recipes.user_id = auth.uid()
  ));

create policy "Users can delete ingredients of own recipes"
  on public.recipe_ingredients for delete
  using (exists (
    select 1 from public.recipes
    where recipes.id = recipe_ingredients.recipe_id
      and recipes.user_id = auth.uid()
  ));

-- ---------------------------------------------------------------------------
-- recipe_steps
-- ---------------------------------------------------------------------------
alter table public.recipe_steps enable row level security;

create policy "Users can view steps of own recipes"
  on public.recipe_steps for select
  using (exists (
    select 1 from public.recipes
    where recipes.id = recipe_steps.recipe_id
      and recipes.user_id = auth.uid()
  ));

create policy "Users can insert steps of own recipes"
  on public.recipe_steps for insert
  with check (exists (
    select 1 from public.recipes
    where recipes.id = recipe_steps.recipe_id
      and recipes.user_id = auth.uid()
  ));

create policy "Users can update steps of own recipes"
  on public.recipe_steps for update
  using (exists (
    select 1 from public.recipes
    where recipes.id = recipe_steps.recipe_id
      and recipes.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.recipes
    where recipes.id = recipe_steps.recipe_id
      and recipes.user_id = auth.uid()
  ));

create policy "Users can delete steps of own recipes"
  on public.recipe_steps for delete
  using (exists (
    select 1 from public.recipes
    where recipes.id = recipe_steps.recipe_id
      and recipes.user_id = auth.uid()
  ));

-- ---------------------------------------------------------------------------
-- recipe_tags
-- ---------------------------------------------------------------------------
alter table public.recipe_tags enable row level security;

create policy "Users can view tags of own recipes"
  on public.recipe_tags for select
  using (exists (
    select 1 from public.recipes
    where recipes.id = recipe_tags.recipe_id
      and recipes.user_id = auth.uid()
  ));

create policy "Users can insert tags of own recipes"
  on public.recipe_tags for insert
  with check (exists (
    select 1 from public.recipes
    where recipes.id = recipe_tags.recipe_id
      and recipes.user_id = auth.uid()
  ));

create policy "Users can update tags of own recipes"
  on public.recipe_tags for update
  using (exists (
    select 1 from public.recipes
    where recipes.id = recipe_tags.recipe_id
      and recipes.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.recipes
    where recipes.id = recipe_tags.recipe_id
      and recipes.user_id = auth.uid()
  ));

create policy "Users can delete tags of own recipes"
  on public.recipe_tags for delete
  using (exists (
    select 1 from public.recipes
    where recipes.id = recipe_tags.recipe_id
      and recipes.user_id = auth.uid()
  ));

-- ---------------------------------------------------------------------------
-- ai_conversations: kullanıcı hem konuşmanın sahibi hem de tarifin sahibi olmalı
-- ---------------------------------------------------------------------------
alter table public.ai_conversations enable row level security;

create policy "Users can view own conversations of own recipes"
  on public.ai_conversations for select
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.recipes
      where recipes.id = ai_conversations.recipe_id
        and recipes.user_id = auth.uid()
    )
  );

create policy "Users can insert own conversations of own recipes"
  on public.ai_conversations for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.recipes
      where recipes.id = ai_conversations.recipe_id
        and recipes.user_id = auth.uid()
    )
  );

create policy "Users can update own conversations of own recipes"
  on public.ai_conversations for update
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.recipes
      where recipes.id = ai_conversations.recipe_id
        and recipes.user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.recipes
      where recipes.id = ai_conversations.recipe_id
        and recipes.user_id = auth.uid()
    )
  );

create policy "Users can delete own conversations of own recipes"
  on public.ai_conversations for delete
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.recipes
      where recipes.id = ai_conversations.recipe_id
        and recipes.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- ai_messages: konuşma üzerinden sahiplik zinciri
-- ---------------------------------------------------------------------------
alter table public.ai_messages enable row level security;

create policy "Users can view messages of own conversations"
  on public.ai_messages for select
  using (exists (
    select 1
    from public.ai_conversations c
    join public.recipes r on r.id = c.recipe_id
    where c.id = ai_messages.conversation_id
      and c.user_id = auth.uid()
      and r.user_id = auth.uid()
  ));

create policy "Users can insert messages of own conversations"
  on public.ai_messages for insert
  with check (exists (
    select 1
    from public.ai_conversations c
    join public.recipes r on r.id = c.recipe_id
    where c.id = ai_messages.conversation_id
      and c.user_id = auth.uid()
      and r.user_id = auth.uid()
  ));

create policy "Users can update messages of own conversations"
  on public.ai_messages for update
  using (exists (
    select 1
    from public.ai_conversations c
    join public.recipes r on r.id = c.recipe_id
    where c.id = ai_messages.conversation_id
      and c.user_id = auth.uid()
      and r.user_id = auth.uid()
  ))
  with check (exists (
    select 1
    from public.ai_conversations c
    join public.recipes r on r.id = c.recipe_id
    where c.id = ai_messages.conversation_id
      and c.user_id = auth.uid()
      and r.user_id = auth.uid()
  ));

create policy "Users can delete messages of own conversations"
  on public.ai_messages for delete
  using (exists (
    select 1
    from public.ai_conversations c
    join public.recipes r on r.id = c.recipe_id
    where c.id = ai_messages.conversation_id
      and c.user_id = auth.uid()
      and r.user_id = auth.uid()
  ));
