"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DIFFICULTY_LABELS } from "@/lib/validation/recipes";

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export type AiReply = { reply?: string; error?: string };

// Kullanıcının bu tarif için açtığı AI sohbetini tamamen siler.
// Sohbet "bayat" sayıldığında (belli bir süre önce konuşulmuşsa) temiz başlamak için kullanılır.
export async function clearConversation(recipeId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: conversation } = await supabase
    .from("ai_conversations")
    .select("id")
    .eq("recipe_id", recipeId)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (conversation) {
    await supabase
      .from("ai_messages")
      .delete()
      .eq("conversation_id", conversation.id);
    await supabase
      .from("ai_conversations")
      .delete()
      .eq("id", conversation.id);
  }

  return { ok: true };
}

function buildContext(
  recipe: {
    title: string;
    description: string | null;
    category: string | null;
    difficulty: string | null;
    servings: number | null;
    prep_time_minutes: number | null;
    cook_time_minutes: number | null;
    notes: string | null;
  },
  ingredients: { name: string; quantity: number | null; unit: string | null }[],
  steps: { step_number: number; instruction: string }[],
  tags: { tag_name: string }[]
) {
  const difficulty = recipe.difficulty
    ? DIFFICULTY_LABELS[recipe.difficulty as keyof typeof DIFFICULTY_LABELS]
    : "belirtilmemiş";

  const sections = [
    `Tarif adı: ${recipe.title}`,
    recipe.description ? `Açıklama: ${recipe.description}` : "",
    recipe.category ? `Kategori: ${recipe.category}` : "",
    `Zorluk: ${difficulty}`,
    recipe.servings ? `Porsiyon: ${recipe.servings} kişilik` : "",
    recipe.prep_time_minutes ? `Hazırlık süresi: ${recipe.prep_time_minutes} dk` : "",
    recipe.cook_time_minutes ? `Pişirme süresi: ${recipe.cook_time_minutes} dk` : "",
    `Malzemeler:\n${ingredients
      .map(
        (ingredient) =>
          `- ${ingredient.name}${
            ingredient.quantity !== null
              ? ` (${ingredient.quantity}${ingredient.unit ? ` ${ingredient.unit}` : ""})`
              : ""
          }`
      )
      .join("\n")}`,
    `Hazırlanış:\n${steps
      .map((step) => `${step.step_number}. ${step.instruction}`)
      .join("\n")}`,
    tags.length ? `Etiketler: ${tags.map((tag) => tag.tag_name).join(", ")}` : "",
    recipe.notes ? `Notlar: ${recipe.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `
Sen Minik Tabaklar'ın sevimli aşçı yardımcısısın. Aşağıdaki tarifi temel alarak kullanıcının sorularını cevapla.

KURALLAR:
- Her zaman doğru, anlaşılır ve dilbilgisi düzgün TÜRKÇE cevap ver.
- Uydurma veya anlamsız kelimeler kullanma; bilmediğin bir bilgi varsa varsayım yapıp uydurma, yalnızca mantıklı ve yaygın bilinen öneriler sun.
- Kısa ve pratik ol; mümkünse madde işaretleri kullan, çok uzun paragraflardan kaçın.
- Tarifle ilgisi olmayan sorularda nazikçe yönlendir.
- Cevapların sonuna "Afiyet olsun! 😊" gibi sıcak bir kapanış ekleyebilirsin.

=== TARİF ===
${sections}
=== TARİF SONU ===
`;
}

export async function askAi(
  recipeId: string,
  question: string
): Promise<AiReply> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: recipe } = await supabase
    .from("recipes")
    .select("title, description, category, difficulty, servings, prep_time_minutes, cook_time_minutes, notes")
    .eq("id", recipeId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!recipe) {
    return { error: "Tarif bulunamadı." };
  }

  const [ingredients, steps, tags] = await Promise.all([
    supabase
      .from("recipe_ingredients")
      .select("name, quantity, unit")
      .eq("recipe_id", recipeId)
      .order("order_index"),
    supabase
      .from("recipe_steps")
      .select("step_number, instruction")
      .eq("recipe_id", recipeId)
      .order("step_number"),
    supabase.from("recipe_tags").select("tag_name").eq("recipe_id", recipeId),
  ]);

  let { data: conversation } = await supabase
    .from("ai_conversations")
    .select("id")
    .eq("recipe_id", recipeId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!conversation) {
    const created = await supabase
      .from("ai_conversations")
      .insert({ recipe_id: recipeId, user_id: user.id })
      .select("id")
      .single();
    conversation = created.data;
  }

  if (!conversation) {
    return { error: "Sohbet başlatılamadı." };
  }

  await supabase
    .from("ai_messages")
    .insert({ conversation_id: conversation.id, role: "user", content: question });

  const { data: history } = await supabase
    .from("ai_messages")
    .select("role, content")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true })
    .limit(20);

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return {
      error:
        "AI şu anda uyku modunda 😴 — .env.local içine OPENROUTER_API_KEY eklendiğinde hazır olur.",
    };
  }

  // Önce belirlenen modeli dener; tıkanırsa (429/hata) sıradaki ücretsiz
  // modellere geçer. Son çare olarak openrouter/free yönlendiricisine düşer.
  const models = [
    process.env.OPENROUTER_MODEL?.trim(),
    "google/gemma-4-26b-a4b-it:free",
    "google/gemma-4-31b-it:free",
    "openrouter/free",
  ].filter((model): model is string => Boolean(model));

  const payload = {
    messages: [
      {
        role: "system",
        content: buildContext(
          recipe,
          ingredients.data ?? [],
          steps.data ?? [],
          tags.data ?? []
        ),
      },
      ...(history ?? []).map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.content,
      })),
    ],
    temperature: 0.7,
    max_tokens: 1000,
  };

  let sawRateLimit = false;

  for (const model of models) {
    try {
      const response = await fetch(OPENROUTER_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://tarif-ai.local",
          "X-Title": "Minik Tabaklar",
        },
        body: JSON.stringify({ model, ...payload }),
      });

      if (response.status === 429) {
        sawRateLimit = true;
        continue;
      }

      if (!response.ok) {
        continue;
      }

      const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const reply = data.choices?.[0]?.message?.content?.trim() ?? "";

      if (reply) {
        await supabase
          .from("ai_messages")
          .insert({ conversation_id: conversation.id, role: "assistant", content: reply });
      }

      return { reply: reply || undefined };
    } catch (error) {
      console.error(`AI isteği başarısız (${model}):`, error);
    }
  }

  if (sawRateLimit) {
    return {
      error:
        "AI şu anda çok yoğun (ücretsiz modeller tıkanmış). Biraz sonra tekrar dene! ⏳",
    };
  }

  return {
    error: "AI sağlayıcısından bir yanıt alınamadı. Lütfen tekrar dene.",
  };
}
