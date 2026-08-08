import Link from "next/link";
import { cn } from "@/lib/utils";
import { ClockIcon, TimerIcon } from "@/components/ui/icons";
import { CoverArt } from "./cover-art";
import { FavoriteButton } from "./favorite-button";

export type RecipeCardData = {
  id: string;
  title: string;
  category: string | null;
  cover_image_url: string | null;
  difficulty: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
};

const DIFFICULTY_TONE: Record<string, { label: string; className: string }> = {
  easy: { label: "Kolay ✨", className: "bg-sage/80 text-sage-deep" },
  medium: { label: "Orta 🌿", className: "bg-butter/90 text-butter-deep" },
  hard: { label: "Zor 🔥", className: "bg-terracotta/25 text-terracotta" },
};

export function RecipeCard({
  recipe,
  authorName,
  authorAvatar,
  isFavorite,
  className,
}: {
  recipe: RecipeCardData;
  authorName?: string;
  authorAvatar?: string | null;
  isFavorite?: boolean;
  className?: string;
}) {
  const totalMinutes =
    (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);
  const difficulty = recipe.difficulty
    ? DIFFICULTY_TONE[recipe.difficulty]
    : null;
  const author = authorName ?? "Senin tarifin";

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className={cn(
        "card card-hover group block overflow-hidden p-3",
        className
      )}
    >
      <div className="relative overflow-hidden rounded-2xl">
        <CoverArt
          title={recipe.title}
          category={recipe.category}
          url={recipe.cover_image_url}
          className="aspect-[4/3] w-full"
          emojiClassName="text-6xl"
        />

        <FavoriteButton
          recipeId={recipe.id}
          initial={isFavorite}
          className="absolute top-2.5 right-2.5"
          size="sm"
        />

        <div className="absolute bottom-2.5 left-2.5 flex gap-1.5">
          {totalMinutes > 0 && (
            <span className="glass flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-plum">
              <ClockIcon className="h-3.5 w-3.5 text-rose-deep" />
              {totalMinutes} dk
            </span>
          )}
          {difficulty && (
            <span
              className={cn(
                "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                difficulty.className
              )}
            >
              <TimerIcon className="h-3.5 w-3.5" />
              {difficulty.label}
            </span>
          )}
        </div>
      </div>

      <div className="px-1.5 pt-3 pb-1">
        <h3 className="truncate font-heading text-[15px] font-bold text-plum">
          {recipe.title}
        </h3>
        <div className="mt-1.5 flex items-center gap-2">
          {authorAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={authorAvatar}
              alt=""
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blush text-[10px] font-bold text-rose-deep">
              {author.charAt(0).toLocaleUpperCase("tr")}
            </span>
          )}
          <span className="truncate text-xs font-medium text-plum-soft">
            {author}
          </span>
        </div>
      </div>
    </Link>
  );
}
