import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatProfile, type UserProfile } from "@/lib/profiles";
import { RecipeCard } from "@/components/recipe/recipe-card";
import { HeartIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Favorilerim",
};

export default async function FavoritesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: favoriteRows } = await supabase
    .from("favorites")
    .select("recipe_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const favoriteIds = (favoriteRows ?? []).map((row) => row.recipe_id);

  let recipes: {
    id: string;
    title: string;
    category: string | null;
    difficulty: string | null;
    servings: number | null;
    prep_time_minutes: number | null;
    cook_time_minutes: number | null;
    cover_image_url: string | null;
    created_at: string;
    user_id: string;
  }[] = [];

  if (favoriteIds.length > 0) {
    const { data } = await supabase
      .from("recipes")
      .select(
        "id, title, category, difficulty, servings, prep_time_minutes, cook_time_minutes, cover_image_url, created_at, user_id"
      )
      .in("id", favoriteIds)
      .order("created_at", { ascending: false });
    recipes = data ?? [];
  }

  const authorIds = [...new Set(recipes.map((recipe) => recipe.user_id))];
  const authors = new Map<string, UserProfile>();

  if (authorIds.length > 0) {
    const { data: authorRows } = await supabase
      .from("profiles")
      .select("user_id, first_name, last_name, avatar_url")
      .in("user_id", authorIds);
    for (const row of authorRows ?? []) {
      authors.set(row.user_id, formatProfile(row, row.user_id));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1.5">
        <p className="eyebrow">Kalbinin kazandıkları</p>
        <h1 className="flex items-center gap-2 font-heading text-[26px] leading-tight font-bold tracking-tight text-plum">
          <HeartIcon filled className="h-6 w-6 text-rose-deep" />
          Favorilerim
        </h1>
        <p className="text-sm text-plum-soft">
          Beğendiğin tarifler burada toplanır. ❤️
        </p>
      </header>

      {recipes.length > 0 ? (
        <section className="grid grid-cols-2 gap-4">
          {recipes.map((recipe) => {
            const author = authors.get(recipe.user_id);
            const isOwn = recipe.user_id === user.id;
            return (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                authorName={isOwn ? "Senin tarifin" : author?.fullName}
                authorAvatar={author?.avatar_url}
                isFavorite
              />
            );
          })}
        </section>
      ) : (
        <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-rose to-blush text-3xl">
            💔
          </span>
          <h2 className="font-heading text-lg font-bold text-plum">
            Henüz favori yok
          </h2>
          <p className="max-w-xs text-sm text-plum-soft">
            Tariflerin üzerindeki kalbe dokunarak favorilerine ekleyebilirsin.
          </p>
          <Link
            href="/discover"
            className="btn-primary mt-1 inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold"
          >
            Keşfetmeye başla ✨
          </Link>
        </div>
      )}
    </div>
  );
}
