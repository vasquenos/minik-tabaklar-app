"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CameraIcon, PenIcon, XIcon } from "@/components/ui/icons";

const MAX_SIZE = 5 * 1024 * 1024;

export function CoverImageUploader({
  userId,
  initialUrl,
}: {
  userId: string;
  initialUrl: string | null;
}) {
  const [url, setUrl] = useState<string | null>(initialUrl);
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
    const path = `${userId}/cover.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("recipe-covers")
      .upload(path, file, { upsert: true, cacheControl: "3600" });

    if (uploadError) {
      setError("Fotoğraf yüklenemedi. Lütfen tekrar dene.");
      setBusy(false);
      return;
    }

    const { data } = supabase.storage.from("recipe-covers").getPublicUrl(path);
    setUrl(data.publicUrl);
    setBusy(false);
  };

  const clear = () => {
    setUrl(null);
    setError(null);
  };

  return (
    <div>
      <input type="hidden" name="coverImageUrl" value={url ?? ""} />
      <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-plum/20">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt="Tarif kapağı"
            className="aspect-[16/10] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 bg-blush-soft text-plum-soft">
            <CameraIcon className="h-8 w-8 text-rose-deep/60" />
            <span className="text-sm font-medium">
              Kapak fotoğrafı ekle
            </span>
          </div>
        )}

        <div className="absolute right-3 bottom-3 flex gap-2">
          {url && (
            <button
              type="button"
              onClick={clear}
              aria-label="Kapak fotoğrafını kaldır"
              className="glass btn-icon flex h-10 w-10 items-center justify-center rounded-full text-plum shadow-card"
            >
              <XIcon className="h-5 w-5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            aria-label="Kapak fotoğrafı yükle"
            className="glass btn-icon flex h-10 w-10 items-center justify-center rounded-full text-plum shadow-card hover:text-rose-deep"
          >
            <PenIcon className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
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
      {busy && <p className="mt-1.5 text-xs font-medium text-plum-soft">Yükleniyor…</p>}
      {error && <p className="mt-1.5 text-xs font-medium text-terracotta">{error}</p>}
    </div>
  );
}
