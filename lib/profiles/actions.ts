"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ProfileFormState = { error?: string } | undefined;

export async function updateProfileName(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();

  if (!firstName || !lastName) {
    return { error: "Ad ve soyad zorunludur." };
  }
  if (firstName.length > 60 || lastName.length > 60) {
    return { error: "Ad ve soyad en fazla 60 karakter olmalıdır." };
  }

  const { error } = await supabase
    .from("profiles")
    .upsert(
      { user_id: user.id, first_name: firstName, last_name: lastName },
      { onConflict: "user_id" }
    );

  if (error) {
    return { error: "Profil güncellenemedi. Lütfen tekrar dene." };
  }

  revalidatePath("/profile");
  return undefined;
}

export async function updateProfileAvatar(
  avatarUrl: string | null
): Promise<ProfileFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("profiles")
    .upsert(
      { user_id: user.id, avatar_url: avatarUrl },
      { onConflict: "user_id" }
    );

  if (error) {
    return { error: "Profil fotoğrafı güncellenemedi." };
  }

  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return undefined;
}

export type MessagePolicy = "everyone" | "friends";

export async function updateMessagePolicy(
  policy: MessagePolicy
): Promise<ProfileFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }
  if (policy !== "everyone" && policy !== "friends") {
    return { error: "Geçersiz politika." };
  }

  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: user.id, message_policy: policy }, { onConflict: "user_id" });

  if (error) {
    return { error: "Mesaj izni güncellenemedi." };
  }

  revalidatePath("/profile");
  return undefined;
}
