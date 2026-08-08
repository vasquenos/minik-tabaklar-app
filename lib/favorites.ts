import { createClient } from "@/lib/supabase/server";

// Sunucu bileşenleri için kullanıcının favori tarif id'lerini döndürür.
export async function getFavoriteRecipeIds(
  userId: string
): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("favorites")
    .select("recipe_id")
    .eq("user_id", userId);

  return new Set((data ?? []).map((row) => row.recipe_id));
}
