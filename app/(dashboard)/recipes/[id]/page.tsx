import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile, formatProfile, type UserProfile } from "@/lib/profiles";
import { getFriendshipStatus } from "@/lib/friends/actions";
import { clearConversation } from "@/lib/ai/actions";

// Son konuşma bu süreden eskiyse sohbet "bayat" sayılır ve sayfa açılırken
// otomatik temizlenir.
const AI_STALE_MS = 24 * 60 * 60 * 1000;
import { DeleteRecipeButton } from "@/components/recipe-form/delete-recipe-button";
import { CoverArt } from "@/components/recipe/cover-art";
import { RecipeStats } from "@/components/recipe/recipe-stats";
import { IngredientsList } from "@/components/recipe/ingredients-list";
import { CookingSteps } from "@/components/recipe/cooking-steps";
import { CookButton } from "@/components/recipe/cook-button";
import { AiChat } from "@/components/recipe/ai-chat";
import { FavoriteButton } from "@/components/recipe/favorite-button";
import { ShareRecipeButton } from "@/components/friends/share-recipe-button";
import { FriendAddButton } from "@/components/friends/friend-add-button";
import { ReportButton } from "@/components/social/report-button";
import {
  CommentsSection,
  type CommentView,
} from "@/components/recipe/comments-section";
import {
  BookmarkIcon,
  ChevronLeftIcon,
  EyeIcon,
  EyeOffIcon,
  PenIcon,
} from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Tarif",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

// Bayat sohbet kontrolü (impure Date.now bileşen dışına taşındı).
function isStaleConversation(activity: string): boolean {
  return Date.now() - new Date(activity).getTime() > AI_STALE_MS;
}

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: recipe } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!recipe) {
    notFound();
  }

  const isOwner = recipe.user_id === user.id;

  const [ingredients, steps, tags, conversation, favorite] = await Promise.all([
    supabase
      .from("recipe_ingredients")
      .select("name, quantity, unit")
      .eq("recipe_id", id)
      .order("order_index"),
    supabase
      .from("recipe_steps")
      .select("step_number, instruction")
      .eq("recipe_id", id)
      .order("step_number"),
    supabase.from("recipe_tags").select("tag_name").eq("recipe_id", id),
    supabase
      .from("ai_conversations")
      .select("id, created_at")
      .eq("recipe_id", id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("favorites")
      .select("recipe_id")
      .eq("user_id", user.id)
      .eq("recipe_id", id)
      .maybeSingle(),
  ]);

  let aiMessages: { role: "user" | "assistant"; content: string }[] = [];
  let aiClearedOnLoad = false;
  if (conversation.data) {
    const { data: messages } = await supabase
      .from("ai_messages")
      .select("role, content, created_at")
      .eq("conversation_id", conversation.data.id)
      .order("created_at", { ascending: true });
    const list = messages ?? [];
    const last = list[list.length - 1];
    const lastActivity = last?.created_at ?? conversation.data.created_at;

    // Bayat sohbet: geçmiş temizlenir ve boş bir sohbet sunulur.
    if (isStaleConversation(lastActivity)) {
      await clearConversation(recipe.id);
      aiClearedOnLoad = true;
    } else {
      aiMessages = list.map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.content,
      }));
    }
  }

  const stepData = (steps.data ?? []).map((step) => ({
    step_number: step.step_number,
    instruction: step.instruction,
  }));

  const author = isOwner
    ? { fullName: "Senin tarifin", avatar_url: null }
    : await getUserProfile(recipe.user_id);

  const friendshipStatus = isOwner
    ? "friends"
    : await getFriendshipStatus(recipe.user_id);

  let commentViews: CommentView[] = [];
  if (recipe.visibility === "public") {
    const { data: commentRows } = await supabase
      .from("recipe_comments")
      .select("id, user_id, content, created_at")
      .eq("recipe_id", id)
      .order("created_at", { ascending: true });

    const commentAuthorIds = [
      ...new Set((commentRows ?? []).map((comment) => comment.user_id)),
    ];
    const commentAuthors = new Map<string, UserProfile>();
    if (commentAuthorIds.length > 0) {
      const { data: authorRows } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, avatar_url")
        .in("user_id", commentAuthorIds);
      for (const row of authorRows ?? []) {
        commentAuthors.set(row.user_id, formatProfile(row, row.user_id));
      }
    }

    commentViews = (commentRows ?? []).map((row) => {
      const author = commentAuthors.get(row.user_id);
      return {
        id: row.id,
        userId: row.user_id,
        content: row.content,
        createdAt: row.created_at,
        authorName: author?.fullName ?? "Şef",
        authorAvatar: author?.avatar_url ?? null,
        authorInitial: author?.initial ?? "Ş",
        isOwn: row.user_id === user.id,
      };
    });
  }

  const currentUserProfile = await getUserProfile(user.id);

  let cookCount = 0;
  let hasCooked = false;
  if (recipe.visibility === "public") {
    const [{ count }, myCook] = await Promise.all([
      supabase
        .from("recipe_cooks")
        .select("user_id", { count: "exact", head: true })
        .eq("recipe_id", id),
      supabase
        .from("recipe_cooks")
        .select("recipe_id")
        .eq("recipe_id", id)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    cookCount = count ?? 0;
    hasCooked = Boolean(myCook.data);
  }

  return (
    <article className="flex flex-col gap-6">
      <div className="relative">
        <CoverArt
          title={recipe.title}
          category={recipe.category}
          url={recipe.cover_image_url}
          className="aspect-[16/10] w-full rounded-b-[32px]"
          emojiClassName="text-7xl"
        />
        <div className="absolute top-4 left-4">
          <Link
            href="/recipes"
            aria-label="Geri dön"
            className="glass btn-icon flex h-10 w-10 items-center justify-center rounded-full text-plum shadow-card"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </Link>
        </div>
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {recipe.visibility === "public" && (
            <>
              <ShareRecipeButton
                recipeId={recipe.id}
                className="glass btn-icon flex h-11 w-11 items-center justify-center rounded-full text-plum shadow-card hover:text-rose-deep"
              />
              <ReportButton
                targetType="recipe"
                targetId={recipe.id}
                className="glass btn-icon flex h-11 w-11 items-center justify-center rounded-full text-plum shadow-card hover:text-terracotta"
              />
            </>
          )}
          <FavoriteButton
            recipeId={recipe.id}
            initial={Boolean(favorite.data)}
            size="md"
          />
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <header className="flex flex-col gap-2">
          <p className="eyebrow">
            {recipe.category ?? "Tarif"}
            {recipe.created_at ? ` · ${formatDate(recipe.created_at)}` : ""}
          </p>
          <div className="flex items-start justify-between gap-4">
            <h1 className="font-heading text-3xl leading-tight font-bold tracking-tight text-plum">
              {recipe.title}
            </h1>
            {isOwner && (
              <div className="flex shrink-0 gap-2">
                <Link
                  href={`/recipes/${recipe.id}/edit`}
                  aria-label="Tarifi düzenle"
                  className="glass btn-icon flex h-11 w-11 items-center justify-center rounded-full text-plum shadow-card hover:text-rose-deep"
                >
                  <PenIcon className="h-5 w-5" />
                </Link>
                <DeleteRecipeButton recipeId={recipe.id} />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isOwner ? (
              <div className="flex items-center gap-2">
                {author.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={author.avatar_url}
                    alt=""
                    className="h-7 w-7 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blush text-xs font-bold text-rose-deep">
                    {author.fullName.charAt(0).toLocaleUpperCase("tr")}
                  </span>
                )}
                <span className="text-sm font-semibold text-plum-soft">
                  {author.fullName}
                </span>
              </div>
            ) : (
              <>
                <Link
                  href={`/users/${recipe.user_id}`}
                  className="flex items-center gap-2 rounded-full"
                >
                  {author.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={author.avatar_url}
                      alt=""
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blush text-xs font-bold text-rose-deep">
                      {author.fullName.charAt(0).toLocaleUpperCase("tr")}
                    </span>
                  )}
                  <span className="text-sm font-semibold text-plum-soft">
                    {author.fullName}
                  </span>
                </Link>
                <FriendAddButton
                  userId={recipe.user_id}
                  initial={friendshipStatus}
                  size="sm"
                />
              </>
            )}

            {isOwner && (
              <span
                className={
                  recipe.visibility === "public"
                    ? "flex items-center gap-1 rounded-full bg-sage/50 px-2.5 py-1 text-[11px] font-semibold text-sage-deep"
                    : "flex items-center gap-1 rounded-full bg-latte px-2.5 py-1 text-[11px] font-semibold text-plum-soft"
                }
              >
                {recipe.visibility === "public" ? (
                  <EyeIcon className="h-3.5 w-3.5" />
                ) : (
                  <EyeOffIcon className="h-3.5 w-3.5" />
                )}
                {recipe.visibility === "public" ? "Herkese açık" : "Gizli"}
              </span>
            )}
          </div>

          {recipe.description && (
            <p className="text-sm leading-relaxed text-plum-soft">
              {recipe.description}
            </p>
          )}
        </header>

        <RecipeStats
          stats={{
            servings: recipe.servings,
            prepTimeMinutes: recipe.prep_time_minutes,
            cookTimeMinutes: recipe.cook_time_minutes,
            difficulty: recipe.difficulty,
          }}
        />

        {recipe.visibility === "public" && (
          <CookButton
            recipeId={recipe.id}
            initialCooked={hasCooked}
            initialCount={cookCount}
          />
        )}

        <IngredientsList
          servings={recipe.servings}
          ingredients={(ingredients.data ?? []).map((ingredient) => ({
            name: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
          }))}
        />

        <CookingSteps steps={stepData} />

        {recipe.visibility === "public" && (
          <CommentsSection
            recipeId={recipe.id}
            initialComments={commentViews}
            currentUser={{
              userId: user.id,
              fullName: currentUserProfile.fullName,
              avatarUrl: currentUserProfile.avatar_url,
              initial: currentUserProfile.initial,
            }}
          />
        )}

        {isOwner && (
          <AiChat
            recipeId={recipe.id}
            recipeTitle={recipe.title}
            initialMessages={aiMessages}
            clearedOnLoad={aiClearedOnLoad}
            inline
          />
        )}

        {tags.data?.length ? (
          <section className="flex flex-wrap gap-2">
            {tags.data.map((tag) => (
              <span
                key={tag.tag_name}
                className="chip cursor-default px-3.5 py-1.5 text-xs"
              >
                # {tag.tag_name}
              </span>
            ))}
          </section>
        ) : null}

        {recipe.notes && (
          <section className="card flex flex-col gap-2 p-5">
            <h2 className="flex items-center gap-1.5 font-heading text-base font-bold text-plum">
              <BookmarkIcon className="h-4.5 w-4.5 text-rose-deep" />
              Notlar
            </h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-plum-soft">
              {recipe.notes}
            </p>
          </section>
        )}
      </div>
    </article>
  );
}
