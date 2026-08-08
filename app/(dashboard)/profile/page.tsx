import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/profiles";
import { signOut } from "@/lib/auth/actions";
import { AvatarUploader } from "@/components/profile/avatar-uploader";
import { NameForm } from "@/components/profile/name-form";
import { MessagePolicyForm } from "@/components/profile/message-policy-form";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  FriendsIcon,
  HeartIcon,
} from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Profil",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [profile, recipeCount, favoriteCount, friendCount] = await Promise.all([
    getUserProfile(user.id),
    supabase
      .from("recipes")
      .select("id, prep_time_minutes, cook_time_minutes")
      .order("created_at", { ascending: false }),
    supabase.from("favorites").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase
      .from("friendships")
      .select("friend_id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "accepted"),
  ]);

  const recipes = recipeCount.data ?? [];
  const totalMinutes =
    recipes.reduce(
      (sum, recipe) =>
        sum + (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0),
      0
    ) ?? 0;

  const stats = [
    { label: "Tarif", value: recipes.length },
    { label: "Favori", value: favoriteCount.count ?? 0 },
    { label: "Arkadaş", value: friendCount.count ?? 0 },
    { label: "Toplam süre", value: `${totalMinutes} dk` },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section className="card flex flex-col items-center gap-4 p-6 text-center">
        <AvatarUploader
          userId={user.id}
          avatarUrl={profile.avatar_url}
          initial={profile.initial}
        />
        <div>
          <h1 className="font-heading text-xl font-bold text-plum">
            {profile.fullName}
          </h1>
          <p className="mt-0.5 text-sm text-plum-soft">
            Minik Tabaklar&apos;a hoş geldin 💛
          </p>
        </div>
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

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/favorites"
          className="btn-soft flex items-center justify-center gap-2 py-3 text-sm font-semibold"
        >
          <HeartIcon className="h-4.5 w-4.5 text-rose-deep" />
          Favoriler
        </Link>
        <Link
          href="/friends"
          className="btn-soft flex items-center justify-center gap-2 py-3 text-sm font-semibold"
        >
          <FriendsIcon className="h-4.5 w-4.5 text-rose-deep" />
          Arkadaşlar
        </Link>
      </div>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="font-heading text-base font-bold text-plum">
          Bilgilerini düzenle
        </h2>
        <NameForm
          firstName={profile.first_name ?? ""}
          lastName={profile.last_name ?? ""}
        />
      </section>

      <section className="card flex flex-col gap-3 p-5">
        <div>
          <h2 className="font-heading text-base font-bold text-plum">
            Mesaj izni
          </h2>
          <p className="text-xs text-plum-soft">
            Kimler sana mesaj gönderebilir?
          </p>
        </div>
        <MessagePolicyForm
          initial={profile.message_policy === "everyone" ? "everyone" : "friends"}
        />
      </section>

      <section className="card flex items-center justify-between gap-3 p-5">
        <div>
          <h2 className="font-heading text-base font-bold text-plum">
            Görünüm
          </h2>
          <p className="text-xs text-plum-soft">Açık / koyu tema</p>
        </div>
        <ThemeToggle />
      </section>

      <form action={signOut} className="mt-2">
        <button
          type="submit"
          className="btn-secondary w-full py-3 text-sm font-semibold text-terracotta hover:bg-terracotta/10"
        >
          Çıkış Yap
        </button>
      </form>
    </div>
  );
}
