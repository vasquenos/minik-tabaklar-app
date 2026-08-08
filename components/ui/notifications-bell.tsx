"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { BellIcon } from "@/components/ui/icons";

type RealtimeNotification = {
  id: string;
  user_id: string;
  type: string;
  content: string | null;
};

const TYPE_TITLE: Record<string, string> = {
  message: "💬 Yeni mesaj",
  comment: "💬 Yeni yorum",
  cook: "🍳 Birisi tarifini pişirdi",
  friend_request: "👋 Arkadaşlık isteği",
  friend_accept: "✅ Arkadaşlık isteği kabul edildi",
};

export function NotificationsBell({ initialUnread }: { initialUnread: number }) {
  const supabase = createClient();
  const [unread, setUnread] = useState(initialUnread);
  const unreadRef = useRef(initialUnread);

  useEffect(() => {
    const channel = supabase
      .channel("notifications:bell")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const row = payload.new as unknown as RealtimeNotification;
          void supabase.auth
            .getUser()
            .then(({ data }) => {
              if (data.user && row.user_id === data.user.id) {
                unreadRef.current += 1;
                setUnread(unreadRef.current);
                const title = TYPE_TITLE[row.type] ?? "🔔 Yeni bildirim";
                const body = row.content ?? "Minik Tabaklar'dan bir gelişme var.";
                if ("Notification" in window) {
                  if (Notification.permission === "granted") {
                    new Notification(title, { body });
                  } else if (Notification.permission === "default") {
                    void Notification.requestPermission().then((permission) => {
                      if (permission === "granted") {
                        new Notification(title, { body });
                      }
                    });
                  }
                }
              }
            })
            .catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <Link
      href="/notifications"
      aria-label="Bildirimler"
      className="btn-icon relative flex h-9 w-9 items-center justify-center rounded-full text-plum"
    >
      <BellIcon className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-strong px-1 text-[10px] font-bold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
