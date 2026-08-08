"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type AuthState =
  | { error?: string; ok?: boolean; message?: string }
  | undefined;

function parseCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  return { email, password };
}

export async function signIn(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const { email, password } = parseCredentials(formData);

  if (!email || !password) {
    return { error: "E-posta ve şifre zorunludur." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/recipes");
}

export async function signUp(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();

  if (!email || !password) {
    return { error: "E-posta ve şifre zorunludur." };
  }
  if (password.length < 6) {
    return { error: "Şifre en az 6 karakter olmalıdır." };
  }
  if (!firstName || !lastName) {
    return { error: "Ad ve soyad zorunludur." };
  }
  if (firstName.length > 60 || lastName.length > 60) {
    return { error: "Ad ve soyad en fazla 60 karakter olmalıdır." };
  }

  const supabase = await createClient();
  const headerStore = await headers();
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";
  const origin = `${proto}://${host}`;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: firstName, last_name: lastName },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Profil satırı DB'deki trigger ile oluşturulur (auth.users insert).
  // E-posta onayı açıkken oturum henüz yok; RLS burada insert'e izin vermez.

  if (data.session) {
    // Yerelde e-posta onayı kapalı; oturum hemen açılır.
    revalidatePath("/", "layout");
    redirect("/recipes");
  }

  return {
    ok: true,
    message:
      "Hesap oluşturuldu. E-posta onay linki gönderildi; onayladıktan sonra giriş yapabilirsin.",
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
