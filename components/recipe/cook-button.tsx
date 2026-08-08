"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { toggleCook } from "@/lib/cooks/actions";
import { ChefHatIcon, CheckIcon } from "@/components/ui/icons";

export function CookButton({
  recipeId,
  initialCooked,
  initialCount,
}: {
  recipeId: string;
  initialCooked: boolean;
  initialCount: number;
}) {
  const [cooked, setCooked] = useState(initialCooked);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    const result = await toggleCook(recipeId);
    if (result.error) {
      setError(result.error);
    } else {
      setCooked(result.cooked);
      setCount(result.count);
    }
    setPending(false);
  };

  return (
    <div>
      <button
        type="button"
        aria-pressed={cooked}
        disabled={pending}
        onClick={() => void onClick()}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors",
          cooked
            ? "bg-sage/80 text-sage-deep"
            : "btn-secondary"
        )}
      >
        {cooked ? (
          <CheckIcon className="h-4 w-4" />
        ) : (
          <ChefHatIcon className="h-4 w-4" />
        )}
        Pişirdim
        {count > 0 && (
          <span
            className={cn(
              "ml-0.5 rounded-full px-2 py-0.5 text-xs font-bold",
              cooked ? "bg-white/60" : "bg-blush text-rose-deep"
            )}
          >
            {count}
          </span>
        )}
      </button>
      {error && (
        <p className="mt-1.5 text-xs font-medium text-terracotta">{error}</p>
      )}
    </div>
  );
}
