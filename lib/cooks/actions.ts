"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CookState = { error?: string } | undefined;

export async function toggleCook(
  recipeId: string
): Promise<{ cooked: boolean; count: number; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: recipe } = await supabase
    .from("recipes")
    .select("user_id")
    .eq("id", recipeId)
    .eq("visibility", "public")
    .maybeSingle();

  if (!recipe) {
    return { cooked: false, count: 0, error: "Bu tarif için pişirme onayı açık değil." };
  }

  const { data: existing } = await supabase
    .from("recipe_cooks")
    .select("recipe_id")
    .eq("recipe_id", recipeId)
    .eq("user_id", user.id)
    .maybeSingle();

  let cooked: boolean;
  if (existing) {
    await supabase
      .from("recipe_cooks")
      .delete()
      .eq("recipe_id", recipeId)
      .eq("user_id", user.id);
    cooked = false;
  } else {
    await supabase
      .from("recipe_cooks")
      .insert({ recipe_id: recipeId, user_id: user.id });
    cooked = true;

    // Tarif sahibine bildirim.
    if (recipe.user_id !== user.id) {
      await supabase.rpc("notify_user", {
        p_recipient: recipe.user_id,
        p_type: "cook",
        p_recipe: recipeId,
      });
    }
  }

  const { count } = await supabase
    .from("recipe_cooks")
    .select("user_id", { count: "exact", head: true })
    .eq("recipe_id", recipeId);

  revalidatePath(`/recipes/${recipeId}`);
  revalidatePath(`/users/${recipe.user_id}`);
  return { cooked, count: count ?? 0 };
}
