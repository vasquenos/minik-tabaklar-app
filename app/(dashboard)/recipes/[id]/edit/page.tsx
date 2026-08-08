import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RecipeForm } from "@/components/recipe-form/recipe-form";
import { createClient } from "@/lib/supabase/server";
import { updateRecipe } from "@/lib/recipes/actions";
import type { RecipeFormInitial } from "@/components/recipe-form/recipe-form";
import { ChevronLeftIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Tarifi Düzenle",
};

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: recipe } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!recipe) {
    notFound();
  }

  const [ingredients, steps, tags] = await Promise.all([
    supabase
      .from("recipe_ingredients")
      .select("name, quantity, unit")
      .eq("recipe_id", id)
      .order("order_index"),
    supabase
      .from("recipe_steps")
      .select("instruction")
      .eq("recipe_id", id)
      .order("step_number"),
    supabase.from("recipe_tags").select("tag_name").eq("recipe_id", id),
  ]);

  const initial: RecipeFormInitial = {
    title: recipe.title,
    description: recipe.description ?? "",
    category: recipe.category ?? "",
    servings: recipe.servings?.toString() ?? "",
    prepTimeMinutes: recipe.prep_time_minutes?.toString() ?? "",
    cookTimeMinutes: recipe.cook_time_minutes?.toString() ?? "",
    difficulty: recipe.difficulty ?? "",
    visibility: recipe.visibility,
    coverImageUrl: recipe.cover_image_url,
    notes: recipe.notes ?? "",
    tags: (tags.data ?? []).map((tag) => tag.tag_name).join(", "),
    ingredients: (ingredients.data ?? []).map((ingredient) => ({
      name: ingredient.name,
      quantity: ingredient.quantity?.toString() ?? "",
      unit: ingredient.unit ?? "",
    })),
    steps: (steps.data ?? []).map((step) => ({
      instruction: step.instruction,
    })),
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Link
          href={`/recipes/${recipe.id}`}
          aria-label="Geri dön"
          className="glass btn-icon flex h-10 w-10 items-center justify-center rounded-full text-plum shadow-card"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </Link>
        <div>
          <p className="eyebrow">Düzenle</p>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-plum">
            Tarifi güncelle 👩‍🍳
          </h1>
        </div>
      </div>
      <RecipeForm
        action={updateRecipe.bind(null, recipe.id)}
        initial={initial}
        submitLabel="Değişiklikleri Kaydet ✨"
        userId={user.id}
      />
    </div>
  );
}
