"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  banUser,
  unbanUser,
  deleteComment,
  deleteRecipe,
  dismissReport,
  listRecentComments,
  resolveReport,
  searchRecipesByTitle,
  searchUsersByEmail,
  type AdminUser,
} from "@/lib/admin/actions";
import { BanIcon, CheckCircleIcon, SearchIcon, TrashIcon, XIcon } from "@/components/ui/icons";

export function AdminReportActions({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const act = async (fn: () => Promise<{ error?: string } | undefined>) => {
    if (pending) return;
    setPending(true);
    await fn();
    setPending(false);
    router.refresh();
  };

  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => void act(() => resolveReport(reportId))}
        className="inline-flex items-center gap-1 rounded-full bg-sage/40 px-3 py-1.5 text-xs font-semibold text-sage-deep disabled:opacity-50"
      >
        <CheckCircleIcon className="h-3.5 w-3.5" />
        Çözüldü
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => void act(() => dismissReport(reportId))}
        className="inline-flex items-center gap-1 rounded-full bg-latte px-3 py-1.5 text-xs font-semibold text-plum-soft disabled:opacity-50"
      >
        <XIcon className="h-3.5 w-3.5" />
        Geçersiz
      </button>
    </div>
  );
}

export function AdminUserSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pending, setPending] = useState(false);
  const [searched, setSearched] = useState(false);

  const run = async () => {
    setPending(true);
    const result = await searchUsersByEmail(query);
    setUsers(result);
    setSearched(true);
    setPending(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-plum-faint" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void run();
          }}
          placeholder="E-posta veya isim ara…"
          className="input w-full py-2.5 pr-3 pl-9 text-sm"
        />
      </div>

      {users.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {users.map((u) => (
            <li
              key={u.id}
              className="flex flex-col gap-1.5 rounded-2xl bg-cream p-3 dark:bg-[#241b22]"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-plum">
                    {[u.firstName, u.lastName].filter(Boolean).join(" ") || "Kullanıcı"}
                    {u.isAdmin && (
                      <span className="ml-2 rounded-full bg-rose-deep/10 px-2 py-0.5 text-[10px] font-bold text-rose-deep">
                        Admin
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-plum-soft">{u.email ?? "—"}</p>
                </div>
                {u.bannedUntil ? (
                  <button
                    type="button"
                    onClick={() =>
                      void unbanUser(u.id).then(() => router.refresh())
                    }
                    className="shrink-0 rounded-full bg-sage/40 px-3 py-1.5 text-xs font-semibold text-sage-deep"
                  >
                    Engeli kaldır
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void banUser(u.id).then(() => router.refresh())}
                    className="flex shrink-0 items-center gap-1 rounded-full bg-terracotta/15 px-3 py-1.5 text-xs font-semibold text-terracotta"
                  >
                    <BanIcon className="h-3.5 w-3.5" />
                    Engelle
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        searched && (
          <p className="text-sm text-plum-soft">
            Eşleşen kullanıcı bulunamadı.
          </p>
        )
      )}

      {pending && (
        <button
          type="button"
          disabled
          className="w-full rounded-full bg-blush py-2.5 text-sm font-semibold text-rose-deep disabled:opacity-60"
        >
          Aranıyor…
        </button>
      )}
    </div>
  );
}

export function AdminRecipeSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [recipes, setRecipes] = useState<Awaited<ReturnType<typeof searchRecipesByTitle>>>([]);
  const [pending, setPending] = useState(false);
  const [searched, setSearched] = useState(false);

  const run = async () => {
    setPending(true);
    const result = await searchRecipesByTitle(query);
    setRecipes(result);
    setSearched(true);
    setPending(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-plum-faint" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void run();
          }}
          placeholder="Tarif başlığı ara…"
          className="input w-full py-2.5 pr-3 pl-9 text-sm"
        />
      </div>

      {recipes.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {recipes.map((recipe) => (
            <li
              key={recipe.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-cream p-3 dark:bg-[#241b22]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-plum">
                  {recipe.title}
                </p>
                <p className="truncate text-xs text-plum-soft">
                  {recipe.authorName} · {recipe.visibility}
                </p>
              </div>
              <button
                type="button"
                aria-label="Tarifi sil"
                onClick={() => void deleteRecipe(recipe.id).then(() => router.refresh())}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-terracotta hover:bg-terracotta/10"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        searched && <p className="text-sm text-plum-soft">Eşleşen tarif yok.</p>
      )}

      {pending && (
        <button
          type="button"
          disabled
          className="w-full rounded-full bg-blush py-2.5 text-sm font-semibold text-rose-deep disabled:opacity-60"
        >
          Aranıyor…
        </button>
      )}
    </div>
  );
}

export function AdminCommentsList({
  initialComments,
}: {
  initialComments: Awaited<ReturnType<typeof listRecentComments>>;
}) {
  const router = useRouter();
  const [comments, setComments] = useState(initialComments);

  const remove = async (commentId: string) => {
    await deleteComment(commentId);
    setComments((list) => list.filter((c) => c.id !== commentId));
    router.refresh();
  };

  if (comments.length === 0) {
    return <p className="text-sm text-plum-soft">Henüz yorum yok.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {comments.map((comment) => (
        <li
          key={comment.id}
          className="flex items-center justify-between gap-3 rounded-2xl bg-cream p-3 dark:bg-[#241b22]"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-plum">
              {comment.recipeTitle}
            </p>
            <p className="truncate text-xs text-plum-soft">
              {comment.authorName} · “{comment.content}”
            </p>
          </div>
          <button
            type="button"
            aria-label="Yorumu sil"
            onClick={() => void remove(comment.id)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-terracotta hover:bg-terracotta/10"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}
