"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  updateMessagePolicy,
  type MessagePolicy,
} from "@/lib/profiles/actions";

export function MessagePolicyForm({
  initial,
}: {
  initial: MessagePolicy;
}) {
  const [policy, setPolicy] = useState<MessagePolicy>(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options: {
    value: MessagePolicy;
    label: string;
    description: string;
  }[] = [
    {
      value: "friends",
      label: "Sadece arkadaşlar",
      description: "Yalnızca arkadaşların sana mesaj gönderebilir.",
    },
    {
      value: "everyone",
      label: "Herkes",
      description: "Minik Tabaklar'daki herkes sana mesaj gönderebilir.",
    },
  ];

  const select = async (value: MessagePolicy) => {
    if (value === policy || pending) return;
    setPending(true);
    setError(null);
    const result = await updateMessagePolicy(value);
    if (result?.error) {
      setError(result.error);
    } else {
      setPolicy(value);
    }
    setPending(false);
  };

  return (
    <div className="flex flex-col gap-2.5">
      {options.map((option) => {
        const selected = policy === option.value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={pending}
            onClick={() => void select(option.value)}
            aria-pressed={selected}
            className={cn(
              "flex items-start gap-3 rounded-2xl border p-3 text-left transition-colors",
              selected
                ? "border-rose/50 bg-rose/10"
                : "border-plum/10 bg-card hover:border-rose/30"
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border-2",
                selected ? "border-rose-deep" : "border-plum/25"
              )}
            >
              {selected && (
                <span className="h-2.5 w-2.5 rounded-full bg-rose-deep" />
              )}
            </span>
            <span>
              <span className="block text-sm font-semibold text-plum">
                {option.label}
              </span>
              <span className="block text-xs text-plum-soft">
                {option.description}
              </span>
            </span>
          </button>
        );
      })}
      {pending && (
        <p className="text-xs font-medium text-plum-soft">Kaydediliyor…</p>
      )}
      {error && <p className="text-xs font-medium text-terracotta">{error}</p>}
    </div>
  );
}
