"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type BlockState = { error?: string } | undefined;

export async function blockUser(
  otherUserId: string
): Promise<BlockState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }
  if (otherUserId === user.id) {
    return { error: "Kendini engelleyemezsin." };
  }

  const { error } = await supabase
    .from("blocks")
    .insert({ blocker_id: user.id, blocked_id: otherUserId });

  if (error) {
    return { error: "Engellenemedi. Lütfen tekrar dene." };
  }

  // Engellenen kişiyle arkadaşlık (varsa) kaldırılır.
  await supabase
    .from("friendships")
    .delete()
    .or(`and(user_id.eq.${user.id},friend_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},friend_id.eq.${user.id})`);

  revalidatePath(`/users/${otherUserId}`);
  revalidatePath("/friends");
  return undefined;
}

export async function unblockUser(
  otherUserId: string
): Promise<BlockState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", otherUserId);

  if (error) {
    return { error: "Engel kaldırılamadı. Lütfen tekrar dene." };
  }

  revalidatePath(`/users/${otherUserId}`);
  return undefined;
}

export type BlockStatus = "none" | "blocked_by_me" | "blocked_by_other";

export async function getBlockStatus(
  otherUserId: string
): Promise<BlockStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }
  if (otherUserId === user.id) {
    return "none";
  }

  const { data } = await supabase
    .from("blocks")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`)
    .limit(4);

  const rows = data ?? [];
  const meBlocking = rows.some(
    (row) => row.blocker_id === user.id && row.blocked_id === otherUserId
  );
  const meBlocked = rows.some(
    (row) => row.blocker_id === otherUserId && row.blocked_id === user.id
  );

  if (meBlocking) return "blocked_by_me";
  if (meBlocked) return "blocked_by_other";
  return "none";
}
