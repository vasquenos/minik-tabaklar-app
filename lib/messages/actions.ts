"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SentMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string | null;
  recipe_id: string | null;
  created_at: string;
};

export type SendMessageState =
  | { error: string }
  | { sent: SentMessage }
  | undefined;

export async function sendMessage(
  recipientId: string,
  content: string,
  recipeId?: string
): Promise<SendMessageState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }
  if (recipientId === user.id) {
    return { error: "Kendine mesaj gönderemezsin." };
  }

  const text = content.trim();
  if (!recipeId && !text) {
    return { error: "Mesaj boş olamaz." };
  }
  if (text.length > 2000) {
    return { error: "Mesaj en fazla 2000 karakter olabilir." };
  }

  // Alıcının mesaj politikası: 'friends' ise (ya da profili yoksa, varsayılan
  // 'friends' sayılır) arkadaşlık zorunlu.
  const { data: recipientProfile } = await supabase
    .from("profiles")
    .select("message_policy")
    .eq("user_id", recipientId)
    .maybeSingle();

  const requiresFriendship =
    !recipientProfile || recipientProfile.message_policy === "friends";

  if (requiresFriendship) {
    const { data: friendship } = await supabase
      .from("friendships")
      .select("id")
      .eq("status", "accepted")
      .or(`and(user_id.eq.${user.id},friend_id.eq.${recipientId}),and(user_id.eq.${recipientId},friend_id.eq.${user.id})`)
      .maybeSingle();

    if (!friendship) {
      return { error: "Bu kişi mesajları yalnızca arkadaşlarına açık." };
    }
  }

  // Paylaşılan tarif alıcı tarafından görüntülenebilir olmalı (herkese açık).
  if (recipeId) {
    const { data: recipe } = await supabase
      .from("recipes")
      .select("id")
      .eq("id", recipeId)
      .eq("visibility", "public")
      .maybeSingle();

    if (!recipe) {
      return { error: "Bu tarif herkese açık olmadığı için paylaşılamıyor." };
    }
  }

  const { data: inserted, error } = await supabase
    .from("messages")
    .insert({
      sender_id: user.id,
      recipient_id: recipientId,
      content: recipeId ? text || null : text,
      recipe_id: recipeId ?? null,
    })
    .select("id, sender_id, recipient_id, content, recipe_id, created_at")
    .single();

  if (error) {
    return { error: "Mesaj gönderilemedi. Lütfen tekrar dene." };
  }

  // Alıcıya bildirim (best-effort; politikayı RPC DB tarafında yeniden doğrular).
  await supabase.rpc("notify_user", {
    p_recipient: recipientId,
    p_type: "message",
    p_content: text.slice(0, 300) || undefined,
  });

  revalidatePath("/friends");
  return { sent: inserted };
}
