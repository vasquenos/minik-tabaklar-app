"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  searchUsers,
  sendFriendRequest,
  respondToRequest,
  removeFriend,
  type FriendSearchResult,
} from "@/lib/friends/actions";
import type {
  FriendItem,
  FriendRequestItem,
} from "@/app/(dashboard)/friends/page";
import {
  CheckCircleIcon,
  FriendsIcon,
  MessageIcon,
  SearchIcon,
  UserPlusIcon,
} from "@/components/ui/icons";

function Avatar({ row }: { row: { initial: string; avatarUrl: string | null } }) {
  return row.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={row.avatarUrl}
      alt=""
      className="h-10 w-10 shrink-0 rounded-full object-cover"
    />
  ) : (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose to-blush text-sm font-bold text-white">
      {row.initial}
    </span>
  );
}

export function FriendsClient({
  incoming,
  outgoing,
  friends,
}: {
  incoming: FriendRequestItem[];
  outgoing: FriendRequestItem[];
  friends: FriendItem[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FriendSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const search = async (needle: string) => {
    setQuery(needle);
    if (needle.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      setResults(await searchUsers(needle));
    } catch {
      setSearchError("Arama yapılamadı. Lütfen tekrar dene.");
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const add = async (userId: string) => {
    const error = await sendFriendRequest(userId);
    if (error?.error) {
      setSearchError(error.error);
    } else {
      setAddedIds((prev) => new Set(prev).add(userId));
    }
    router.refresh();
  };

  const respond = async (friendshipId: string, accept: boolean) => {
    await respondToRequest(friendshipId, accept);
    router.refresh();
  };

  const unfriend = async (friendshipId: string) => {
    await removeFriend(friendshipId);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <p className="eyebrow">Sosyal ağın</p>
        <h1 className="font-heading text-[26px] leading-tight font-bold tracking-tight text-plum">
          Arkadaşlar 👯
        </h1>
        <p className="text-sm text-plum-soft">
          Arkadaş bul, tariflerini paylaş, sohbet et.
        </p>
      </header>

      <section className="card flex flex-col gap-3 p-5">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 h-4.5 w-4.5 -translate-y-1/2 text-plum-faint" />
          <input
            type="search"
            value={query}
            onChange={(event) => void search(event.target.value)}
            placeholder="Ad veya soyad ara…"
            className="input rounded-full py-3 pr-4 pl-11 text-sm"
          />
        </div>
        {searchError && (
          <p className="text-xs font-medium text-terracotta">{searchError}</p>
        )}
        {searching && (
          <p className="px-1 text-xs text-plum-faint">Aranıyor…</p>
        )}
        {results.length > 0 && (
          <ul className="flex flex-col divide-y divide-latte">
            {results.map((result) => {
              const added = addedIds.has(result.user_id);
              return (
                <li key={result.user_id} className="flex items-center gap-3 py-2.5">
                  <Avatar
                    row={{
                      initial: result.initial,
                      avatarUrl: result.avatar_url,
                    }}
                  />
                  <span className="flex-1 truncate text-sm font-semibold text-plum">
                    {result.fullName}
                  </span>
                  <button
                    type="button"
                    disabled={added}
                    onClick={() => void add(result.user_id)}
                    className="btn-primary flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold disabled:opacity-60"
                  >
                    {added ? (
                      <>
                        <CheckCircleIcon className="h-3.5 w-3.5" />
                        İstek gönderildi
                      </>
                    ) : (
                      <>
                        <UserPlusIcon className="h-3.5 w-3.5" />
                        Ekle
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {incoming.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="eyebrow">Gelen istekler</h2>
          <ul className="flex flex-col gap-2.5">
            {incoming.map((item) => (
              <li key={item.friendshipId} className="card flex items-center gap-3 p-4">
                <Avatar row={item.profile} />
                <span className="flex-1 truncate text-sm font-semibold text-plum">
                  {item.profile.fullName}
                </span>
                <button
                  type="button"
                  onClick={() => void respond(item.friendshipId, true)}
                  className="btn-primary flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold"
                >
                  <CheckCircleIcon className="h-3.5 w-3.5" />
                  Kabul et
                </button>
                <button
                  type="button"
                  onClick={() => void respond(item.friendshipId, false)}
                  className="btn-secondary rounded-full px-3.5 py-2 text-xs font-semibold text-terracotta"
                >
                  Reddet
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {outgoing.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="eyebrow">Gönderilen istekler</h2>
          <ul className="flex flex-col gap-2.5">
            {outgoing.map((item) => (
              <li key={item.friendshipId} className="card flex items-center gap-3 p-4">
                <Avatar row={item.profile} />
                <span className="flex-1 truncate text-sm font-semibold text-plum">
                  {item.profile.fullName}
                </span>
                <button
                  type="button"
                  onClick={() => void unfriend(item.friendshipId)}
                  className="btn-secondary rounded-full px-3.5 py-2 text-xs font-semibold text-plum-soft"
                >
                  İptal et
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow">
          Arkadaşlarım{" "}
          <span className="text-plum-faint">({friends.length})</span>
        </h2>
        {friends.length > 0 ? (
          <ul className="flex flex-col gap-2.5">
            {friends.map((item) => (
              <li key={item.friendshipId} className="card flex items-center gap-3 p-4">
                <Avatar row={item.profile} />
                <span className="flex-1 truncate text-sm font-semibold text-plum">
                  {item.profile.fullName}
                </span>
                <Link
                  href={`/friends/${item.otherId}`}
                  className="btn-soft flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold"
                >
                  <MessageIcon className="h-3.5 w-3.5 text-rose-deep" />
                  Sohbet
                </Link>
                <button
                  type="button"
                  onClick={() => void unfriend(item.friendshipId)}
                  className="btn-secondary rounded-full px-3 py-2 text-xs font-semibold text-terracotta"
                  aria-label="Arkadaşlıktan çıkar"
                >
                  Çıkar
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blush-soft text-rose-deep">
              <FriendsIcon className="h-6.5 w-6.5" />
            </span>
            <p className="text-sm text-plum-soft">
              Henüz arkadaşın yok. Yukarıdan birini arayıp ekle, sohbet başlasın!
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
