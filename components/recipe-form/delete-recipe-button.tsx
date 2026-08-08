"use client";

import { useFormStatus } from "react-dom";
import { deleteRecipe } from "@/lib/recipes/actions";
import { XIcon } from "@/components/ui/icons";

export function DeleteRecipeButton({ recipeId }: { recipeId: string }) {
  const { pending } = useFormStatus();

  return (
    <form action={deleteRecipe.bind(null, recipeId)}>
      <button
        type="submit"
        disabled={pending}
        aria-label="Tarifi sil"
        title={pending ? "Siliniyor…" : "Tarifi sil"}
        className="btn-icon glass flex h-11 w-11 items-center justify-center rounded-full text-terracotta shadow-card transition-colors hover:bg-terracotta/10 disabled:opacity-50"
      >
        <XIcon className="h-5 w-5" />
      </button>
    </form>
  );
}
