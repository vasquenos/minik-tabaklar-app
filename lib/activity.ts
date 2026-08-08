import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ActivityItem = {
  kind: "recipe" | "favorite";
  recipeId: string;
  title: string;
  category: string | null;
  coverImageUrl: string | null;
  difficulty: string;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  createdAt: string;
  authorName: string;
  actorName: string;
};

// Arkadaşların son paylaştığı public tarifler + favorileri (security definer RPC).
export async function getFriendActivity(limit = 8): Promise<ActivityItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase.rpc("get_friend_activity", { p_limit: limit });

  return (data ?? []).map((row) => ({
    kind: row.kind === "favorite" ? ("favorite" as const) : ("recipe" as const),
    recipeId: row.recipe_id,
    title: row.title,
    category: row.category,
    coverImageUrl: row.cover_image_url,
    difficulty: row.difficulty,
    prepTimeMinutes: row.prep_time_minutes,
    cookTimeMinutes: row.cook_time_minutes,
    createdAt: row.created_at,
    authorName: row.author_name,
    actorName: row.actor_name,
  }));
}
