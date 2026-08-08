"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  acceptFriendRequestFrom,
  sendFriendRequest,
  type FriendshipStatus,
} from "@/lib/friends/actions";
import { CheckIcon, UserPlusIcon } from "@/components/ui/icons";

export function FriendAddButton({
  userId,
  initial,
  size = "md",
}: {
  userId: string;
  initial: FriendshipStatus;
  size?: "sm" | "md";
}) {
  const [status, setStatus] = useState<FriendshipStatus>(initial);
  const [pending, setPending] = useState(false);

  const onClick = async () => {
    if (pending) return;
    setPending(true);
    if (status === "none") {
      const result = await sendFriendRequest(userId);
      if (!result?.error) {
        setStatus("pending_outgoing");
      }
    } else if (status === "pending_incoming") {
      const result = await acceptFriendRequestFrom(userId);
      if (!result?.error) {
        setStatus("friends");
      }
    }
    setPending(false);
  };

  const config: Record<
    FriendshipStatus,
    { label: string; className: string; icon?: React.ReactNode }
  > = {
    none: {
      label: pending ? "Gönderiliyor…" : "Arkadaş Ekle",
      className: "btn-primary",
      icon: <UserPlusIcon className="h-4 w-4" />,
    },
    pending_outgoing: {
      label: "İstek Gönderildi",
      className:
        "btn-secondary opacity-70",
    },
    pending_incoming: {
      label: pending ? "Kabul Ediliyor…" : "Kabul Et",
      className: "btn-primary",
      icon: <UserPlusIcon className="h-4 w-4" />,
    },
    friends: {
      label: "Arkadaş",
      className: "btn-secondary text-sage-deep opacity-80",
      icon: <CheckIcon className="h-4 w-4" />,
    },
  };

  const state = config[status];
  const disabled = status === "pending_outgoing" || status === "friends" || pending;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => void onClick()}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full px-4 font-semibold",
        size === "md" ? "py-2.5 text-sm" : "px-3 py-1.5 text-xs",
        state.className,
        disabled && "cursor-default"
      )}
    >
      {state.icon}
      {state.label}
    </button>
  );
}
