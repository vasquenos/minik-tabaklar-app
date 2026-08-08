-- Minik Tabaklar — sosyal ekstralar
-- Yorumlar, "pişirdim" onayları, engelleme, şikayet, bildirimler ve admin desteği.
-- İlke korunur: veritabanı zorunlu kurallara dayanır (iyi niyete değil).
-- Bildirimler yalnızca security definer RPC üzerinden eklenir; doğrudan INSERT
-- yasaktır — böylece bir kullanıcı kimseye spam bildirim gönderemez.

-- ---------------------------------------------------------------------------
-- profiles: mesaj izni + admin bayrağı
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column message_policy text not null default 'friends'
    check (message_policy in ('everyone', 'friends')),
  add column is_admin boolean not null default false;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- blocks: kullanıcı engelleme (çift yönlü — mesajlaşmayı engeller)
-- ---------------------------------------------------------------------------
create table public.blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index blocks_blocked_id_idx on public.blocks (blocked_id);

alter table public.blocks enable row level security;

create policy "Users can view own blocks"
  on public.blocks for select
  using (blocker_id = auth.uid() or blocked_id = auth.uid());

create policy "Users can block others"
  on public.blocks for insert
  with check (blocker_id = auth.uid() and blocked_id <> auth.uid());

create policy "Users can unblock"
  on public.blocks for delete
  using (blocker_id = auth.uid());

-- Engelli taraflar birbirine mesaj atamaz (RLS, sender'ın auth.uid() olduğunu
-- zaten denetler; bu tetik mesajlaşmayı tamamen kilitler).
create or replace function public.prevent_blocked_messages()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from public.blocks
    where (blocker_id = new.sender_id and blocked_id = new.recipient_id)
       or (blocker_id = new.recipient_id and blocked_id = new.sender_id)
  ) then
    raise exception 'Mesaj gönderilemedi: kullanıcılar birbirini engelledi.';
  end if;
  return new;
end;
$$;

create trigger messages_prevent_blocked_before_insert
  before insert on public.messages
  for each row execute function public.prevent_blocked_messages();

-- ---------------------------------------------------------------------------
-- recipe_comments: yalnızca herkese açık tariflere yorum
-- ---------------------------------------------------------------------------
create table public.recipe_comments (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index recipe_comments_recipe_id_idx on public.recipe_comments (recipe_id, created_at asc);
create index recipe_comments_user_id_idx on public.recipe_comments (user_id);

alter table public.recipe_comments enable row level security;

create policy "Anyone can view comments on visible recipes"
  on public.recipe_comments for select
  using (exists (
    select 1 from public.recipes
    where recipes.id = recipe_comments.recipe_id
      and (recipes.visibility = 'public' or recipes.user_id = auth.uid())
  ));

create policy "Users can comment on public recipes"
  on public.recipe_comments for insert
  with check (user_id = auth.uid() and exists (
    select 1 from public.recipes
    where recipes.id = recipe_comments.recipe_id
      and recipes.visibility = 'public'
  ));

create policy "Users can update own comments"
  on public.recipe_comments for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users or admins can delete comments"
  on public.recipe_comments for delete
  using (user_id = auth.uid() or exists (
    select 1 from public.profiles
    where profiles.user_id = auth.uid() and profiles.is_admin
  ));

-- ---------------------------------------------------------------------------
-- recipe_cooks: "pişirdim" onayı (yalnızca herkese açık tariflerde)
-- ---------------------------------------------------------------------------
create table public.recipe_cooks (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (recipe_id, user_id)
);

create index recipe_cooks_user_id_idx on public.recipe_cooks (user_id);

alter table public.recipe_cooks enable row level security;

create policy "Anyone can view cooks on visible recipes"
  on public.recipe_cooks for select
  using (exists (
    select 1 from public.recipes
    where recipes.id = recipe_cooks.recipe_id
      and (recipes.visibility = 'public' or recipes.user_id = auth.uid())
  ));

create policy "Users can cook public recipes"
  on public.recipe_cooks for insert
  with check (user_id = auth.uid() and exists (
    select 1 from public.recipes
    where recipes.id = recipe_cooks.recipe_id
      and recipes.visibility = 'public'
  ));

create policy "Users can remove own cook marks"
  on public.recipe_cooks for delete
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- reports: şikayetler (tarif / yorum / mesaj / kullanıcı)
-- ---------------------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null check (target_type in ('recipe', 'comment', 'message', 'user')),
  target_id uuid not null,
  reason text not null check (char_length(btrim(reason)) between 1 and 1000),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  handled_by uuid references auth.users (id) on delete set null,
  handled_at timestamptz
);

create index reports_status_created_idx on public.reports (status, created_at asc);

alter table public.reports enable row level security;

create policy "Users and admins can view reports"
  on public.reports for select
  using (reporter_id = auth.uid() or exists (
    select 1 from public.profiles
    where profiles.user_id = auth.uid() and profiles.is_admin
  ));

create policy "Users can report"
  on public.reports for insert
  with check (reporter_id = auth.uid() and status = 'open');

create policy "Admins can manage reports"
  on public.reports for update
  using (exists (
    select 1 from public.profiles
    where profiles.user_id = auth.uid() and profiles.is_admin
  ))
  with check (exists (
    select 1 from public.profiles
    where profiles.user_id = auth.uid() and profiles.is_admin
  ));

-- ---------------------------------------------------------------------------
-- notifications: kullanıcıya bildirimler
-- Insert yalnızca security definer RPC üzerinden (aşağıda); RLS INSERT yok.
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('message', 'comment', 'cook', 'friend_request', 'friend_accept')),
  actor_id uuid references auth.users (id) on delete cascade,
  recipe_id uuid references public.recipes (id) on delete set null,
  content text check (content is null or char_length(btrim(content)) between 1 and 300),
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_id_created_idx on public.notifications (user_id, created_at desc);
create index notifications_user_id_read_idx on public.notifications (user_id, read);

alter table public.notifications enable row level security;

create policy "Users can view own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "Users can update own notifications"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete own notifications"
  on public.notifications for delete
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- notify_user RPC: güvenli bildirim oluşturma
-- Çağıranın (auth.uid()) gerçek bir sosyal ilişkisi olduğunu doğrular,
-- sonra alıcının bildirimini ekler. RLS'yi atlar (owner olarak çalışır),
-- bu yüzden doğrulama şarttır.
-- ---------------------------------------------------------------------------
create or replace function public.notify_user(
  p_recipient uuid,
  p_type text,
  p_recipe uuid default null,
  p_content text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_recipe_owner uuid;
begin
  if v_actor is null then
    raise exception 'Oturum açılmamış.';
  end if;

  if p_recipient is null or p_recipient = v_actor then
    raise exception 'Geçersiz alıcı.';
  end if;

  if not exists (select 1 from public.profiles where user_id = p_recipient) then
    raise exception 'Alıcı bulunamadı.';
  end if;

  case p_type
    when 'message' then
      if not exists (
        select 1 from public.friendships
        where status = 'accepted'
          and ((user_id = v_actor and friend_id = p_recipient)
            or (user_id = p_recipient and friend_id = v_actor))
      ) then
        raise exception 'Mesaj bildirimi yalnızca arkadaşlara gönderilebilir.';
      end if;
    when 'friend_request' then
      if not exists (
        select 1 from public.friendships
        where status = 'pending' and user_id = v_actor and friend_id = p_recipient
      ) then
        raise exception 'Bekleyen istek bulunamadı.';
      end if;
    when 'friend_accept' then
      if not exists (
        select 1 from public.friendships
        where status = 'accepted' and user_id = p_recipient and friend_id = v_actor
      ) then
        raise exception 'Kabul edilmiş istek bulunamadı.';
      end if;
    when 'comment', 'cook' then
      if p_recipe is null then
        raise exception 'Tarif belirtilmedi.';
      end if;
      select user_id into v_recipe_owner
        from public.recipes
        where id = p_recipe and visibility = 'public';
      if v_recipe_owner is null or v_recipe_owner <> p_recipient then
        raise exception 'Tarif yayında değil ya da alıcı tarif sahibi değil.';
      end if;
    else
      raise exception 'Bilinmeyen bildirim türü.';
  end case;

  insert into public.notifications (user_id, type, actor_id, recipe_id, content)
  values (p_recipient, p_type, v_actor, p_recipe, p_content);
end;
$$;

revoke all on function public.notify_user(uuid, text, uuid, text) from public;
grant execute on function public.notify_user(uuid, text, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: herhangi bir tarif veya mesajı silebilir
-- (recipes delete zaten authenticated'e verilmiş; yalnızca politika gerekli)
-- ---------------------------------------------------------------------------
create policy "Admins can delete any recipe"
  on public.recipes for delete
  using (exists (
    select 1 from public.profiles
    where profiles.user_id = auth.uid() and profiles.is_admin
  ));

create policy "Admins can delete any message"
  on public.messages for delete
  using (exists (
    select 1 from public.profiles
    where profiles.user_id = auth.uid() and profiles.is_admin
  ));

-- ---------------------------------------------------------------------------
-- GRANT — anon okuma, authenticated tüm DML (satır izni RLS'te)
-- ---------------------------------------------------------------------------
grant select on table public.blocks to anon;
grant select, insert, delete on table public.blocks to authenticated;

grant select on table public.recipe_comments to anon;
grant select, insert, update, delete on table public.recipe_comments to authenticated;

grant select on table public.recipe_cooks to anon;
grant select, insert, delete on table public.recipe_cooks to authenticated;

grant select on table public.reports to anon;
grant select, insert, update on table public.reports to authenticated;

-- notifications özel veri taşır; anon'a hiçbir yetki verilmez.
grant select, update, delete on table public.notifications to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: yorumlar ve bildirimler canlı yayınlanır
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.recipe_comments;
alter publication supabase_realtime add table public.notifications;
