import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Giriş",
};

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h1 className="font-heading text-2xl font-bold text-plum">
          Hoş geldin! 👋
        </h1>
        <p className="mt-1 text-sm text-plum-soft">
          Tarif defterine devam et.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
