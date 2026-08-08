"use client";

import { useSyncExternalStore } from "react";
import { MoonIcon, SunIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

// Tema DOM sınıfıyla senkronize bir "dış kaynak" gibi okunur; böylece
// SSR/hydration farkı ya da bayat state kaynaklı ilk tıklama hataları olmaz.
const getSnapshot = () =>
  typeof document !== "undefined" &&
  document.documentElement.classList.contains("dark");

const subscribe = (callback: () => void) => {
  window.addEventListener("themechange", callback);
  return () => window.removeEventListener("themechange", callback);
};

export function ThemeToggle({ className }: { className?: string }) {
  const dark = useSyncExternalStore(subscribe, getSnapshot, () => false);

  const toggle = () => {
    const next = !getSnapshot();
    const root = document.documentElement;
    root.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // localStorage yoksa sessizce geç.
    }
    window.dispatchEvent(new Event("themechange"));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Aydınlık temaya geç" : "Karanlık temaya geç"}
      className={cn(
        "btn-icon flex h-9 w-9 items-center justify-center rounded-full text-plum-soft transition-colors hover:text-rose-deep",
        className
      )}
    >
      {dark ? (
        <SunIcon className="h-5 w-5" />
      ) : (
        <MoonIcon className="h-5 w-5" />
      )}
    </button>
  );
}
