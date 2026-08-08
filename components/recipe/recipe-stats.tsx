import { cn } from "@/lib/utils";
import {
  ClockIcon,
  FlameIcon,
  TimerIcon,
  UsersIcon,
} from "@/components/ui/icons";

type Stats = {
  servings: number | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  difficulty: string | null;
};

const DIFFICULTY_VIEW: Record<string, { label: string; className: string }> = {
  easy: { label: "Kolay ✨", className: "bg-sage/60 text-sage-deep" },
  medium: { label: "Orta 🌿", className: "bg-butter/70 text-butter-deep" },
  hard: { label: "Zor 💪", className: "bg-terracotta/20 text-terracotta" },
};

export function RecipeStats({ stats }: { stats: Stats }) {
  const difficulty = stats.difficulty
    ? DIFFICULTY_VIEW[stats.difficulty]
    : null;

  const items: {
    key: string;
    label: string;
    value: string;
    icon: React.ReactNode;
    className: string;
  }[] = [];

  if (stats.servings !== null) {
    items.push({
      key: "servings",
      label: "Porsiyon",
      value: `${stats.servings} kişilik`,
      icon: <UsersIcon className="h-5 w-5" />,
      className: "bg-rose/40 text-rose-deep",
    });
  }
  if (stats.prepTimeMinutes !== null) {
    items.push({
      key: "prep",
      label: "Hazırlık",
      value: `${stats.prepTimeMinutes} dk`,
      icon: <ClockIcon className="h-5 w-5" />,
      className: "bg-butter/70 text-butter-deep",
    });
  }
  if (stats.cookTimeMinutes !== null) {
    items.push({
      key: "cook",
      label: "Pişirme",
      value: `${stats.cookTimeMinutes} dk`,
      icon: <FlameIcon className="h-5 w-5" />,
      className: "bg-terracotta/15 text-terracotta",
    });
  }
  if (difficulty) {
    items.push({
      key: "difficulty",
      label: "Zorluk",
      value: difficulty.label,
      icon: <TimerIcon className="h-5 w-5" />,
      className: difficulty.className,
    });
  }

  return (
    <div className="grid grid-cols-4 gap-2.5">
      {items.map((item) => (
        <div
          key={item.key}
          className="card flex flex-col items-center gap-1.5 p-3 text-center"
        >
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full",
              item.className
            )}
          >
            {item.icon}
          </span>
          <span className="text-xs font-bold text-plum">{item.value}</span>
          <span className="text-[10px] font-medium text-plum-faint">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
