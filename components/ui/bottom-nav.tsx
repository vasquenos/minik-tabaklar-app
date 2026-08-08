"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { cn } from "@/lib/utils";
import {
  ChefHatIcon,
  CompassIcon,
  FriendsIcon,
  HeartIcon,
  PlusIcon,
  UserIcon,
} from "@/components/ui/icons";

type NavIcon = ComponentType<SVGProps<SVGSVGElement> & { filled?: boolean }>;
type NavItem = { href: string; label: string; icon: NavIcon };

const leftItems: NavItem[] = [
  { href: "/recipes", label: "Ana Sayfa", icon: ChefHatIcon },
  { href: "/discover", label: "Keşfet", icon: CompassIcon },
];

const rightItems: NavItem[] = [
  { href: "/favorites", label: "Favoriler", icon: HeartIcon },
  { href: "/friends", label: "Arkadaşlar", icon: FriendsIcon },
  { href: "/profile", label: "Profil", icon: UserIcon },
];

const matchRules: Record<string, (pathname: string) => boolean> = {
  "/recipes": (pathname) =>
    pathname === "/recipes" || pathname.startsWith("/recipes/"),
  "/discover": (pathname) => pathname === "/discover",
  "/favorites": (pathname) => pathname === "/favorites",
  "/friends": (pathname) =>
    pathname === "/friends" || pathname.startsWith("/friends/"),
  "/profile": (pathname) => pathname === "/profile",
};

export function BottomNav() {
  const pathname = usePathname();

  const renderItem = (item: NavItem, active: boolean) => {
    const Icon = item.icon;
    return (
      <Link
        key={item.label}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-full transition-colors",
          active && "bg-rose/35 text-rose-deep"
        )}
      >
        {active && (
          <span className="absolute inset-0 rounded-full bg-gradient-to-br from-rose to-blush opacity-35 blur-[2px]" />
        )}
        <Icon
          filled={item.icon === HeartIcon}
          className={cn(
            "relative h-5.5 w-5.5",
            active ? "text-rose-deep" : "text-plum-faint"
          )}
        />
        <span
          className={cn(
            "relative text-[10px] font-semibold",
            active ? "text-rose-deep" : "text-plum-faint"
          )}
        >
          {item.label}
        </span>
      </Link>
    );
  };

  const isActive = (item: NavItem) =>
    matchRules[item.href]?.(pathname) ?? false;

  const onNewRecipe = pathname === "/recipes/new";

  return (
    <nav
      aria-label="Alt gezinme"
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center pb-4"
    >
      <div className="glass mx-4 flex w-full max-w-md items-center gap-1 rounded-full px-2 py-1.5 shadow-lift">
        {leftItems.map((item) => renderItem(item, isActive(item)))}

        <Link
          href="/recipes/new"
          aria-label="Yeni tarif ekle"
          className={cn(
            "btn-icon -mt-7 flex h-13 w-13 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-strong to-rose text-white shadow-glow-strong transition-transform",
            onNewRecipe && "animate-pop"
          )}
        >
          <PlusIcon className="h-6 w-6" />
        </Link>

        {rightItems.map((item) => renderItem(item, isActive(item)))}
      </div>
    </nav>
  );
}
