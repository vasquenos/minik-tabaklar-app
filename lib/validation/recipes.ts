import { z } from "zod";

export const difficultyValues = ["easy", "medium", "hard"] as const;
export const visibilityValues = ["private", "public"] as const;

// Boş string / null → undefined (opsiyonel alan), diğer girdi Number'a çevrilir.
const numberField = ({ min = 0 }: { min?: number } = {}) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z
      .number({ message: "Geçerli bir sayı girmelisin." })
      .int({ message: "Tam sayı girmelisin." })
      .min(min, {
        message: min > 0 ? `En az ${min} olmalıdır.` : "Negatif olamaz.",
      })
      .optional()
  );

const nullableText = (max: number) =>
  z.preprocess(
    (v) => (v === "" || v === null ? undefined : String(v)),
    z
      .string()
      .trim()
      .max(max, { message: `En fazla ${max} karakter olmalıdır.` })
      .optional()
  );

const ingredientSchema = z.object({
  name: z
    .string({ message: "Malzeme adı boş olamaz." })
    .trim()
    .min(1, { message: "Malzeme adı boş olamaz." })
    .max(200, { message: "Malzeme adı en fazla 200 karakter olmalıdır." }),
  quantity: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z
      .number({ message: "Geçerli bir miktar girmelisin." })
      .positive({ message: "Miktar 0'dan büyük olmalıdır." })
      .optional()
  ),
  unit: nullableText(50),
});

const stepSchema = z.object({
  instruction: z
    .string({ message: "Adım açıklaması boş olamaz." })
    .trim()
    .min(1, { message: "Adım açıklaması boş olamaz." })
    .max(2000, { message: "Adım en fazla 2000 karakter olmalıdır." }),
});

const tagSchema = z
  .string()
  .trim()
  .min(1, { message: "Etiket boş olamaz." })
  .max(50, { message: "Etiket en fazla 50 karakter olmalıdır." });

export const recipeSchema = z.object({
  title: z
    .string({ message: "Tarif adı zorunludur." })
    .trim()
    .min(1, { message: "Tarif adı zorunludur." })
    .max(200, { message: "Tarif adı en fazla 200 karakter olmalıdır." }),
  description: nullableText(2000),
  category: nullableText(100),
  servings: numberField({ min: 1 }),
  prepTimeMinutes: numberField({ min: 0 }),
  cookTimeMinutes: numberField({ min: 0 }),
  difficulty: z
    .enum(difficultyValues, { message: "Geçersiz zorluk seviyesi." })
    .nullable()
    .optional(),
  visibility: z
    .enum(visibilityValues, { message: "Geçersiz görünürlük." })
    .optional()
    .default("public"),
  coverImageUrl: nullableText(1000),
  notes: nullableText(10000),
  ingredients: z
    .array(ingredientSchema)
    .min(1, { message: "En az bir malzeme eklemelisin." }),
  steps: z
    .array(stepSchema)
    .min(1, { message: "En az bir adım eklemelisin." }),
  tags: z
    .array(tagSchema)
    .max(20, { message: "En fazla 20 etiket ekleyebilirsin." })
    .transform((tags) =>
      [...new Set(tags.map((tag) => tag.toLowerCase()))]
    )
    .optional(),
});

export type RecipeInput = z.infer<typeof recipeSchema>;

export const DIFFICULTY_LABELS: Record<
  (typeof difficultyValues)[number],
  string
> = {
  easy: "Kolay",
  medium: "Orta",
  hard: "Zor",
};
