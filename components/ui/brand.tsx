import { cn } from "@/lib/utils";

// Marka bileşeni: üst solda ve giriş ekranlarında "Minik Tabaklar" yazısını gösterir.
export function Brand({ wordmarkClassName }: { wordmarkClassName?: string }) {
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
