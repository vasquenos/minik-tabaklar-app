"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { HeartIcon } from "@/components/ui/icons";
import { toggleFavorite } from "@/lib/favorites/actions";

const SPARKS = [
  { left: "20%", delay: "0ms" },
  { left: "40%", delay: "60ms" },
  { left: "60%", delay: "20ms" },
  { left: "78%", delay: "80ms" },
];

export function FavoriteButton({
  recipeId,
  initial,
  className,
  size = "md",
}: {
  recipeId: string;
  initial?: boolean;
  className?: string;
  size?: "sm" | "md";
}) {
  const [active, setActive] = useState(Boolean(initial));
  const [burst, setBurst] = useState(0);
  const [pending, setPending] = useState(false);

  const onClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    // Buton tarif kartındaki Link'in içinde; tıklama navigasyona dönmesin.
    event.preventDefault();
    event.stopPropagation();
    if (pending) return;
    setPending(true);
    // İyimser güncelleme
    setActive((value) => !value);
    setBurst((value) => value + 1);
    void toggleFavorite(recipeId)
      .then((result) => {
        setActive(result.favorited);
      })
      .catch(() => {
        // Hata durumunda eski haline dön
        setActive((value) => !value);
      })
      .finally(() => {
        setPending(false);
      });
  };

  const showBurst = burst > 0;

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        aria-label={active ? "Favorilerden çıkar" : "Favorilere ekle"}
        aria-pressed={active}
        onClick={onClick}
        className={cn(
          "glass btn-icon rounded-full text-plum shadow-card hover:text-rose-deep",
          size === "md" ? "h-10 w-10" : "h-9 w-9"
        )}
      >
        <HeartIcon
          filled={active}
          className={cn(
            "transition-colors",
            size === "md" ? "h-5 w-5" : "h-4.5 w-4.5",
            active && "text-rose-deep animate-pop"
          )}
        />
      </button>

      {showBurst &&
        SPARKS.map((spark, index) => (
          <span
            key={`${burst}-${index}`}
            className="pointer-events-none absolute top-1/2 left-1/2 h-1.5 w-1.5 animate-heart-burst rounded-full bg-rose-deep"
            style={{
              animationDelay: spark.delay,
              left: `calc(50% + ${spark.left})`,
              marginTop: "-3px",
            }}
          />
        ))}
    </div>
  );
}
