"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteNotification,
  markAllNotificationsRead,
} from "@/lib/notifications/actions";
import { TrashIcon } from "@/components/ui/icons";

// Sayfa açıldığında tüm bildirimleri "okundu" işaretler.
export function MarkNotificationsRead() {
  const router = useRouter();
  useEffect(() => {
    void markAllNotificationsRead().then(() => router.refresh());
  }, [router]);
  return null;
}

export function DeleteNotificationButton({
  notificationId,
}: {
  notificationId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const remove = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (pending) return;
    setPending(true);
    await deleteNotification(notificationId);
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={(event) => void remove(event)}
      disabled={pending}
      aria-label="Bildirimi sil"
      className="btn-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-plum-faint hover:text-terracotta"
    >
      <TrashIcon className="h-4 w-4" />
    </button>
  );
}
