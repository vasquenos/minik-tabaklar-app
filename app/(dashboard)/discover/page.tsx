import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFavoriteRecipeIds } from "@/lib/favorites";
import { getFriendActivity } from "@/lib/activity";
import { formatProfile } from "@/lib/profiles";
import { RecipeCard } from "@/components/recipe/recipe-card";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { CompassIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Keşfet",
};

export default async function DiscoverPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [activity, recipesRes] = await Promise.all([
    getFriendActivity(8),
    supabase
      .from("recipes")
      .select(
        "id, title, category, difficulty, servings, prep_time_minutes, cook_time_minutes, cover_image_url, created_at, user_id"
      )
      .eq("visibility", "public")
      .order("created_at", { ascending: false }),
  ]);

  const recipes = recipesRes.data ?? [];

  const authorIds = [...new Set((recipes ?? []).map((recipe) => recipe.user_id))];

  const { data: profiles } = authorIds.length
    ? await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, avatar_url")
        .in("user_id", authorIds)
    : { data: [] };

  const profileById = new Map(
    (profiles ?? []).map((profile) => [profile.user_id, profile])
  );

  const favoriteIds = await getFavoriteRecipeIds(user.id);

  const feed =
    recipes?.map((recipe) => {
      const author = formatProfile(profileById.get(recipe.user_id), recipe.user_id);
      return {
        id: recipe.id,
        title: recipe.title,
        category: recipe.category,
        cover_image_url: recipe.cover_image_url,
        difficulty: recipe.difficulty,
        prep_time_minutes: recipe.prep_time_minutes,
        cook_time_minutes: recipe.cook_time_minutes,
        authorName: author.fullName,
        authorAvatar: author.avatar_url,
      };
    }) ?? [];

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1.5">
        <p className="eyebrow">Sosyal akışın</p>
        <h1 className="font-heading text-[26px] leading-tight font-bold tracking-tight text-plum">
          Keşfet 🧭
        </h1>
        <p className="text-sm text-plum-soft">
          Mutfak ilhamı: arkadaşlarının ve diğer şeflerin herkese açık tarifleri.
        </p>
      </header>

      {activity.length > 0 && <ActivityFeed items={activity} />}

      {feed.length > 0 ? (
        <section className="grid grid-cols-2 gap-4">
          {feed.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              authorName={recipe.authorName}
              authorAvatar={recipe.authorAvatar}
              isFavorite={favoriteIds.has(recipe.id)}
            />
          ))}
        </section>
      ) : (
        <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-rose to-butter text-plum">
            <CompassIcon className="h-8 w-8" />
          </span>
          <h2 className="font-heading text-lg font-bold text-plum">
            Keşfedecek tarif yok
          </h2>
          <p className="max-w-xs text-sm text-plum-soft">
            Arkadaşların herkese açık tarif paylaştığında akış dolacak. Kendi
            tarifini paylaşmayı da unutma!
          </p>
        </div>
      )}
    </div>
  );
}
