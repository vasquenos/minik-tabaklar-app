import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFavoriteRecipeIds } from "@/lib/favorites";
import { RecipeCard } from "@/components/recipe/recipe-card";
import { CategoryChips } from "@/components/recipe/category-chips";
import { PlusIcon, SearchIcon, SparklesIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Tariflerim",
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 6) return "İyi geceler";
  if (hour < 12) return "Günaydın";
  if (hour < 18) return "İyi günler";
  return "İyi akşamlar";
}

function firstName(email: string) {
  return (email.split("@")[0] ?? "chef")
    .replace(/[._\d]+/g, " ")
    .trim()
    .split(" ")
    .map((part) => part.charAt(0).toLocaleUpperCase("tr") + part.slice(1))
    .join(" ");
}

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim();
  const category = params.category?.trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let query = supabase
    .from("recipes")
    .select(
      "id, title, category, difficulty, servings, prep_time_minutes, cook_time_minutes, cover_image_url, created_at"
    )
    .order("created_at", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  const { data: recipes } = await query;

  const favoriteIds = await getFavoriteRecipeIds(user.id);

  let filtered = recipes ?? [];
  if (q) {
    const needle = q.toLocaleLowerCase("tr");
    filtered = filtered.filter(
      (recipe) =>
        recipe.title.toLocaleLowerCase("tr").includes(needle) ||
        recipe.category?.toLocaleLowerCase("tr").includes(needle)
    );
  }

  const categories = [
    ...new Set(
      (recipes ?? [])
        .map((recipe) => recipe.category)
        .filter((value): value is string => Boolean(value))
    ),
  ];

  const name = firstName(user.email ?? "");

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <p className="eyebrow">Tarif defterin</p>
          <h1 className="font-heading text-[26px] leading-tight font-bold tracking-tight text-plum">
            {greeting()}, {name}!{" "}
            <span className="inline-block animate-float">✨</span>
          </h1>
          <p className="text-sm text-plum-soft">
            Bugün ne pişireceğiz? 🍳
          </p>
        </div>
        <Link
          href="/recipes/new"
          className="btn-primary btn-icon flex h-11 w-11 shrink-0 items-center justify-center"
          aria-label="Yeni tarif ekle"
        >
          <PlusIcon className="h-5 w-5" />
        </Link>
      </header>

      <form
        action="/recipes"
        className="flex items-center gap-2"
        role="search"
      >
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 h-4.5 w-4.5 -translate-y-1/2 text-plum-faint" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Tarif, malzeme ya da bir heves ara... 🥣"
            className="input rounded-full py-3 pr-4 pl-11 text-sm"
          />
        </div>
        <button
          type="submit"
          aria-label="Ara"
          className="btn-primary btn-icon h-11 w-11 shrink-0"
        >
          <SparklesIcon className="h-5 w-5" />
        </button>
      </form>

      {categories.length > 0 && (
        <CategoryChips categories={categories} active={category} />
      )}

      {filtered.length > 0 ? (
        <section className="grid grid-cols-2 gap-4">
          {filtered.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              authorName={`Senin tarifin`}
              isFavorite={favoriteIds.has(recipe.id)}
            />
          ))}
        </section>
      ) : (
        <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-rose to-butter text-3xl">
            🍽️
          </span>
          <h2 className="font-heading text-lg font-bold text-plum">
            {q || category ? "Sonuç bulunamadı" : "Henüz tarif yok"}
          </h2>
          <p className="max-w-xs text-sm text-plum-soft">
            {q || category
              ? "Farklı bir aramayla tekrar dene ya da ilk tarifini ekle."
              : "İlk tarifini ekle, mutfak maceran başlasın!"}
          </p>
          {!q && !category && (
            <Link
              href="/recipes/new"
              className="btn-primary mt-1 inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold"
            >
              <PlusIcon className="h-4 w-4" />
              Yeni Tarif Ekle
            </Link>
          )}
          {(q || category) && (
            <Link
              href="/recipes"
              className="btn-secondary mt-1 inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold"
            >
              Aramayı Temizle
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
