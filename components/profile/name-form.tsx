"use client";

import { useActionState } from "react";
import {
  updateProfileName,
  type ProfileFormState,
} from "@/lib/profiles/actions";

export function NameForm({
  firstName,
  lastName,
}: {
  firstName: string;
  lastName: string;
}) {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(
    updateProfileName,
    undefined
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="profile-firstname" className="label">
            Ad
          </label>
          <input
            id="profile-firstname"
            name="firstName"
            defaultValue={firstName}
            required
            maxLength={60}
            autoComplete="given-name"
            className="input px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="profile-lastname" className="label">
            Soyad
          </label>
          <input
            id="profile-lastname"
            name="lastName"
            defaultValue={lastName}
            required
            maxLength={60}
            autoComplete="family-name"
            className="input px-3 py-2.5 text-sm"
          />
        </div>
      </div>
      {state?.error && (
        <p className="text-xs font-medium text-terracotta">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="btn-primary w-full py-2.5 text-sm font-semibold disabled:opacity-60"
      >
        {pending ? "Kaydediliyor…" : "Bilgileri Kaydet"}
      </button>
    </form>
  );
}
