import Link from "next/link";
import { Brand } from "@/components/ui/brand";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden px-6 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-28 -left-28 h-80 w-80 rounded-full bg-blush/60 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -bottom-16 h-80 w-80 rounded-full bg-butter/80 blur-3xl"
      />

      <div className="card relative w-full max-w-sm p-7 sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Link href="/" className="flex h-14 items-center">
            <Brand
              className="h-11 w-auto"
              wordmarkClassName="text-xl"
            />
          </Link>
          <p className="text-center text-xs text-plum-faint">
            Tariflerini kaydet, porsiyonla, adım adım pişir ✨
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}
