import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatProfile, type UserProfile } from "@/lib/profiles";
import { MarkNotificationsRead } from "@/components/ui/notification-controls";
import { DeleteNotificationButton } from "@/components/ui/notification-controls";
import {
  BellIcon,
  ChefHatIcon,
  MessageIcon,
  UserPlusIcon,
  CheckCircleIcon,
} from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Bildirimler",
};

type NotificationView = {
  id: string;
  type: string;
  actor: UserProfile | null;
  recipeId: string | null;
  content: string | null;
  read: boolean;
  createdAt: string;
};

const TYPE_META: Record<
  string,
  { text: (name: string) => string; icon: React.ReactNode; tint: string }
> = {
  message: {
    text: (name) => `${name} sana bir mesaj gönderdi`,
    icon: <MessageIcon className="h-4 w-4" />,
    tint: "bg-blush text-rose-deep",
  },
  comment: {
    text: (name) => `${name} tarifine yorum yaptı`,
    icon: <MessageIcon className="h-4 w-4" />,
    tint: "bg-rose/15 text-rose-deep",
  },
  cook: {
    text: (name) => `${name} tarifini pişirdi 🍳`,
    icon: <ChefHatIcon className="h-4 w-4" />,
    tint: "bg-sage/40 text-sage-deep",
  },
  friend_request: {
    text: (name) => `${name} sana arkadaşlık isteği gönderdi`,
    icon: <UserPlusIcon className="h-4 w-4" />,
    tint: "bg-butter/40 text-butter-deep",
  },
  friend_accept: {
    text: (name) => `${name} arkadaşlık isteğini kabul etti`,
    icon: <CheckCircleIcon className="h-4 w-4" />,
    tint: "bg-sage/40 text-sage-deep",
  },
};

function timeAgo(value: string): string {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 1000)
  );
  if (seconds < 60) return "az önce";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün önce`;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
  }).format(new Date(value));
}

function hrefFor(notification: NotificationView): string {
  if (notification.type === "message") {
    return notification.actor ? `/friends/${notification.actor.userId}` : "/friends";
  }
  if (notification.type === "comment" || notification.type === "cook") {
    return notification.recipeId ? `/recipes/${notification.recipeId}` : "/recipes";
  }
  return "/friends";
}

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: rows } = await supabase
    .from("notifications")
    .select("id, type, actor_id, recipe_id, content, read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const actorIds = [
    ...new Set((rows ?? []).map((row) => row.actor_id).filter((id): id is string => Boolean(id))),
  ];

  const actors = new Map<string, UserProfile>();
  if (actorIds.length > 0) {
    const { data: actorRows } = await supabase
      .from("profiles")
      .select("user_id, first_name, last_name, avatar_url")
      .in("user_id", actorIds);
    for (const row of actorRows ?? []) {
      actors.set(row.user_id, formatProfile(row, row.user_id));
    }
  }

  const list: NotificationView[] = (rows ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    actor: row.actor_id ? (actors.get(row.actor_id) ?? null) : null,
    recipeId: row.recipe_id,
    content: row.content,
    read: row.read,
    createdAt: row.created_at,
  }));

  return (
    <div className="flex flex-col gap-5">
      <MarkNotificationsRead />
      <header className="flex flex-col gap-1.5">
        <p className="eyebrow">Son gelişmeler</p>
        <h1 className="flex items-center gap-2 font-heading text-[26px] leading-tight font-bold tracking-tight text-plum">
          <BellIcon className="h-6 w-6 text-rose-deep" />
          Bildirimler
        </h1>
        <p className="text-sm text-plum-soft">
          Mesajlar, yorumlar ve arkadaşlık istekleri burada toplanır.
        </p>
      </header>

      {list.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {list.map((notification) => {
            const meta = TYPE_META[notification.type];
            const href = hrefFor(notification);
            const name = notification.actor?.fullName ?? "Bir kullanıcı";
            return (
              <li key={notification.id}>
                <Link
                  href={href}
                  className={`flex items-center gap-3 rounded-2xl p-3 transition-colors hover:bg-blush-soft ${
                    notification.read ? "bg-card/60" : "bg-card"
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${meta?.tint ?? "bg-latte text-plum-soft"}`}
                  >
                    {meta?.icon ?? <BellIcon className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-snug font-medium text-plum">
                      {meta ? meta.text(name) : name}
                    </span>
                    {notification.content && (
                      <span className="mt-0.5 line-clamp-2 block text-xs text-plum-soft">
                        “{notification.content}”
                      </span>
                    )}
                    <span className="mt-0.5 block text-[11px] text-plum-faint">
                      {timeAgo(notification.createdAt)}
                    </span>
                  </span>
                  {!notification.read && (
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-rose-deep" />
                  )}
                  <DeleteNotificationButton notificationId={notification.id} />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-rose to-blush text-3xl">
            🔔
          </span>
          <h2 className="font-heading text-lg font-bold text-plum">
            Bildirim yok
          </h2>
          <p className="max-w-xs text-sm text-plum-soft">
            Bir arkadaşın sana mesaj attığında ya da tarifini pişirdiğinde burada
            göreceksin.
          </p>
        </div>
      )}
    </div>
  );
}
