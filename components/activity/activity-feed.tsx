import Link from "next/link";
import type { ActivityItem } from "@/lib/activity";
import { CoverArt } from "@/components/recipe/cover-art";
import { ChefHatIcon, HeartIcon } from "@/components/ui/icons";

function timeAgo(value: string): string {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 1000)
  );
  if (seconds < 3600) return "az önce";
  const hours = Math.floor(seconds / 3600);
  if (hours < 24) return `${hours} sa önce`;
  return `${Math.floor(hours / 24)} gün önce`;
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 font-heading text-base font-bold text-plum">
          <ChefHatIcon className="h-4.5 w-4.5 text-rose-deep" />
          Arkadaşların yeni
        </h2>
      </header>

      <ul className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
        {items.map((item) => (
          <li key={`${item.kind}-${item.recipeId}`} className="shrink-0">
            <Link
              href={`/recipes/${item.recipeId}`}
              className="card card-hover group block w-44 overflow-hidden p-2.5"
            >
              <div className="relative overflow-hidden rounded-xl">
                <CoverArt
                  title={item.title}
                  category={item.category}
                  url={item.coverImageUrl}
                  className="aspect-[4/3] w-full"
                  emojiClassName="text-4xl"
                />
                <span
                  className={`absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${
                    item.kind === "recipe" ? "bg-rose-strong/90" : "bg-plum/70"
                  }`}
                >
                  {item.kind === "recipe" ? (
                    <ChefHatIcon className="h-3 w-3" />
                  ) : (
                    <HeartIcon filled className="h-3 w-3" />
                  )}
                  {item.kind === "recipe" ? "Yeni tarif" : "Favoriledi"}
                </span>
              </div>
              <div className="px-1 pt-2 pb-0.5">
                <h3 className="truncate font-heading text-sm font-bold text-plum">
                  {item.title}
                </h3>
                <p className="mt-0.5 truncate text-xs text-plum-soft">
                  {item.actorName}
                  <span className="ml-1 text-[11px] text-plum-faint">
                    {timeAgo(item.createdAt)}
                  </span>
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
