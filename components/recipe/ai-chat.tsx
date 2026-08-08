"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { askAi, clearConversation } from "@/lib/ai/actions";
import {
  RobotIcon,
  RestartIcon,
  SendIcon,
  SparklesIcon,
  XIcon,
} from "@/components/ui/icons";

export type AiMessage = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Porsiyonu ikiye katlayabilir miyim?",
  "Vegan yapabilir miyim?",
  "Ne ile servis edebilirim?",
  "Hazırlama süresini kısaltabilir miyim?",
];

// Son konuşma bu süreden eskiyse sohbet otomatik temizlenir (bayat sohbet).
// Süre sabiti sunucu tarafında (lib/ai/actions.ts) de kullanılır.

export function AiChat({
  recipeId,
  recipeTitle,
  initialMessages,
  inline = false,
  clearedOnLoad = false,
}: {
  recipeId: string;
  recipeTitle: string;
  initialMessages: AiMessage[];
  inline?: boolean;
  clearedOnLoad?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AiMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cleared, setCleared] = useState(clearedOnLoad);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, pending, open]);

  const clearHistory = async () => {
    await clearConversation(recipeId);
    setMessages([]);
    setError(null);
    setCleared(true);
  };

  const send = async (text?: string) => {
    const question = (text ?? input).trim();
    if (!question || pending) return;

    setPending(true);
    setError(null);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);

    const result = await askAi(recipeId, question);
    if (result.error) {
      setError(result.error);
    } else if (result.reply) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.reply! },
      ]);
    }
    setPending(false);
  };

  if (inline) {
    return (
      <section className="card flex flex-col overflow-hidden">
        <header className="flex items-center gap-3 border-b border-latte px-5 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-rose to-blush text-white shadow-glow">
            <RobotIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-heading text-sm font-bold text-plum">
              AI&apos;ya Sor 🪄
            </p>
            <p className="text-xs text-plum-soft">
              Tarifi inceleyip soruları cevaplar.
            </p>
          </div>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearHistory}
              aria-label="Sohbet geçmişini temizle"
              title="Sohbeti temizle"
              className="btn-icon flex h-9 w-9 items-center justify-center rounded-full bg-cream text-plum-soft transition-colors hover:text-rose-deep"
            >
              <RestartIcon className="h-4.5 w-4.5" />
            </button>
          )}
        </header>
        {cleared && (
          <p className="border-b border-latte bg-blush-soft px-5 py-2 text-xs font-medium text-plum-soft">
            Önceki sohbet temizlendi — yeni bir sohbet başlatıldı ✨
          </p>
        )}
        <ChatBody
          scrollRef={scrollRef}
          messages={messages}
          pending={pending}
          error={error}
          input={input}
          setInput={setInput}
          onSend={send}
          maxHeight={360}
        />
      </section>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Tarife yapay zekaya sor"
        className="btn-primary btn-icon fixed right-4 bottom-28 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-glow-strong"
      >
        <SparklesIcon className="h-6 w-6" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-plum/30 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-label="Tarif asistanı"
            onClick={(event) => event.stopPropagation()}
            className="flex h-[72vh] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] bg-card shadow-lift"
            style={{ animation: "fade-up 0.3s ease" }}
          >
            <header className="flex items-center justify-between gap-3 border-b border-latte px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-rose to-blush text-white shadow-glow">
                  <RobotIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-heading text-sm font-bold text-plum">
                    AI Aşçı Yardımcısı 🧑‍🍳
                  </p>
                  <p className="text-xs text-plum-soft">{recipeTitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Kapat"
                className="btn-icon flex h-9 w-9 items-center justify-center rounded-full bg-cream text-plum-soft"
              >
                <XIcon className="h-4.5 w-4.5" />
              </button>
            </header>

            <ChatBody
              scrollRef={scrollRef}
              messages={messages}
              pending={pending}
              error={error}
              input={input}
              setInput={setInput}
              onSend={send}
            />
          </div>
        </div>
      )}
    </>
  );
}

function ChatBody({
  scrollRef,
  messages,
  pending,
  error,
  input,
  setInput,
  onSend,
  maxHeight,
}: {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  messages: AiMessage[];
  pending: boolean;
  error: string | null;
  input: string;
  setInput: (value: string) => void;
  onSend: (text?: string) => void;
  maxHeight?: number;
}) {
  return (
    <>
      <div
        ref={scrollRef}
        className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4"
        style={maxHeight ? { maxHeight } : undefined}
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-3 pt-6 pb-2 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blush-soft text-rose-deep">
              <SparklesIcon className="h-6 w-6" />
            </span>
            <p className="max-w-[260px] text-sm text-plum-soft">
              Bu tarifle ilgili aklına takılan her şeyi sor — malzeme
              değişimi, püf noktası, servis önerisi...
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              "flex items-end gap-2",
              message.role === "user" && "flex-row-reverse"
            )}
          >
            {message.role === "assistant" && (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose to-blush text-white">
                <RobotIcon className="h-4 w-4" />
              </span>
            )}
            <p
              className={cn(
                "max-w-[80%] rounded-3xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line",
                message.role === "user"
                  ? "rounded-br-md bg-rose-strong text-white"
                  : "rounded-bl-md bg-blush-soft text-plum"
              )}
            >
              {message.content}
            </p>
          </div>
        ))}

        {pending && (
          <div className="flex items-end gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose to-blush text-white">
              <RobotIcon className="h-4 w-4" />
            </span>
            <div className="flex items-center gap-1 rounded-3xl rounded-bl-md bg-blush-soft px-4 py-3">
              <span className="h-2 w-2 animate-pulse rounded-full bg-rose-deep" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-rose-deep [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-rose-deep [animation-delay:300ms]" />
            </div>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-2xl border border-terracotta/30 bg-terracotta/10 px-4 py-3 text-xs text-terracotta"
          >
            {error}
          </p>
        )}
      </div>

      {messages.length === 0 && (
        <div className="flex gap-2 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onSend(suggestion)}
              className="chip shrink-0 px-3.5 py-2 text-xs"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <form
        className="flex items-center gap-2 border-t border-latte px-4 py-3"
        onSubmit={(event) => {
          event.preventDefault();
          onSend();
        }}
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Tarife bir soru sor..."
          aria-label="Tarif asistanına soru"
          className="input flex-1 rounded-full px-4 py-3 text-sm"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          aria-label="Gönder"
          className="btn-primary btn-icon h-11 w-11 shrink-0 rounded-full disabled:opacity-40"
        >
          <SendIcon className="h-5 w-5" />
        </button>
      </form>
    </>
  );
}
