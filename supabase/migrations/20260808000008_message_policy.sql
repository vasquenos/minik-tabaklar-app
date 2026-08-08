-- Minik Tabaklar — notify_user RPC güncellemesi
-- message_policy = 'everyone' olan alıcılara arkadaşlık olmadan da
-- mesaj bildirimi gönderilebilir. 'friends' politikası hâlâ zorunludur.

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
      -- Arkadaş değilse yalnızca 'everyone' politikasındaki alıcıya izin ver.
      if not exists (
        select 1 from public.friendships
        where status = 'accepted'
          and ((user_id = v_actor and friend_id = p_recipient)
            or (user_id = p_recipient and friend_id = v_actor))
      ) then
        if not exists (
          select 1 from public.profiles
          where user_id = p_recipient and message_policy = 'everyone'
        ) then
          raise exception 'Mesaj bildirimi yalnızca arkadaşlara gönderilebilir.';
        end if;
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
