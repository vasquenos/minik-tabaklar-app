"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: firstName, last_name: lastName },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Yeni kullanıcının profili otomatik oluşturulur (ismi arayüzde gösterir).
  if (data.user) {
    await supabase
      .from("profiles")
      .insert({
        user_id: data.user.id,
        first_name: firstName,
        last_name: lastName,
      })
      .select("user_id")
      .maybeSingle();
  }

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
