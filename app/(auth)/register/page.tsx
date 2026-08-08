import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Kayıt",
};

export default function RegisterPage() {
  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h1 className="font-heading text-2xl font-bold text-plum">
          Hesabını oluştur 🧁
        </h1>
        <p className="mt-1 text-sm text-plum-soft">
          Kendi tarif defterini başlat.
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}
