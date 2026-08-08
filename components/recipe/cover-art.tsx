import { cn } from "@/lib/utils";

const PALETTES = [
  "from-rose/70 via-blush/40 to-butter/60",
  "from-sage/70 via-butter/50 to-rose/40",
  "from-blush/70 via-rose/50 to-cream/40",
  "from-butter/80 via-rose/50 to-blush/60",
  "from-rose/60 via-butter/50 to-sage/60",
  "from-blush/50 via-rose/60 to-butter/50",
];

const CATEGORY_EMOJI: Record<string, string> = {
  tatlı: "🍰",
  tatli: "🍰",
  dessert: "🍰",
  pasta: "🍝",
  ana_yemek: "🍲",
  "ana yemek": "🍲",
  çorba: "🍜",
  corba: "🍜",
  salata: "🥗",
  kahvaltı: "🍳",
  kahvalti: "🍳",
  içecek: "☕",
  icecek: "☕",
  drinks: "☕",
  atıştırmalık: "🍿",
  atistirmalik: "🍿",
  ekmek: "🥖",
  kahve: "☕",
  breakfast: "🍳",
  salad: "🥗",
};

const FALLBACK_EMOJI = "🍽️";

function hashText(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function emojiFor(title: string, category?: string | null) {
  if (category) {
    const key = category.trim().toLowerCase();
    if (CATEGORY_EMOJI[key]) return CATEGORY_EMOJI[key];
  }
  const words = title.trim().toLowerCase().split(/\s+/);
  for (const word of words) {
    if (CATEGORY_EMOJI[word]) return CATEGORY_EMOJI[word];
  }
  return FALLBACK_EMOJI;
}

export function CoverArt({
  title,
  category,
  url,
  className,
  emojiClassName,
}: {
  title: string;
  category?: string | null;
  url?: string | null;
  className?: string;
  emojiClassName?: string;
}) {
  const palette = PALETTES[hashText(title) % PALETTES.length];

  if (url) {
    return (
      <div
        className={cn("overflow-hidden bg-rose", className)}
        style={{
          backgroundImage: `url(${url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
    );
  }

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-gradient-to-br",
        palette,
        className
      )}
    >
      <span
        className={cn(
          "select-none drop-shadow-[0_8px_16px_rgba(45,37,41,0.15)]",
          emojiClassName
        )}
      >
        {emojiFor(title, category)}
      </span>
    </div>
  );
}
