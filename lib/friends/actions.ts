"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type FriendSearchResult = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  fullName: string;
  initial: string;
};

type FriendActionState = { error?: string } | undefined;

function toResult(profile: {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}): FriendSearchResult {
  const first = profile.first_name?.trim() || null;
  const last = profile.last_name?.trim() || null;
  const fullName = [first, last].filter(Boolean).join(" ") || "Minik Tabaklar";
  return {
    user_id: profile.user_id,
    first_name: first,
    last_name: last,
    avatar_url: profile.avatar_url,
    fullName,
    initial: (first ?? fullName).charAt(0).toLocaleUpperCase("tr"),
  };
}

export async function searchUsers(
  query: string
): Promise<FriendSearchResult[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const needle = query.trim();
  if (needle.length < 2) return [];

  // trigram araması (pg_trgm) — soyad ile de eşleşir; en alakalı 8 sonuç.
  const { data } = await supabase
    .from("profiles")
    .select("user_id, first_name, last_name, avatar_url")
    .neq("user_id", user.id)
    .or(`first_name.ilike.%${needle}%,last_name.ilike.%${needle}%`)
    .order("first_name")
    .limit(8);

  return (data ?? []).map(toResult);
}

export async function sendFriendRequest(
  friendId: string
): Promise<FriendActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }
  if (friendId === user.id) {
    return { error: "Kendine arkadaşlık isteği gönderemezsin." };
  }

  const { error } = await supabase
    .from("friendships")
    .insert({ user_id: user.id, friend_id: friendId, status: "pending" });

  if (error) {
    // Çift yönlü istek ya da tekrarı durumunda sessiz geç.
    if (error.code === "23505") {
      return { error: "Bu kişiye zaten istek gönderilmiş." };
    }
    return { error: "İstek gönderilemedi. Lütfen tekrar dene." };
  }

  // Alıcıya bildirim (best-effort).
  await supabase.rpc("notify_user", {
    p_recipient: friendId,
    p_type: "friend_request",
  });

  revalidatePath("/friends");
  return undefined;
}

export async function respondToRequest(
  friendshipId: string,
  accept: boolean
): Promise<FriendActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: request } = await supabase
    .from("friendships")
    .select("id, user_id")
    .eq("id", friendshipId)
    .eq("friend_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (!request) {
    return { error: "İstek bulunamadı ya da artık geçerli değil." };
  }

  if (accept) {
    await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", friendshipId);

    // İsteği gönderene bildirim.
    await supabase.rpc("notify_user", {
      p_recipient: request.user_id,
      p_type: "friend_accept",
    });
  } else {
    await supabase.from("friendships").delete().eq("id", friendshipId);
  }

  revalidatePath("/friends");
  return undefined;
}

export async function removeFriend(
  friendshipId: string
): Promise<FriendActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await supabase.from("friendships").delete().eq("id", friendshipId);
  revalidatePath("/friends");
  return undefined;
}

export type FriendshipStatus =
  | "none"
  | "pending_outgoing"
  | "pending_incoming"
  | "friends";

export async function getFriendshipStatus(
  otherUserId: string
): Promise<FriendshipStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }
  if (otherUserId === user.id) {
    return "friends";
  }

  const { data } = await supabase
    .from("friendships")
    .select("user_id, friend_id, status")
    .or(`and(user_id.eq.${user.id},friend_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},friend_id.eq.${user.id})`)
    .limit(2);

  const row = (data ?? [])[0];
  if (!row) {
    return "none";
  }
  if (row.status === "accepted") {
    return "friends";
  }
  return row.user_id === user.id ? "pending_outgoing" : "pending_incoming";
}

// Tek tıkla kabul: diğer kullanıcının gönderdiği bekleyen isteği kabul eder.
export async function acceptFriendRequestFrom(
  otherUserId: string
): Promise<FriendActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: request } = await supabase
    .from("friendships")
    .select("id, user_id")
    .eq("user_id", otherUserId)
    .eq("friend_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (!request) {
    return { error: "Bekleyen istek bulunamadı ya da artık geçerli değil." };
  }

  await supabase
    .from("friendships")
    .update({ status: "accepted" })
    .eq("id", request.id);

  await supabase.rpc("notify_user", {
    p_recipient: request.user_id,
    p_type: "friend_accept",
  });

  revalidatePath("/friends");
  revalidatePath(`/users/${otherUserId}`);
  return undefined;
}
