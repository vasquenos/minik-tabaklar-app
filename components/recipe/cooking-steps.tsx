"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  BellIcon,
  PauseIcon,
  PlayIcon,
  RestartIcon,
  TimerIcon,
  XIcon,
} from "@/components/ui/icons";

export type StepItem = {
  step_number: number;
  instruction: string;
};

type Duration = { minutes: number; snippet: string };

const STEP_COLORS = [
  "bg-rose/60 text-plum",
  "bg-butter text-plum",
  "bg-sage text-plum",
  "bg-blush text-plum",
];

function parseDuration(text: string): Duration | null {
  const hours = /(\d{1,2})\s*(?:saat|sa)\b/gi;
  const minutes = /(\d{1,3}(?:[.,]\d+)?)\s*(?:dk|dakika|dakika boyunca|dakikadır|dakika kadar)\b/gi;
  const half = /\byarım saat\b/i;

  const hourMatch = hours.exec(text);
  if (hourMatch) {
    return {
      minutes: Number(hourMatch[1]) * 60,
      snippet: hourMatch[0],
    };
  }
  const minuteMatch = minutes.exec(text);
  if (minuteMatch) {
    return {
      minutes: Math.max(1, Math.round(Number(minuteMatch[1]))),
      snippet: minuteMatch[0],
    };
  }
  if (half.test(text)) {
    return { minutes: 30, snippet: "yarım saat" };
  }
  return null;
}

function chime() {
  try {
    const Ctx = window.AudioContext;
    const context = new Ctx();
    const playTone = (start: number, frequency: number, duration = 0.7) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, context.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(
        0.3,
        context.currentTime + start + 0.05
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        context.currentTime + start + duration
      );
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(context.currentTime + start);
      oscillator.stop(context.currentTime + start + duration + 0.1);
    };
    playTone(0, 659.25);
    playTone(0.22, 880);
    playTone(0.44, 1046.5, 1);
  } catch {
    // Ses yoksa sessizce geç.
  }
}

function mmss(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function CookingSteps({ steps }: { steps: StepItem[] }) {
  const [timer, setTimer] = useState<{
    label: string;
    total: number;
    remaining: number;
    running: boolean;
  } | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!timer?.running) return;
    intervalRef.current = setInterval(() => {
      setTimer((current) => {
        if (!current) return current;
        const remaining = current.remaining - 1;
        if (remaining <= 0) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          chime();
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          return { ...current, remaining: 0, running: false };
        }
        return { ...current, remaining };
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timer?.running, timer?.total]);

  const startTimer = (stepNumber: number, duration: Duration) => {
    setTimer({
      label: `Adım ${stepNumber} — ${duration.snippet}`,
      total: duration.minutes * 60,
      remaining: duration.minutes * 60,
      running: true,
    });
  };

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-heading text-lg font-bold text-plum">
        Pişirme zamanı 🧑‍🍳
      </h2>

      <ol className="flex flex-col gap-3">
        {steps.map((step, index) => {
          const duration = parseDuration(step.instruction);
          const color = STEP_COLORS[index % STEP_COLORS.length];
          return (
            <li
              key={step.step_number}
              className="card flex gap-3 p-4"
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-heading text-sm font-bold",
                  color
                )}
              >
                {step.step_number}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-relaxed text-plum">
                  {step.instruction}
                </p>
                {duration && (
                  <button
                    type="button"
                    onClick={() => startTimer(step.step_number, duration)}
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-terracotta/15 px-3 py-1.5 text-xs font-semibold text-terracotta transition-transform active:scale-95"
                  >
                    <TimerIcon className="h-4 w-4" />
                    {duration.snippet} zamanlayıcısı
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {timer && (
        <div className="glass fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
          <div
            className="flex w-full max-w-md items-center gap-4 rounded-3xl border border-white/70 bg-gradient-to-br from-blush-soft to-butter/60 px-5 py-4 shadow-lift"
            style={{ animation: "fade-up 0.3s ease" }}
          >
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-plum-soft">
                <BellIcon className="h-3.5 w-3.5 text-rose-deep" />
                {timer.label}
              </p>
              <p
                className={cn(
                  "font-heading text-3xl font-bold tabular-nums",
                  timer.remaining === 0 ? "text-rose-deep" : "text-plum"
                )}
              >
                {mmss(timer.remaining)}
              </p>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/70">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose to-rose-deep transition-all duration-1000 ease-linear"
                  style={{
                    width: `${(timer.remaining / timer.total) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                aria-label="Zamanlayıcıyı sıfırla"
                onClick={() =>
                  setTimer((current) =>
                    current
                      ? {
                          ...current,
                          remaining: current.total,
                          running: false,
                        }
                      : current
                  )
                }
                className="btn-icon h-9 w-9 rounded-full bg-card text-plum-soft shadow-card"
              >
                <RestartIcon className="h-4.5 w-4.5" />
              </button>
              <button
                type="button"
                aria-label={timer.running ? "Duraklat" : "Devam et"}
                onClick={() =>
                  setTimer((current) =>
                    current ? { ...current, running: !current.running } : current
                  )
                }
                className="btn-icon h-11 w-11 rounded-full bg-rose-strong text-white shadow-glow-strong"
              >
                {timer.running ? (
                  <PauseIcon className="h-5 w-5" />
                ) : (
                  <PlayIcon className="h-5 w-5" />
                )}
              </button>
              <button
                type="button"
                aria-label="Zamanlayıcıyı kapat"
                onClick={() => setTimer(null)}
                className="btn-icon h-9 w-9 rounded-full bg-card text-plum-soft shadow-card"
              >
                <XIcon className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
