import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FriendsClient } from "@/components/friends/friends-client";

export const metadata: Metadata = {
  title: "Arkadaşlar",
};

export type FriendRow = {
  fullName: string;
  initial: string;
  avatarUrl: string | null;
};

export type FriendRequestItem = {
  friendshipId: string;
  profile: FriendRow;
};

export type FriendItem = {
  friendshipId: string;
  otherId: string;
  profile: FriendRow;
};

export default async function FriendsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [incomingRes, outgoingRes, friendsRes] = await Promise.all([
    supabase
      .from("friendships")
      .select("id, user_id, created_at")
      .eq("friend_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("friendships")
      .select("id, friend_id, created_at")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("friendships")
      .select("id, user_id, friend_id, created_at")
      .eq("status", "accepted")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .order("created_at", { ascending: false }),
  ]);

  const incoming = incomingRes.data ?? [];
  const outgoing = outgoingRes.data ?? [];
  const friends = friendsRes.data ?? [];

  const profileIds = new Set<string>();
  incoming.forEach((row) => profileIds.add(row.user_id));
  outgoing.forEach((row) => profileIds.add(row.friend_id));
  friends.forEach((row) =>
    profileIds.add(row.user_id === user.id ? row.friend_id : row.user_id)
  );

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, first_name, last_name, avatar_url")
    .in("user_id", [...profileIds]);

  const profileById = new Map(
    (profiles ?? []).map((profile) => [profile.user_id, profile])
  );

  const toRow = (userId: string): FriendRow => {
    const profile = profileById.get(userId);
    const first = profile?.first_name?.trim() || null;
    const last = profile?.last_name?.trim() || null;
    const fullName = [first, last].filter(Boolean).join(" ") || "Şef";
    return {
      fullName,
      initial: (first ?? fullName).charAt(0).toLocaleUpperCase("tr"),
      avatarUrl: profile?.avatar_url ?? null,
    };
  };

  return (
    <FriendsClient
      incoming={incoming.map((row) => ({
        friendshipId: row.id,
        profile: toRow(row.user_id),
      }))}
      outgoing={outgoing.map((row) => ({
        friendshipId: row.id,
        profile: toRow(row.friend_id),
      }))}
      friends={friends.map((row) => ({
        friendshipId: row.id,
        otherId: row.user_id === user.id ? row.friend_id : row.user_id,
        profile: toRow(row.user_id === user.id ? row.friend_id : row.user_id),
      }))}
    />
  );
}
