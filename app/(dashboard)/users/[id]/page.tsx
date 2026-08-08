import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/profiles";
import { getFriendshipStatus } from "@/lib/friends/actions";
import { getBlockStatus } from "@/lib/blocks/actions";
import { RecipeCard } from "@/components/recipe/recipe-card";
import { FriendAddButton } from "@/components/friends/friend-add-button";
import { BlockButton } from "@/components/social/block-button";
import { ReportButton } from "@/components/social/report-button";
import { ChefHatIcon, MessageIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Profil",
};

export default async function UserProfilePage({
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
  if (id === user.id) {
    redirect("/profile");
  }

  const profile = await getUserProfile(id);

  const [{ data: recipes }, friendshipStatus, blockStatus] = await Promise.all([
    supabase
      .from("recipes")
      .select(
        "id, title, category, difficulty, servings, prep_time_minutes, cook_time_minutes, cover_image_url, created_at, user_id"
      )
      .eq("user_id", id)
      .eq("visibility", "public")
      .order("created_at", { ascending: false }),
    getFriendshipStatus(id),
    getBlockStatus(id),
  ]);

  const recipeList = recipes ?? [];
  const recipeIds = recipeList.map((recipe) => recipe.id);

  const { count: cooksCount } = recipeIds.length
    ? await supabase
        .from("recipe_cooks")
        .select("user_id", { count: "exact", head: true })
        .in("recipe_id", recipeIds)
    : { count: 0 };

  const canMessage =
    blockStatus === "none" &&
    (friendshipStatus === "friends" || profile.message_policy === "everyone");

  const stats = [
    { label: "Tarif", value: recipeList.length },
    { label: "Pişirme onayı", value: cooksCount ?? 0 },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section className="card flex flex-col items-center gap-4 p-6 text-center">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt=""
            className="h-20 w-20 rounded-full object-cover shadow-glow"
          />
        ) : (
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-rose to-blush text-3xl font-bold text-white shadow-glow">
            {profile.initial}
          </span>
        )}
        <div>
          <h1 className="font-heading text-xl font-bold text-plum">
            {profile.fullName}
          </h1>
          <p className="mt-0.5 text-sm text-plum-soft">
            Minik Tabaklar üyesi
          </p>
        </div>

        {blockStatus === "blocked_by_other" ? (
          <p className="rounded-full bg-latte px-4 py-2 text-xs font-semibold text-plum-soft">
            Bu kullanıcı seni engelledi.
          </p>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <FriendAddButton userId={id} initial={friendshipStatus} size="sm" />
            {canMessage && (
              <Link
                href={`/friends/${id}`}
                className="btn-secondary inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold"
              >
                <MessageIcon className="h-4 w-4" />
                Mesaj At
              </Link>
            )}
            <BlockButton
              userId={id}
              initialBlocked={blockStatus === "blocked_by_me"}
            />
            <ReportButton
              targetType="user"
              targetId={id}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-plum-soft hover:text-terracotta"
              label="Şikayet Et"
            />
          </div>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="card flex flex-col items-center gap-0.5 p-4 text-center"
          >
            <span className="font-heading text-xl font-bold text-plum">
              {stat.value}
            </span>
            <span className="text-xs font-medium text-plum-faint">
              {stat.label}
            </span>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <header className="flex items-center gap-2">
          <ChefHatIcon className="h-4.5 w-4.5 text-rose-deep" />
          <h2 className="font-heading text-base font-bold text-plum">
            Tarifleri
          </h2>
        </header>

        {recipeList.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {recipeList.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                authorName={profile.fullName}
                authorAvatar={profile.avatar_url}
                isFavorite={false}
              />
            ))}
          </div>
        ) : (
          <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blush text-2xl">
              🥄
            </span>
            <p className="max-w-xs text-sm text-plum-soft">
              Henüz herkese açık tarif paylaşmamış.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
