"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { recipeSchema, type RecipeInput } from "@/lib/validation/recipes";

export type RecipeFormState =
  | { error?: string; fieldErrors?: Record<string, string> }
  | undefined;

// FormData'dan ham değerleri toplar; boş seçimli alanlar null olur.
function parseRecipeForm(formData: FormData): unknown {
  const ingredientNames = formData.getAll("ingredients_name[]").map(String);
  const quantities = formData.getAll("ingredients_quantity[]").map(String);
  const units = formData.getAll("ingredients_unit[]").map(String);

  return {
    title: String(formData.get("title") ?? ""),
    description: formData.get("description") ?? null,
    category: formData.get("category") ?? null,
    servings: formData.get("servings") ?? null,
    prepTimeMinutes: formData.get("prepTimeMinutes") ?? null,
    cookTimeMinutes: formData.get("cookTimeMinutes") ?? null,
    difficulty: formData.get("difficulty") ?? null,
    visibility: String(formData.get("visibility") ?? "public"),
    coverImageUrl: formData.get("coverImageUrl") ?? null,
    notes: formData.get("notes") ?? null,
    ingredients: ingredientNames.map((name, index) => ({
      name,
      quantity: quantities[index] ?? null,
      unit: units[index] ?? null,
    })),
    steps: formData.getAll("steps[]").map((step) => ({
      instruction: String(step),
    })),
    tags: String(formData.get("tags") ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
  };
}

// Zod hatalarını alan bazlı tek mesaj dizisine indirger.
function toFieldErrors(error: {
  issues: { path: PropertyKey[]; message: string }[];
}): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const root = String(issue.path[0]);
    if (!fieldErrors[root]) fieldErrors[root] = issue.message;
  }
  return fieldErrors;
}

function recipeRow(input: RecipeInput, userId: string) {
  return {
    user_id: userId,
    title: input.title,
    description: input.description ?? null,
    category: input.category ?? null,
    servings: input.servings ?? null,
    prep_time_minutes: input.prepTimeMinutes ?? null,
    cook_time_minutes: input.cookTimeMinutes ?? null,
    difficulty: input.difficulty ?? null,
    visibility: input.visibility,
    cover_image_url: input.coverImageUrl ?? null,
    notes: input.notes ?? null,
  };
}

function childrenRows(input: RecipeInput, recipeId: string) {
  return {
    ingredients: input.ingredients.map((ingredient, index) => ({
      recipe_id: recipeId,
      name: ingredient.name,
      quantity: ingredient.quantity ?? null,
      unit: ingredient.unit ?? null,
      order_index: index,
    })),
    steps: input.steps.map((step, index) => ({
      recipe_id: recipeId,
      step_number: index + 1,
      instruction: step.instruction,
    })),
    tags: (input.tags ?? []).map((tag) => ({
      recipe_id: recipeId,
      tag_name: tag,
    })),
  };
}

async function insertChildren(
  supabase: Awaited<ReturnType<typeof createClient>>,
  recipeId: string,
  input: RecipeInput
): Promise<string | null> {
  const { ingredients, steps, tags } = childrenRows(input, recipeId);

  const results = await Promise.all([
    supabase.from("recipe_ingredients").insert(ingredients),
    supabase.from("recipe_steps").insert(steps),
    tags.length > 0 ? supabase.from("recipe_tags").insert(tags) : Promise.resolve({ error: null }),
  ]);

  const firstError = results.find((result) => result.error)?.error;
  return firstError ? firstError.message : null;
}

export async function createRecipe(
  _prev: RecipeFormState,
  formData: FormData
): Promise<RecipeFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const parsed = recipeSchema.safeParse(parseRecipeForm(formData));
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error) };
  }

  const { data: recipe, error: recipeError } = await supabase
    .from("recipes")
    .insert(recipeRow(parsed.data, user.id))
    .select("id")
    .single();

  if (recipeError || !recipe) {
    return { error: recipeError?.message ?? "Tarif kaydedilemedi." };
  }

  const childError = await insertChildren(supabase, recipe.id, parsed.data);
  if (childError) {
    // En kötü durumda ana kaydı da geri al (yalnızca kendi kaydımız).
    await supabase.from("recipes").delete().eq("id", recipe.id);
    return { error: "Tarif kaydedilirken bir sorun oluştu. Lütfen tekrar dene." };
  }

  revalidatePath("/recipes");
  redirect(`/recipes/${recipe.id}`);
}

export async function updateRecipe(
  recipeId: string,
  _prev: RecipeFormState,
  formData: FormData
): Promise<RecipeFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const parsed = recipeSchema.safeParse(parseRecipeForm(formData));
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error) };
  }

  const { data: recipe, error: recipeError } = await supabase
    .from("recipes")
    .update(recipeRow(parsed.data, user.id))
    .eq("id", recipeId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (recipeError) {
    return { error: recipeError.message };
  }
  if (!recipe) {
    return { error: "Tarif bulunamadı veya bu tarifi düzenleme yetkin yok." };
  }

  // MVP'de en basit yaklaşım: alt kayıtları sil ve yeniden yaz.
  await Promise.all([
    supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId),
    supabase.from("recipe_steps").delete().eq("recipe_id", recipeId),
    supabase.from("recipe_tags").delete().eq("recipe_id", recipeId),
  ]);

  const childError = await insertChildren(supabase, recipeId, parsed.data);
  if (childError) {
    return { error: "Tarif güncellenirken bir sorun oluştu. Lütfen tekrar dene." };
  }

  revalidatePath("/recipes");
  revalidatePath(`/recipes/${recipeId}`);
  redirect(`/recipes/${recipeId}`);
}

export async function deleteRecipe(recipeId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // RLS yalnızca kendi tarifinin silinmesine izin verir; yine de user_id koşulu eklenir.
  await supabase.from("recipes").delete().eq("id", recipeId).eq("user_id", user.id);

  revalidatePath("/recipes");
  redirect("/recipes");
}
