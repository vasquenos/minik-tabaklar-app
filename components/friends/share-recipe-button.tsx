"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "@/lib/messages/actions";
import { ShareIcon, UserPlusIcon, XIcon } from "@/components/ui/icons";

type Friend = {
  userId: string;
  fullName: string;
  initial: string;
  avatarUrl: string | null;
};

export function ShareRecipeButton({
  recipeId,
  className,
}: {
  recipeId: string;
  className?: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const loadFriends = async () => {
      setLoading(true);
      setError(null);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: friendships } = await supabase
        .from("friendships")
        .select("user_id, friend_id")
        .eq("status", "accepted")
        .or(
          `and(user_id.eq.${user.id},friend_id.neq.${user.id}),and(user_id.neq.${user.id},friend_id.eq.${user.id})`
        );

      const otherIds = new Set<string>();
      (friendships ?? []).forEach((row) => {
        if (row.user_id === user.id) otherIds.add(row.friend_id);
        else otherIds.add(row.user_id);
      });

      if (otherIds.size === 0) {
        setFriends([]);
        setLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, avatar_url")
        .in("user_id", [...otherIds]);

      const rows: Friend[] = (profiles ?? []).map((profile) => {
        const first = profile.first_name?.trim() || null;
        const last = profile.last_name?.trim() || null;
        const fullName = [first, last].filter(Boolean).join(" ") || "Şef";
        return {
          userId: profile.user_id,
          fullName,
          initial: (first ?? fullName).charAt(0).toLocaleUpperCase("tr"),
          avatarUrl: profile.avatar_url,
        };
      });
      if (!cancelled) {
        setFriends(rows);
        setLoading(false);
      }
    };

    void loadFriends();
    return () => {
      cancelled = true;
    };
  }, [open, supabase]);

  const share = async (friendId: string) => {
    setSendingTo(friendId);
    setError(null);
    const result = await sendMessage(friendId, "", recipeId);
    if (result && "error" in result) {
      setError(result.error);
      setSendingTo(null);
      return;
    }
    setOpen(false);
    setSendingTo(null);
    router.push(`/friends/${friendId}`);
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Tarifi paylaş"
        className={className}
      >
        <ShareIcon className="h-5 w-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Tarifi arkadaşına gönder"
            className="max-w-md w-full rounded-t-[28px] bg-card p-5 pb-8 shadow-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-latte" />
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-lg font-bold text-plum">
                Arkadaşına gönder
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Kapat"
                className="btn-icon flex h-8 w-8 items-center justify-center rounded-full"
              >
                <XIcon className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="mt-4 max-h-[50dvh] overflow-y-auto">
              {loading ? (
                <p className="py-6 text-center text-sm text-plum-soft">
                  Arkadaşlar yükleniyor…
                </p>
              ) : friends.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blush-soft text-rose-deep">
                    <UserPlusIcon className="h-5 w-5" />
                  </span>
                  <p className="max-w-56 text-sm text-plum-soft">
                    Paylaşmak için önce arkadaş eklemen gerek.
                  </p>
                  <Link
                    href="/friends"
                    onClick={() => setOpen(false)}
                    className="btn-primary px-4 py-2 text-xs font-semibold"
                  >
                    Arkadaş Ekle
                  </Link>
                </div>
              ) : (
                <ul className="flex flex-col">
                  {friends.map((friend) => (
                    <li key={friend.userId}>
                      <button
                        type="button"
                        disabled={sendingTo === friend.userId}
                        onClick={() => void share(friend.userId)}
                        className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left hover:bg-blush-soft disabled:opacity-60"
                      >
                        {friend.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={friend.avatarUrl}
                            alt=""
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-rose to-blush text-sm font-bold text-white">
                            {friend.initial}
                          </span>
                        )}
                        <span className="flex-1 truncate text-sm font-semibold text-plum">
                          {friend.fullName}
                        </span>
                        <span className="text-xs text-plum-soft">
                          {sendingTo === friend.userId ? "Gönderiliyor…" : "Gönder →"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {error && (
              <p className="mt-3 text-center text-xs font-medium text-terracotta">
                {error}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
