"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ReportTargetType = "recipe" | "comment" | "message" | "user";

type ReportState = { error?: string } | undefined;

export async function createReport(
  targetType: ReportTargetType,
  targetId: string,
  reason: string
): Promise<ReportState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const text = reason.trim();
  if (!text) {
    return { error: "Şikayet nedeni boş olamaz." };
  }
  if (text.length > 1000) {
    return { error: "Şikayet en fazla 1000 karakter olabilir." };
  }
  if (!targetId) {
    return { error: "Şikayet hedefi eksik." };
  }
  if (!["recipe", "comment", "message", "user"].includes(targetType)) {
    return { error: "Geçersiz şikayet türü." };
  }

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: targetType,
    target_id: targetId,
    reason: text,
  });

  if (error) {
    return { error: "Şikayet gönderilemedi. Lütfen tekrar dene." };
  }

  revalidatePath("/admin");
  return undefined;
}
