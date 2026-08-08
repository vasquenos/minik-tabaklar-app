"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateProfileAvatar } from "@/lib/profiles/actions";
import { PenIcon } from "@/components/ui/icons";

const MAX_SIZE = 5 * 1024 * 1024;

export function AvatarUploader({
  userId,
  avatarUrl,
  initial,
}: {
  userId: string;
  avatarUrl: string | null;
  initial: string;
}) {
  const [avatar, setAvatar] = useState(avatarUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Lütfen bir fotoğraf seç.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("Fotoğraf en fazla 5 MB olabilir.");
      return;
    }

    setBusy(true);
    setError(null);
    const supabase = createClient();
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/avatar.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, cacheControl: "3600" });

    if (uploadError) {
      setError("Fotoğraf yüklenemedi. Lütfen tekrar dene.");
      setBusy(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    await updateProfileAvatar(data.publicUrl);
    setAvatar(data.publicUrl);
    setBusy(false);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label="Profil fotoğrafını değiştir"
        className="btn-icon relative h-20 w-20 rounded-full bg-gradient-to-br from-rose to-blush text-3xl font-bold text-white shadow-glow"
      >
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt="Profil fotoğrafın"
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          initial
        )}
        <span className="absolute -right-1 -bottom-1 flex h-7 w-7 items-center justify-center rounded-full bg-card text-plum shadow-card">
          <PenIcon className="h-3.5 w-3.5 text-rose-deep" />
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          void upload(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <span className="text-xs text-plum-soft">
        {busy ? "Yükleniyor…" : "Fotoğrafı değiştir"}
      </span>
      {error && <span className="text-xs text-terracotta">{error}</span>}
    </div>
  );
}
