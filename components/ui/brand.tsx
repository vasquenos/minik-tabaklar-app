"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// Marka bileşeni: kullanıcı kendi logosunu public/logo.png olarak koyduğunda
// onu gösterir; logo yoksa "Minik Tabaklar" yazısına düşer.
export function Brand({
  className,
  wordmarkClassName,
}: {
  className?: string;
  wordmarkClassName?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className={cn(
          "font-heading text-lg font-bold tracking-tight text-plum",
          wordmarkClassName
        )}
      >
        Minik Tabaklar
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="Minik Tabaklar"
      width={144}
      height={40}
      onError={() => setFailed(true)}
      className={cn("h-9 w-auto object-contain", className)}
    />
  );
}
