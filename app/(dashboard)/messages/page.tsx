import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MessageIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Mesajlar",
};

type MessageRow = {
  sender_id: string;
  recipient_id: string;
  content: string | null;
  recipe_id: string | null;
  created_at: string;
};

function formatTime(value: string) {
  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date) + (sameDay ? "" : " · " + new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" }).format(date));
}

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [friendshipsRes, messagesRes] = await Promise.all([
    supabase
      .from("friendships")
      .select("id, user_id, friend_id, created_at")
      .eq("status", "accepted")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .order("created_at", { ascending: false }),
    supabase
      .from("messages")
      .select("sender_id, recipient_id, content, recipe_id, created_at")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: true })
      .limit(500),
  ]);

  const friends = (friendshipsRes.data ?? []).map((row) =>
    row.user_id === user.id ? row.friend_id : row.user_id
  );

  // Konuşma taraflarını bul (mesaj geçmişi olan herkes).
  const lastByPartner = new Map<string, MessageRow>();
  for (const message of messagesRes.data ?? []) {
    const partner =
      message.sender_id === user.id ? message.recipient_id : message.sender_id;
    lastByPartner.set(partner, message);
  }

  const threadIds = new Set<string>(friends);
  lastByPartner.forEach((_, partner) => threadIds.add(partner));
  const ids = [...threadIds].filter((id) => id !== user.id);

  const { data: profileRows } = await supabase
    .from("profiles")
    .select("user_id, first_name, last_name, avatar_url")
    .in("user_id", ids);

  const profileById = new Map(
    (profileRows ?? []).map((profile) => [profile.user_id, profile])
  );

  const toProfile = (userId: string) => {
    const profile = profileById.get(userId);
    const first = profile?.first_name?.trim() || null;
    const last = profile?.last_name?.trim() || null;
    const fullName = [first, last].filter(Boolean).join(" ") || "Şef";
    return {
      userId,
      fullName,
      initial: (first ?? fullName).charAt(0).toLocaleUpperCase("tr"),
      avatarUrl: profile?.avatar_url ?? null,
      last: lastByPartner.get(userId),
    };
  };

  const threads = ids
    .map(toProfile)
    .sort((a, b) =>
      (b.last?.created_at ?? "").localeCompare(a.last?.created_at ?? "")
    );

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1.5">
        <p className="eyebrow">Gelen kutusu</p>
        <h1 className="font-heading text-[26px] leading-tight font-bold tracking-tight text-plum">
          Mesajlar 💬
        </h1>
        <p className="text-sm text-plum-soft">
          Arkadaşlarınla sohbet et, tarifleri paylaş.
        </p>
      </header>

      {threads.length > 0 ? (
        <ul className="flex flex-col gap-2.5">
          {threads.map((thread) => (
            <li key={thread.userId}>
              <Link
                href={`/friends/${thread.userId}`}
                className="card flex items-center gap-3 p-4 transition-colors hover:bg-blush-soft"
              >
                {thread.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thread.avatarUrl}
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose to-blush text-sm font-bold text-white">
                    {thread.initial}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-bold text-plum">
                      {thread.fullName}
                    </p>
                    {thread.last && (
                      <span className="shrink-0 text-[10px] text-plum-faint">
                        {formatTime(thread.last.created_at)}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-plum-soft">
                    {thread.last
                      ? thread.last.recipe_id
                        ? "📎 Tarif paylaşıldı"
                        : thread.last.content
                      : "Henüz mesaj yok"}
                  </p>
                </div>
                <MessageIcon className="h-4.5 w-4.5 shrink-0 text-rose-deep" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-blush-soft text-3xl">
            💬
          </span>
          <h2 className="font-heading text-lg font-bold text-plum">
            Henüz mesaj yok
          </h2>
          <p className="max-w-xs text-sm text-plum-soft">
            Arkadaşlarınla sohbet etmek için birini ekle ve ilk mesajı yaz.
          </p>
        </div>
      )}
    </div>
  );
}
