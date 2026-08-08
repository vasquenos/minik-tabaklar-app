"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { CheckIcon, MinusIcon, PlusIcon, UsersIcon } from "@/components/ui/icons";

export type IngredientItem = {
  name: string;
  quantity: number | null;
  unit: string | null;
};

function formatQuantity(value: number) {
  if (Number.isInteger(value)) return value.toString();
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 2,
  }).format(value);
}

export function IngredientsList({
  servings,
  ingredients,
}: {
  servings: number | null;
  ingredients: IngredientItem[];
}) {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [targetServings, setTargetServings] = useState(servings ?? 1);
  const [scaled, setScaled] = useState(servings !== null);

  const ratio = servings && servings > 0 ? targetServings / servings : 1;

  const scaledItems = useMemo(
    () =>
      ingredients.map((ingredient) => ({
        ...ingredient,
        quantity:
          ingredient.quantity !== null ? ingredient.quantity * ratio : null,
      })),
    [ingredients, ratio]
  );

  const toggle = (index: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const step = servings && servings > 0 ? servings : 1;

  return (
    <section className="card flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-bold text-plum">
          Ne lazım? 🍓
        </h2>
        {servings !== null && servings > 0 && (
          <div
            className={cn(
              "flex items-center gap-1 rounded-full border px-1.5 py-1 transition-colors",
              scaled
                ? "border-rose bg-blush-soft"
                : "border-latte bg-card"
            )}
          >
            <button
              type="button"
              aria-label="Porsiyonu azalt"
              onClick={() => {
                setScaled(true);
                setTargetServings((value) => Math.max(1, value - step));
              }}
              className="btn-icon h-7 w-7 rounded-full bg-card text-plum shadow-card"
            >
              <MinusIcon className="h-3.5 w-3.5" />
            </button>
            <span className="flex items-center gap-1 px-1 text-xs font-bold text-plum">
              <UsersIcon className="h-3.5 w-3.5 text-rose-deep" />
              {targetServings} kişilik
            </span>
            <button
              type="button"
              aria-label="Porsiyonu artır"
              onClick={() => {
                setScaled(true);
                setTargetServings((value) => value + step);
              }}
              className="btn-icon h-7 w-7 rounded-full bg-card text-plum shadow-card"
            >
              <PlusIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <ul className="flex flex-col gap-1">
        {scaledItems.map((ingredient, index) => {
          const isChecked = checked.has(index);
          return (
            <li key={index}>
              <button
                type="button"
                onClick={() => toggle(index)}
                aria-pressed={isChecked}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-cream",
                  isChecked && "opacity-55"
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                    isChecked
                      ? "border-rose-deep bg-rose-strong text-white"
                      : "border-latte bg-card text-transparent"
                  )}
                >
                  <CheckIcon className="h-3.5 w-3.5 animate-pop" />
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 text-sm transition-all",
                    isChecked ? "text-plum-faint line-through" : "text-plum"
                  )}
                >
                  {ingredient.name}
                </span>
                {ingredient.quantity !== null && (
                  <span
                    className={cn(
                      "shrink-0 text-xs font-semibold",
                      isChecked ? "text-plum-faint" : "text-plum-soft"
                    )}
                  >
                    {formatQuantity(ingredient.quantity)}
                    {ingredient.unit ? ` ${ingredient.unit}` : ""}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
