import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/profiles";
import { ChatClient } from "@/components/friends/chat-client";

export const metadata: Metadata = {
  title: "Sohbet",
};

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: otherId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Engelli taraflar sohbeti açamaz.
  const { data: block } = await supabase
    .from("blocks")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`)
    .limit(4);
  const blocked = (block ?? []).some(
    (row) =>
      (row.blocker_id === user.id && row.blocked_id === otherId) ||
      (row.blocker_id === otherId && row.blocked_id === user.id)
  );
  if (blocked) {
    notFound();
  }

  const { data: friendship } = await supabase
    .from("friendships")
    .select("id")
    .eq("status", "accepted")
    .or(
      `and(user_id.eq.${user.id},friend_id.eq.${otherId}),and(user_id.eq.${otherId},friend_id.eq.${user.id})`
    )
    .maybeSingle();

  if (!friendship) {
    // Arkadaş değilsek yalnızca 'everyone' politikasındaki kullanıcılarla sohbet açılabilir.
    const { data: otherProfile } = await supabase
      .from("profiles")
      .select("message_policy")
      .eq("user_id", otherId)
      .maybeSingle();

    if (otherProfile?.message_policy !== "everyone") {
      notFound();
    }
  }

  const other = await getUserProfile(otherId);

  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, recipient_id, content, recipe_id, created_at")
    .or(
      `and(sender_id.eq.${user.id},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${user.id})`
    )
    .order("created_at", { ascending: true })
    .limit(200);

  const recipeIds = [
    ...new Set(
      (messages ?? [])
        .map((message) => message.recipe_id)
        .filter((value): value is string => Boolean(value))
    ),
  ];

  const { data: sharedRecipes } = recipeIds.length
    ? await supabase
        .from("recipes")
        .select("id, title, category, cover_image_url")
        .in("id", recipeIds)
        .eq("visibility", "public")
    : { data: [] };

  const recipesById = new Map(
    (sharedRecipes ?? []).map((recipe) => [recipe.id, recipe])
  );

  return (
    <ChatClient
      meId={user.id}
      other={{
        userId: otherId,
        fullName: other.fullName,
        initial: other.initial,
        avatarUrl: other.avatar_url,
      }}
      initialMessages={messages ?? []}
      recipesById={Object.fromEntries(recipesById)}
    />
  );
}
