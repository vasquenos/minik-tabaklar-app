import Link from "next/link";
import { emojiFor } from "./cover-art";

export function CategoryChips({
  categories,
  active,
}: {
  categories: string[];
  active?: string | null;
}) {
  const allActive = !active;

  return (
    <div className="flex gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <Link
        href="/recipes"
        className="chip px-4 py-2 text-sm"
        data-active={allActive}
        aria-current={allActive ? "page" : undefined}
      >
        Tümü ✨
      </Link>

      {categories.map((category) => {
        const isActive = active === category;
        return (
          <Link
            key={category}
            href={`/recipes?category=${encodeURIComponent(category)}`}
            className="chip px-4 py-2 text-sm"
            data-active={isActive}
            aria-current={isActive ? "page" : undefined}
          >
            {emojiFor(category, category)} {category}
          </Link>
        );
      })}
    </div>
  );
}
