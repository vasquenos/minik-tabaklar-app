"use client";

import { useActionState, useState } from "react";
import { DIFFICULTY_LABELS, difficultyValues } from "@/lib/validation/recipes";
import type { RecipeFormState } from "@/lib/recipes/actions";
import { cn } from "@/lib/utils";
import { SubmitButton } from "./submit-button";
import { CoverImageUploader } from "./cover-image-uploader";
import { EyeIcon, EyeOffIcon, MinusIcon, PlusIcon } from "@/components/ui/icons";

type IngredientRow = { name: string; quantity: string; unit: string };
type StepRow = { instruction: string };

type RecipeFormAction = (
  prev: RecipeFormState,
  formData: FormData
) => Promise<RecipeFormState>;

export type RecipeFormInitial = {
  title: string;
  description: string;
  category: string;
  servings: string;
  prepTimeMinutes: string;
  cookTimeMinutes: string;
  difficulty: string;
  visibility?: string;
  coverImageUrl?: string | null;
  notes: string;
  tags: string;
  ingredients: IngredientRow[];
  steps: StepRow[];
};

const EMPTY_INGREDIENT: IngredientRow = { name: "", quantity: "", unit: "" };
const EMPTY_STEP: StepRow = { instruction: "" };

function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs font-medium text-terracotta">{message}</p>;
}

export function RecipeForm({
  action,
  initial,
  submitLabel,
  userId,
}: {
  action: RecipeFormAction;
  initial?: RecipeFormInitial;
  submitLabel: string;
  userId: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    initial?.ingredients.length ? initial.ingredients : [EMPTY_INGREDIENT]
  );
  const [steps, setSteps] = useState<StepRow[]>(
    initial?.steps.length ? initial.steps : [EMPTY_STEP]
  );
  const [visibility, setVisibility] = useState(
    initial?.visibility ?? "public"
  );

  const error = (name: string) => state?.fieldErrors?.[name];

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state?.error && (
        <p
          role="alert"
          className="rounded-2xl border border-terracotta/30 bg-terracotta/10 px-4 py-3 text-sm text-terracotta"
        >
          {state.error}
        </p>
      )}

      <section className="card flex flex-col gap-4 p-5">
        <h2 className="font-heading text-base font-bold text-plum">
          Temel bilgiler 📝
        </h2>

        <CoverImageUploader
          userId={userId}
          initialUrl={initial?.coverImageUrl ?? null}
        />

        <div>
          <label htmlFor="title" className="label">
            Tarif adı <span className="text-rose-deep">*</span>
          </label>
          <input
            id="title"
            name="title"
            required
            defaultValue={initial?.title}
            placeholder="örn. Yumuşacık Çikolatalı Kek"
            className="input px-4 py-3 text-sm"
          />
          <FieldError message={error("title")} />
        </div>

        <div>
          <label htmlFor="description" className="label">
            Açıklama
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={initial?.description}
            placeholder="Bu tarifi özel kılan ne? Bir iki cümle... 🥰"
            className="input resize-none px-4 py-3 text-sm"
          />
          <FieldError message={error("description")} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="category" className="label">
              Kategori
            </label>
            <input
              id="category"
              name="category"
              defaultValue={initial?.category}
              placeholder="örn. Tatlı"
              className="input px-4 py-3 text-sm"
            />
            <FieldError message={error("category")} />
          </div>

          <div>
            <label htmlFor="difficulty" className="label">
              Zorluk
            </label>
            <select
              id="difficulty"
              name="difficulty"
              defaultValue={initial?.difficulty}
              className="input px-4 py-3 text-sm"
            >
              <option value="">Seçilmedi</option>
              {difficultyValues.map((value) => (
                <option key={value} value={value}>
                  {DIFFICULTY_LABELS[value]}
                </option>
              ))}
            </select>
            <FieldError message={error("difficulty")} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="servings" className="label">
              Kişi
            </label>
            <input
              id="servings"
              name="servings"
              type="number"
              min={1}
              step={1}
              defaultValue={initial?.servings}
              placeholder="4"
              className="input px-3 py-3 text-sm"
            />
            <FieldError message={error("servings")} />
          </div>
          <div>
            <label htmlFor="prepTimeMinutes" className="label">
              Hazırlık (dk)
            </label>
            <input
              id="prepTimeMinutes"
              name="prepTimeMinutes"
              type="number"
              min={0}
              step={1}
              defaultValue={initial?.prepTimeMinutes}
              placeholder="10"
              className="input px-3 py-3 text-sm"
            />
            <FieldError message={error("prepTimeMinutes")} />
          </div>
          <div>
            <label htmlFor="cookTimeMinutes" className="label">
              Pişirme (dk)
            </label>
            <input
              id="cookTimeMinutes"
              name="cookTimeMinutes"
              type="number"
              min={0}
              step={1}
              defaultValue={initial?.cookTimeMinutes}
              placeholder="25"
              className="input px-3 py-3 text-sm"
            />
            <FieldError message={error("cookTimeMinutes")} />
          </div>
        </div>
      </section>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="font-heading text-base font-bold text-plum">
          Ne lazım? 🍓
        </h2>
        {ingredients.map((ingredient, index) => (
          <div key={index} className="flex gap-2">
            <input
              name="ingredients_name[]"
              required
              defaultValue={ingredient.name}
              placeholder="Malzeme adı"
              aria-label={`${index + 1}. malzeme adı`}
              className="input min-w-0 flex-1 px-3 py-2.5 text-sm"
            />
            <input
              name="ingredients_quantity[]"
              type="number"
              step="any"
              min={0}
              defaultValue={ingredient.quantity}
              placeholder="Miktar"
              aria-label={`${index + 1}. malzeme miktarı`}
              className="input w-20 px-2 py-2.5 text-sm"
            />
            <input
              name="ingredients_unit[]"
              defaultValue={ingredient.unit}
              placeholder="Birim"
              aria-label={`${index + 1}. malzeme birimi`}
              className="input w-20 px-2 py-2.5 text-sm"
            />
            <button
              type="button"
              onClick={() =>
                setIngredients((rows) => rows.filter((_, i) => i !== index))
              }
              disabled={ingredients.length === 1}
              className="btn-icon h-10 w-10 shrink-0 self-center rounded-full text-terracotta transition-colors hover:bg-terracotta/10 disabled:opacity-30"
              aria-label={`${index + 1}. malzemeyi kaldır`}
            >
              <MinusIcon className="h-4.5 w-4.5" />
            </button>
          </div>
        ))}
        <div>
          <button
            type="button"
            onClick={() => setIngredients((rows) => [...rows, EMPTY_INGREDIENT])}
            className="btn-secondary inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold"
          >
            <PlusIcon className="h-4 w-4" />
            Malzeme Ekle
          </button>
        </div>
        <FieldError message={error("ingredients")} />
      </section>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="font-heading text-base font-bold text-plum">
          Nasıl yapılır? 🧑‍🍳
        </h2>
        {steps.map((step, index) => (
          <div key={index} className="flex items-start gap-2">
            <span className="mt-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blush text-xs font-bold text-rose-deep">
              {index + 1}
            </span>
            <textarea
              name="steps[]"
              required
              rows={2}
              defaultValue={step.instruction}
              placeholder={`${index + 1}. adım... (ör. "Karışımı 12 dk pişir")`}
              aria-label={`${index + 1}. adım`}
              className="input min-w-0 flex-1 resize-none px-3 py-2.5 text-sm"
            />
            <button
              type="button"
              onClick={() => setSteps((rows) => rows.filter((_, i) => i !== index))}
              disabled={steps.length === 1}
              className="btn-icon mt-1 h-8 w-8 shrink-0 rounded-full text-terracotta transition-colors hover:bg-terracotta/10 disabled:opacity-30"
              aria-label={`${index + 1}. adımı kaldır`}
            >
              <MinusIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
        <div>
          <button
            type="button"
            onClick={() => setSteps((rows) => [...rows, EMPTY_STEP])}
            className="btn-secondary inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold"
          >
            <PlusIcon className="h-4 w-4" />
            Adım Ekle
          </button>
        </div>
        <FieldError message={error("steps")} />
      </section>

      <section className="card flex flex-col gap-4 p-5">
        <h2 className="font-heading text-base font-bold text-plum">
          Kimler görebilir? 👀
        </h2>
        <div className="grid grid-cols-2 gap-2.5">
          {(
            [
              {
                value: "public",
                label: "Herkese açık",
                hint: "Keşfet akışında herkes görsün",
                icon: EyeIcon,
              },
              {
                value: "private",
                label: "Gizli",
                hint: "Sadece senin defterinde kalsın",
                icon: EyeOffIcon,
              },
            ] as const
          ).map((option) => {
            const Icon = option.icon;
            const isActive =
              (visibility ?? "public") === option.value;
            return (
              <label
                key={option.value}
                className={cn(
                  "flex cursor-pointer flex-col gap-1.5 rounded-2xl border-2 px-4 py-3.5 transition-colors",
                  isActive
                    ? "border-rose bg-blush-soft"
                    : "border-latte bg-card"
                )}
              >
                <input
                  type="radio"
                  name="visibility"
                  value={option.value}
                  checked={visibility === option.value}
                  onChange={() => setVisibility(option.value)}
                  className="sr-only"
                />
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full",
                    isActive
                      ? "bg-rose-strong text-white"
                      : "bg-blush-soft text-plum-soft"
                  )}
                >
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <span className="text-sm font-bold text-plum">
                  {option.label}
                </span>
                <span className="text-xs leading-snug text-plum-soft">
                  {option.hint}
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="card flex flex-col gap-4 p-5">
        <h2 className="font-heading text-base font-bold text-plum">
          Ekstra detaylar ✨
        </h2>

        <div>
          <label htmlFor="tags" className="label">
            Etiketler
          </label>
          <input
            id="tags"
            name="tags"
            defaultValue={initial?.tags}
            placeholder="virgülle ayır, örn. kış, çorba, vejetaryen"
            className="input px-4 py-3 text-sm"
          />
          <FieldError message={error("tags")} />
        </div>

        <div>
          <label htmlFor="notes" className="label">
            Notlar
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            defaultValue={initial?.notes}
            placeholder="Püf noktaları, değişiklikler, saklama ipuçları..."
            className="input resize-none px-4 py-3 text-sm"
          />
          <FieldError message={error("notes")} />
        </div>
      </section>

      <SubmitButton
        label={submitLabel}
        pendingLabel={pending ? "Kaydediliyor…" : submitLabel}
      />
    </form>
  );
}
