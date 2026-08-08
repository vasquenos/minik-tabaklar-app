"use client";

import { useState } from "react";
import { createReport, type ReportTargetType } from "@/lib/reports/actions";
import { FlagIcon, XIcon, CheckCircleIcon } from "@/components/ui/icons";

export function ReportButton({
  targetType,
  targetId,
  className,
  label,
}: {
  targetType: ReportTargetType;
  targetId: string;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!reason.trim() || pending) return;
    setPending(true);
    setError(null);
    const result = await createReport(targetType, targetId, reason);
    if (result?.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    setSent(true);
    setPending(false);
  };

  const close = () => {
    setOpen(false);
    setSent(false);
    setReason("");
    setError(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
        aria-label="Şikayet et"
      >
        {label ? (
          <span className="inline-flex items-center gap-1.5">
            <FlagIcon className="h-4 w-4" />
            {label}
          </span>
        ) : (
          <FlagIcon className="h-4.5 w-4.5" />
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Şikayet et"
            className="max-w-md w-full rounded-t-[28px] bg-card p-5 pb-8 shadow-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-latte" />
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-lg font-bold text-plum">
                Şikayet et
              </h3>
              <button
                type="button"
                onClick={close}
                aria-label="Kapat"
                className="btn-icon flex h-8 w-8 items-center justify-center rounded-full"
              >
                <XIcon className="h-4.5 w-4.5" />
              </button>
            </div>

            {sent ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <CheckCircleIcon className="h-10 w-10 text-sage-deep" />
                <p className="text-sm text-plum-soft">
                  Şikayetin iletildi. Ekibimiz inceleyecek. 🙏
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="btn-primary px-5 py-2.5 text-sm font-semibold"
                >
                  Tamam
                </button>
              </div>
            ) : (
              <>
                <p className="mt-1 text-xs text-plum-soft">
                  Uygunsuz içerik, hakaret veya yanlış bilgi mi var? Nedenini
                  kısaca yaz, admin ekibi değerlendirsin.
                </p>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="Şikayet nedeni…"
                  className="input mt-4 w-full resize-none px-3 py-3 text-sm"
                />
                {error && (
                  <p className="mt-2 text-xs font-medium text-terracotta">
                    {error}
                  </p>
                )}
                <button
                  type="button"
                  disabled={!reason.trim() || pending}
                  onClick={() => void submit()}
                  className="btn-primary mt-4 w-full py-3 text-sm font-semibold disabled:opacity-50"
                >
                  {pending ? "Gönderiliyor…" : "Şikayeti Gönder"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
