import { createClient } from "@/lib/supabase/server";

export type UserProfile = {
  userId: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  fullName: string;
  initial: string;
  message_policy: "everyone" | "friends";
};

export type ProfileRow = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  message_policy: string;
};

type ProfileRowShape = Pick<
  ProfileRow,
  "first_name" | "last_name" | "avatar_url"
> &
  Partial<Pick<ProfileRow, "message_policy">>;

// Tek bir profil satırını görüntülenebilir profile çevirir.
// N+1 sorgularını önlemek için toplu çekilen satırlarda da kullanılır.
export function formatProfile(
  row: ProfileRowShape | null | undefined,
  userId: string
): UserProfile {
  const first = row?.first_name?.trim() || null;
  const last = row?.last_name?.trim() || null;
  const fullName = [first, last].filter(Boolean).join(" ") || "Şef";
  const initial = (first ?? fullName).charAt(0).toLocaleUpperCase("tr");

  return {
    userId,
    first_name: first,
    last_name: last,
    avatar_url: row?.avatar_url ?? null,
    fullName,
    initial,
    message_policy: row?.message_policy === "everyone" ? "everyone" : "friends",
  };
}

// Sunucu bileşenleri için kullanıcının görünen profilini getirir.
// E-posta ASLA döndürülmez — profiller yalnızca isim + avatar taşır.
export async function getUserProfile(
  userId: string
): Promise<UserProfile> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("first_name, last_name, avatar_url, message_policy")
    .eq("user_id", userId)
    .maybeSingle();

  return formatProfile(data, userId);
}
