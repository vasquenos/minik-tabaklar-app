"use client";

import { useState } from "react";
import { addComment, deleteComment } from "@/lib/comments/actions";
import { MessageIcon, SendIcon, TrashIcon } from "@/components/ui/icons";
import { ReportButton } from "@/components/social/report-button";

export type CommentView = {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  authorName: string;
  authorAvatar: string | null;
  authorInitial: string;
  isOwn: boolean;
};

function timeAgo(value: string): string {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 1000)
  );
  if (seconds < 60) return "az önce";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün önce`;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
  }).format(new Date(value));
}

export function CommentsSection({
  recipeId,
  initialComments,
  currentUser,
}: {
  recipeId: string;
  initialComments: CommentView[];
  currentUser: {
    userId: string;
    fullName: string;
    avatarUrl: string | null;
    initial: string;
  };
}) {
  const [comments, setComments] = useState<CommentView[]>(initialComments);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const content = text.trim();
    if (!content || pending) return;
    setPending(true);
    setError(null);
    const result = await addComment(recipeId, content);
    if (result && "error" in result) {
      setError(result.error);
    } else if (result && result.comment) {
      setComments((list) => [
        {
          id: result.comment.id,
          userId: currentUser.userId,
          content: result.comment.content,
          createdAt: result.comment.created_at,
          authorName: currentUser.fullName,
          authorAvatar: currentUser.avatarUrl,
          authorInitial: currentUser.initial,
          isOwn: true,
        },
        ...list,
      ]);
      setText("");
    }
    setPending(false);
  };

  const remove = async (commentId: string) => {
    const result = await deleteComment(commentId, recipeId);
    if (!result?.error) {
      setComments((list) => list.filter((comment) => comment.id !== commentId));
    }
  };

  return (
    <section className="card flex flex-col gap-4 p-5">
      <h2 className="flex items-center gap-1.5 font-heading text-base font-bold text-plum">
        <MessageIcon className="h-4.5 w-4.5 text-rose-deep" />
        Yorumlar
        <span className="rounded-full bg-blush px-2 py-0.5 text-xs font-semibold text-rose-deep">
          {comments.length}
        </span>
      </h2>

      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="Bu tarif hakkında ne düşünüyorsun? 💬"
          className="input min-w-0 flex-1 resize-none px-3 py-2.5 text-sm"
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!text.trim() || pending}
          aria-label="Yorumu gönder"
          className="btn-primary btn-icon h-auto w-11 shrink-0 items-center justify-center self-end rounded-full disabled:opacity-50"
        >
          <SendIcon className="h-4.5 w-4.5" />
        </button>
      </div>
      {error && <p className="text-xs font-medium text-terracotta">{error}</p>}

      {comments.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-2.5">
              {comment.authorAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={comment.authorAvatar}
                  alt=""
                  className="h-8 w-8 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blush text-xs font-bold text-rose-deep">
                  {comment.authorInitial}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-plum">
                    {comment.authorName}
                  </span>
                  <span className="text-[11px] text-plum-faint">
                    {timeAgo(comment.createdAt)}
                  </span>
                  <span className="ml-auto flex items-center gap-1.5">
                    {!comment.isOwn && (
                      <ReportButton
                        targetType="comment"
                        targetId={comment.id}
                        className="text-plum-faint transition-colors hover:text-terracotta"
                      />
                    )}
                    {comment.isOwn && (
                      <button
                        type="button"
                        onClick={() => void remove(comment.id)}
                        aria-label="Yorumu sil"
                        className="text-plum-faint transition-colors hover:text-terracotta"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </span>
                </div>
                <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-plum-soft">
                  {comment.content}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-plum-soft">
          Henüz yorum yok. İlk yorumu sen yap! ✨
        </p>
      )}
    </section>
  );
}
