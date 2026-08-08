import Link from "next/link";
import { Brand } from "@/components/ui/brand";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  ClockIcon,
  HeartIcon,
  MessageIcon,
  UsersIcon,
} from "@/components/ui/icons";

const features = [
  {
    icon: UsersIcon,
    title: "Arkadaşlarınla paylaş",
    text: "Tariflerini arkadaşlarına gönder, onların tariflerini keşfet.",
  },
  {
    icon: ClockIcon,
    title: "Porsiyonla & zamanla",
    text: "Kişi sayısına göre malzemeler ayarlansın, adımlarda geri sayım başlasın.",
  },
  {
    icon: MessageIcon,
    title: "Sohbet et",
    text: "Arkadaşlarınla mesajlaş, beğendiğin tarifi tek dokunuşla yolla.",
  },
  {
    icon: HeartIcon,
    title: "Favorilerinle",
    text: "En sevdiklerini kalp ile topla, hep elinin altında olsun.",
  },
];

export default function Home() {
  return (
    <div className="relative mx-auto flex min-h-full w-full max-w-md flex-col items-center justify-center overflow-hidden px-6 py-14">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-blush/60 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-butter/80 blur-3xl"
      />

      <div className="relative flex flex-col items-center gap-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-rose to-blush shadow-glow animate-float text-3xl">
            🍽️
          </span>
          <Brand className="h-10 w-auto" wordmarkClassName="text-2xl" />
        </div>

        <div className="flex flex-col gap-3">
          <h1 className="font-heading text-[32px] leading-tight font-bold tracking-tight text-plum">
            Tariflerin, en
            <br />
            tatlı haliyle. 🍰
          </h1>
          <p className="mx-auto max-w-xs text-sm leading-relaxed text-plum-soft">
            Tariflerini kaydet, porsiyonla, adım adım pişir. Sevdiğin tarifleri
            arkadaşlarınla paylaş, keşfet.
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="card flex items-center gap-3 px-4 py-3 text-left"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blush-soft text-rose-deep">
                <feature.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-plum">{feature.title}</p>
                <p className="text-xs text-plum-soft">{feature.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex w-full flex-col gap-2.5">
          <Link
            href="/register"
            className="btn-primary inline-flex items-center justify-center py-3.5 text-sm font-semibold"
          >
            Ücretsiz başla ✨
          </Link>
          <Link
            href="/login"
            className="btn-secondary inline-flex items-center justify-center py-3.5 text-sm font-semibold"
          >
            Giriş Yap
          </Link>
        </div>
      </div>
    </div>
  );
}
