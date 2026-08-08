import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RecipeForm } from "@/components/recipe-form/recipe-form";
import { createRecipe } from "@/lib/recipes/actions";
import { ChevronLeftIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Yeni Tarif",
};

export default async function NewRecipePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Link
          href="/recipes"
          aria-label="Geri dön"
          className="glass btn-icon flex h-10 w-10 items-center justify-center rounded-full text-plum shadow-card"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </Link>
        <div>
          <p className="eyebrow">Yeni tarif</p>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-plum">
            Neler yapıyoruz? 🥣
          </h1>
        </div>
      </div>
      <RecipeForm action={createRecipe} submitLabel="Tarifi Kaydet ✨" userId={user.id} />
    </div>
  );
}
