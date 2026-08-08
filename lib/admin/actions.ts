"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminResult = { error?: string } | undefined;

// Çağıranın is_admin olduğunu doğrular. Değilse undefined döner;
// her admin action'ın ilk adımıdır (RLS admin politikaları yedek güvenliktir).
async function requireAdminClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    return null;
  }

  return createAdminClient();
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .maybeSingle();

  return Boolean(profile?.is_admin);
}

export async function banUser(userId: string): Promise<AdminResult> {
  const admin = await requireAdminClient();
  if (!admin) return { error: "Bu işlem için yetkin yok." };

  // 30 günlük engel (GoTrue ban_duration; "none" ile kaldırılır).
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: "720h",
  });

  if (error) return { error: "Kullanıcı engellenemedi. Lütfen tekrar dene." };
  revalidatePath("/admin");
  return undefined;
}

export async function unbanUser(userId: string): Promise<AdminResult> {
  const admin = await requireAdminClient();
  if (!admin) return { error: "Bu işlem için yetkin yok." };

  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: "none",
  });

  if (error) return { error: "Engel kaldırılamadı. Lütfen tekrar dene." };
  revalidatePath("/admin");
  return undefined;
}

export async function deleteRecipe(recipeId: string): Promise<AdminResult> {
  const admin = await requireAdminClient();
  if (!admin) return { error: "Bu işlem için yetkin yok." };

  const { data: recipe } = await admin
    .from("recipes")
    .select("cover_image_url, user_id")
    .eq("id", recipeId)
    .maybeSingle();

  if (!recipe) return { error: "Tarif bulunamadı." };

  // Kapak görselini storage'dan temizle (varsa).
  if (recipe.cover_image_url) {
    const path = recipe.cover_image_url.replace(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/recipe-covers/`,
      ""
    );
    if (path && path !== recipe.cover_image_url) {
      await admin.storage.from("recipe-covers").remove([path]);
    }
  }

  const { error } = await admin.from("recipes").delete().eq("id", recipeId);
  if (error) return { error: "Tarif silinemedi. Lütfen tekrar dene." };

  revalidatePath("/admin");
  return undefined;
}

export async function deleteComment(commentId: string): Promise<AdminResult> {
  const admin = await requireAdminClient();
  if (!admin) return { error: "Bu işlem için yetkin yok." };

  const { error } = await admin
    .from("recipe_comments")
    .delete()
    .eq("id", commentId);
  if (error) return { error: "Yorum silinemedi. Lütfen tekrar dene." };

  revalidatePath("/admin");
  return undefined;
}

export async function resolveReport(reportId: string): Promise<AdminResult> {
  const admin = await requireAdminClient();
  if (!admin) return { error: "Bu işlem için yetkin yok." };

  const {
    data: { user },
  } = await createClient().then((c) => c.auth.getUser());

  const { error } = await admin
    .from("reports")
    .update({ status: "resolved", handled_by: user?.id, handled_at: new Date().toISOString() })
    .eq("id", reportId);

  if (error) return { error: "Rapor güncellenemedi. Lütfen tekrar dene." };
  revalidatePath("/admin");
  return undefined;
}

export async function dismissReport(reportId: string): Promise<AdminResult> {
  const admin = await requireAdminClient();
  if (!admin) return { error: "Bu işlem için yetkin yok." };

  const {
    data: { user },
  } = await createClient().then((c) => c.auth.getUser());

  const { error } = await admin
    .from("reports")
    .update({ status: "dismissed", handled_by: user?.id, handled_at: new Date().toISOString() })
    .eq("id", reportId);

  if (error) return { error: "Rapor güncellenemedi. Lütfen tekrar dene." };
  revalidatePath("/admin");
  return undefined;
}

// E-posta adresiyle kullanıcı ara (GoTrue admin listesi, yerel ölçekte yeterli).
export type AdminUser = {
  id: string;
  email: string | null;
  bannedUntil: string | null;
  firstName: string | null;
  lastName: string | null;
  isAdmin: boolean;
};

export async function searchUsersByEmail(
  query: string
): Promise<AdminUser[]> {
  const admin = await requireAdminClient();
  if (!admin) return [];

  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];

  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error || !data) return [];

  const { data: profiles } = await admin
    .from("profiles")
    .select("user_id, first_name, last_name, is_admin")
    .in(
      "user_id",
      data.users.map((u) => u.id)
    );

  const profileById = new Map(
    (profiles ?? []).map((p) => [p.user_id, p])
  );

  return data.users
    .filter(
      (u) =>
        u.email?.toLowerCase().includes(needle) ||
        (profileById.get(u.id)?.first_name ?? "").toLowerCase().includes(needle) ||
        (profileById.get(u.id)?.last_name ?? "").toLowerCase().includes(needle)
    )
    .slice(0, 20)
    .map((u) => ({
      id: u.id,
      email: u.email ?? null,
      bannedUntil: u.banned_until ?? null,
      firstName: profileById.get(u.id)?.first_name ?? null,
      lastName: profileById.get(u.id)?.last_name ?? null,
      isAdmin: profileById.get(u.id)?.is_admin ?? false,
    }));
}

export async function searchRecipesByTitle(query: string) {
  const admin = await requireAdminClient();
  if (!admin) return [];

  const needle = query.trim();
  if (needle.length < 2) return [];

  const { data } = await admin
    .from("recipes")
    .select("id, title, user_id, visibility, created_at, cover_image_url")
    .ilike("title", `%${needle}%`)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: profiles } = await admin
    .from("profiles")
    .select("user_id, first_name, last_name")
    .in("user_id", (data ?? []).map((r) => r.user_id));

  const profileById = new Map(
    (profiles ?? []).map((p) => [p.user_id, p])
  );

  return (data ?? []).map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    visibility: recipe.visibility,
    createdAt: recipe.created_at,
    coverImageUrl: recipe.cover_image_url,
    authorName: [profileById.get(recipe.user_id)?.first_name, profileById.get(recipe.user_id)?.last_name]
      .filter(Boolean)
      .join(" ") || "Bilinmeyen şef",
  }));
}

export async function listRecentComments(limit = 20) {
  const admin = await requireAdminClient();
  if (!admin) return [];

  const { data } = await admin
    .from("recipe_comments")
    .select("id, recipe_id, user_id, content, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  const authorIds = [...new Set((data ?? []).map((c) => c.user_id))];
  const recipeIds = [...new Set((data ?? []).map((c) => c.recipe_id))];

  const [{ data: profiles }, { data: recipes }] = await Promise.all([
    admin
      .from("profiles")
      .select("user_id, first_name, last_name")
      .in("user_id", authorIds),
    admin
      .from("recipes")
      .select("id, title")
      .in("id", recipeIds),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.user_id, p]));
  const recipeById = new Map((recipes ?? []).map((r) => [r.id, r]));

  return (data ?? []).map((comment) => ({
    id: comment.id,
    content: comment.content,
    createdAt: comment.created_at,
    recipeId: comment.recipe_id,
    recipeTitle: recipeById.get(comment.recipe_id)?.title ?? "Silinmiş tarif",
    authorName:
      [profileById.get(comment.user_id)?.first_name, profileById.get(comment.user_id)?.last_name]
        .filter(Boolean)
        .join(" ") || "Bilinmeyen kullanıcı",
  }));
}
