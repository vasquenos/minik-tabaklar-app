"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "@/lib/auth/actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.error && (
        <p
          role="alert"
          className="rounded-2xl border border-terracotta/30 bg-terracotta/10 px-4 py-3 text-sm text-terracotta"
        >
          {state.error}
        </p>
      )}

      <div>
        <label htmlFor="login-email" className="label">
          E-posta
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="muffin@sevgilim.com"
          className="input px-4 py-3 text-sm"
        />
      </div>

      <div>
        <label htmlFor="login-password" className="label">
          Şifre
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="input px-4 py-3 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn-primary mt-1 w-full py-3 text-sm font-semibold"
      >
        {pending ? "Giriş yapılıyor…" : "Giriş Yap"}
      </button>

      <p className="text-center text-sm text-plum-soft">
        Hesabın yok mu?{" "}
        <Link href="/register" className="font-semibold text-rose-deep">
          Kayıt ol
        </Link>
      </p>
    </form>
  );
}
