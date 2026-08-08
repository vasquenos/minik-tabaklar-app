"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "@/lib/messages/actions";
import { cn } from "@/lib/utils";
import { CoverArt } from "@/components/recipe/cover-art";
import { BlockButton } from "@/components/social/block-button";
import { ReportButton } from "@/components/social/report-button";
import {
  ArrowLeftIcon,
  SendIcon,
  SpinnerIcon,
} from "@/components/ui/icons";

type ChatMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string | null;
  recipe_id: string | null;
  created_at: string;
};

type RecipePreview = {
  id: string;
  title: string;
  category: string | null;
  cover_image_url: string | null;
};

export function ChatClient({
  meId,
  other,
  initialMessages,
  recipesById,
}: {
  meId: string;
  other: { userId: string; fullName: string; initial: string; avatarUrl: string | null };
  initialMessages: ChatMessage[];
  recipesById: Record<string, RecipePreview>;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [recipes, setRecipes] = useState<Record<string, RecipePreview>>(
    recipesById
  );
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const seenIds = useRef<Set<string>>(new Set(initialMessages.map((m) => m.id)));

  const addRecipeIfMissing = async (recipeId: string) => {
    if (!recipeId || recipes[recipeId]) return;
    const { data } = await supabase
      .from("recipes")
      .select("id, title, category, cover_image_url")
      .eq("id", recipeId)
      .eq("visibility", "public")
      .maybeSingle();
    if (data) {
      setRecipes((prev) => ({ ...prev, [recipeId]: data as RecipePreview }));
    }
  };

  const appendMessage = (message: ChatMessage) => {
    if (seenIds.current.has(message.id)) return;
    seenIds.current.add(message.id);
    setMessages((prev) =>
      [...prev, message].sort((a, b) =>
        a.created_at.localeCompare(b.created_at)
      )
    );
    if (message.recipe_id) {
      void addRecipeIfMissing(message.recipe_id);
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel(`chat:${meId}:${other.userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          // RLS zaten yalnızca aramızdaki mesajları getirir; yine de doğrula.
          const row = payload.new as unknown as ChatMessage;
          const betweenUs =
            row.sender_id === meId || row.recipient_id === meId;
          if (!betweenUs) return;
          appendMessage(row);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    setError(null);
    const result = await sendMessage(other.userId, text);
    setSending(false);

    if (result && "sent" in result) {
      appendMessage(result.sent);
      setDraft("");
    } else if (result && "error" in result) {
      setError(result.error);
    }
  };

  const otherInitial = other.initial || "Ş";

  return (
    <div className="flex min-h-[calc(100dvh-9rem)] flex-col">
      <header className="flex items-center gap-3 pb-4">
        <button
          type="button"
          onClick={() => router.push("/friends")}
          aria-label="Geri dön"
          className="btn-icon flex h-9 w-9 items-center justify-center rounded-full"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        {other.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={other.avatarUrl}
            alt=""
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-rose to-blush text-sm font-bold text-white">
            {otherInitial}
          </span>
        )}
        <div>
          <h1 className="font-heading text-base font-bold text-plum">
            {other.fullName}
          </h1>
          <p className="text-xs text-plum-soft">Birebir sohbet</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <ReportButton
            targetType="user"
            targetId={other.userId}
            className="btn-icon flex h-9 w-9 items-center justify-center rounded-full text-plum-soft hover:text-terracotta"
          />
          <BlockButton userId={other.userId} initialBlocked={false} variant="plain" />
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="text-3xl">🥨</span>
            <p className="text-sm text-plum-soft">
              Henüz mesaj yok. Tarifinle başla, belki sonra paylaşırsın!
            </p>
          </div>
        )}

        {messages.map((message) => {
          const mine = message.sender_id === meId;
          const recipe = message.recipe_id ? recipes[message.recipe_id] : null;
          return (
            <div
              key={message.id}
              className={cn(
                "flex flex-col",
                mine ? "items-end" : "items-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-3xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words",
                  mine
                    ? "rounded-br-md bg-gradient-to-br from-rose to-rose-strong text-white"
                    : "rounded-bl-md bg-card text-plum shadow-card"
                )}
              >
                {recipe && (
                  <Link
                    href={`/recipes/${recipe.id}`}
                    className="mb-2 block overflow-hidden rounded-xl border border-latte"
                  >
                    <CoverArt
                      title={recipe.title}
                      category={recipe.category}
                      url={recipe.cover_image_url}
                      className="aspect-[16/9] w-44"
                      emojiClassName="text-3xl"
                    />
                    <span className="block bg-card px-3 py-2 text-xs font-bold text-plum">
                      📖 {recipe.title}
                    </span>
                  </Link>
                )}
                {message.content && <span>{message.content}</span>}
              </div>
              <span className="mt-0.5 px-1 text-[10px] text-plum-faint">
                {new Date(message.created_at).toLocaleTimeString("tr-TR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="pb-2 text-xs font-medium text-terracotta">{error}</p>
      )}

      <form onSubmit={(event) => void submit(event)} className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Mesaj yaz…"
          maxLength={2000}
          className="input flex-1 rounded-full py-3 px-4 text-sm"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          aria-label="Gönder"
          className="btn-primary btn-icon flex h-11 w-11 shrink-0 items-center justify-center disabled:opacity-60"
        >
          {sending ? <SpinnerIcon className="h-5 w-5 animate-spin" /> : <SendIcon className="h-5 w-5" />}
        </button>
      </form>
    </div>
  );
}
