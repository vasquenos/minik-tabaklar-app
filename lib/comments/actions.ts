"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CommentResult = {
  id: string;
  content: string;
  created_at: string;
};

export type CommentActionState =
  | { error: string }
  | { comment: CommentResult }
  | undefined;

export async function addComment(
  recipeId: string,
  content: string
): Promise<CommentActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const text = content.trim();
  if (!text) {
    return { error: "Yorum boş olamaz." };
  }
  if (text.length > 1000) {
    return { error: "Yorum en fazla 1000 karakter olabilir." };
  }

  const { data: recipe } = await supabase
    .from("recipes")
    .select("user_id")
    .eq("id", recipeId)
    .maybeSingle();

  if (!recipe) {
    return { error: "Tarif bulunamadı." };
  }

  const { data: inserted, error } = await supabase
    .from("recipe_comments")
    .insert({ recipe_id: recipeId, user_id: user.id, content: text })
    .select("id, content, created_at")
    .single();

  if (error) {
    return { error: "Yorum gönderilemedi. Lütfen tekrar dene." };
  }

  // Tarif sahibine bildirim (best-effort; RPC RLS'yi ve politikanın geçerliliğini
  // DB tarafında yeniden doğrular).
  if (recipe.user_id !== user.id) {
    await supabase.rpc("notify_user", {
      p_recipient: recipe.user_id,
      p_type: "comment",
      p_recipe: recipeId,
      p_content: text.slice(0, 300),
    });
  }

  revalidatePath(`/recipes/${recipeId}`);
  return { comment: inserted };
}

export async function deleteComment(
  commentId: string,
  recipeId: string
): Promise<{ error?: string } | undefined> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("recipe_comments")
    .delete()
    .eq("id", commentId);

  if (error) {
    return { error: "Yorum silinemedi. Lütfen tekrar dene." };
  }

  revalidatePath(`/recipes/${recipeId}`);
  return undefined;
}
