import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/ui/bottom-nav";
import { Brand } from "@/components/ui/brand";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NotificationsBell } from "@/components/ui/notifications-bell";
import { getUserProfile } from "@/lib/profiles";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [profile, unreadCount] = await Promise.all([
    getUserProfile(user.id),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false),
  ]);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col">
      <header className="glass sticky top-0 z-40 flex items-center justify-between border-b border-latte/70 px-5 py-3">
        <Link
          href="/recipes"
          aria-label="Ana sayfa"
          className="flex items-center gap-2"
        >
          <Brand />
        </Link>

        <div className="flex items-center gap-1.5">
          <NotificationsBell initialUnread={unreadCount.count ?? 0} />
          <ThemeToggle />
          <Link
            href="/profile"
            aria-label="Profil"
            className="btn-icon flex h-9 w-9 items-center justify-center rounded-full bg-blush text-sm font-bold text-rose-deep shadow-card"
          >
            {profile.initial}
          </Link>
        </div>
      </header>

      <main className="flex-1 px-5 pt-4 pb-32">{children}</main>

      <BottomNav />
    </div>
  );
}
