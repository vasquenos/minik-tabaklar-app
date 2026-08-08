"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp } from "@/lib/auth/actions";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(signUp, undefined);

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

      {state?.ok && (
        <p
          role="status"
          className="rounded-2xl border border-sage/60 bg-sage/30 px-4 py-3 text-sm text-sage-deep"
        >
          {state.message}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="register-firstname" className="label">
            Ad <span className="text-rose-deep">*</span>
          </label>
          <input
            id="register-firstname"
            name="firstName"
            required
            autoComplete="given-name"
            placeholder="Elif"
            className="input px-4 py-3 text-sm"
          />
        </div>
        <div>
          <label htmlFor="register-lastname" className="label">
            Soyad <span className="text-rose-deep">*</span>
          </label>
          <input
            id="register-lastname"
            name="lastName"
            required
            autoComplete="family-name"
            placeholder="Yılmaz"
            className="input px-4 py-3 text-sm"
          />
        </div>
      </div>

      <div>
        <label htmlFor="register-email" className="label">
          E-posta
        </label>
        <input
          id="register-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="muffin@sevgilim.com"
          className="input px-4 py-3 text-sm"
        />
      </div>

      <div>
        <label htmlFor="register-password" className="label">
          Şifre
        </label>
        <input
          id="register-password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="En az 6 karakter"
          className="input px-4 py-3 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn-primary mt-1 w-full py-3 text-sm font-semibold"
      >
        {pending ? "Kayıt oluşturuluyor…" : "Kayıt Ol"}
      </button>

      <p className="text-center text-sm text-plum-soft">
        Zaten hesabın var mı?{" "}
        <Link href="/login" className="font-semibold text-rose-deep">
          Giriş yap
        </Link>
      </p>
    </form>
  );
}
