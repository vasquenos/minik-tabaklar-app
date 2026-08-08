"use client";

import { useState } from "react";
import { blockUser, unblockUser } from "@/lib/blocks/actions";
import { BanIcon, CheckCircleIcon, XIcon } from "@/components/ui/icons";

export function BlockButton({
  userId,
  initialBlocked,
  onBlockedChange,
  variant = "soft",
}: {
  userId: string;
  initialBlocked: boolean;
  onBlockedChange?: (blocked: boolean) => void;
  variant?: "soft" | "plain";
}) {
  const [blocked, setBlocked] = useState(initialBlocked);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doBlock = async () => {
    setPending(true);
    setError(null);
    const result = await blockUser(userId);
    if (result?.error) {
      setError(result.error);
    } else {
      setBlocked(true);
      setConfirming(false);
      onBlockedChange?.(true);
    }
    setPending(false);
  };

  const doUnblock = async () => {
    setPending(true);
    setError(null);
    const result = await unblockUser(userId);
    if (result?.error) {
      setError(result.error);
    } else {
      setBlocked(false);
      onBlockedChange?.(false);
    }
    setPending(false);
  };

  if (variant === "plain") {
    return (
      <div className="flex flex-col items-end gap-1.5">
        {blocked ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => void doUnblock()}
            aria-label="Engeli kaldır"
            className="btn-icon flex h-9 w-9 items-center justify-center rounded-full text-plum-soft hover:text-plum"
          >
            <CheckCircleIcon className="h-4.5 w-4.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label="Kullanıcıyı engelle"
            className="btn-icon flex h-9 w-9 items-center justify-center rounded-full text-plum-soft hover:text-terracotta"
          >
            <BanIcon className="h-4.5 w-4.5" />
          </button>
        )}

        {confirming && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm"
            onClick={() => setConfirming(false)}
          >
            <div
              role="alertdialog"
              aria-modal="true"
              aria-label="Kullanıcıyı engelle"
              className="w-full max-w-sm rounded-[28px] bg-card p-5 shadow-card"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between">
                <h3 className="font-heading text-lg font-bold text-plum">
                  Kullanıcıyı engelle?
                </h3>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  aria-label="Kapat"
                  className="btn-icon flex h-8 w-8 items-center justify-center rounded-full"
                >
                  <XIcon className="h-4.5 w-4.5" />
                </button>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-plum-soft">
                Engellediğinde bu kişi sana mesaj gönderemez ve aranızdaki
                arkadaşlık sona erer.
              </p>
              {error && (
                <p className="mt-2 text-xs font-medium text-terracotta">
                  {error}
                </p>
              )}
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="btn-secondary flex-1 py-2.5 text-sm font-semibold"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void doBlock()}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-terracotta py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <BanIcon className="h-4 w-4" />
                  {pending ? "Engelleniyor…" : "Engelle"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      {blocked ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => void doUnblock()}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-plum-soft hover:text-plum"
        >
          <CheckCircleIcon className="h-4 w-4" />
          {pending ? "Kaldırılıyor…" : "Engeli Kaldır"}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-terracotta hover:bg-terracotta/10"
        >
          <BanIcon className="h-4 w-4" />
          Engelle
        </button>
      )}

      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm"
          onClick={() => setConfirming(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label="Kullanıcıyı engelle"
            className="w-full max-w-sm rounded-[28px] bg-card p-5 shadow-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h3 className="font-heading text-lg font-bold text-plum">
                Kullanıcıyı engelle?
              </h3>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                aria-label="Kapat"
                className="btn-icon flex h-8 w-8 items-center justify-center rounded-full"
              >
                <XIcon className="h-4.5 w-4.5" />
              </button>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-plum-soft">
              Engellediğinde bu kişi sana mesaj gönderemez ve aranızdaki
              arkadaşlık sona erer.
            </p>
            {error && (
              <p className="mt-2 text-xs font-medium text-terracotta">{error}</p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="btn-secondary flex-1 py-2.5 text-sm font-semibold"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => void doBlock()}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-terracotta py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                <BanIcon className="h-4 w-4" />
                {pending ? "Engelleniyor…" : "Engelle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
