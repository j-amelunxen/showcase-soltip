"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HandleSearch() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [checking, setChecking] = useState(false);

  async function go() {
    const h = handle.trim().toLowerCase();
    if (!h) return;
    setChecking(true);
    setNotFound(false);
    const res = await fetch(`/api/profiles/${encodeURIComponent(h)}`);
    setChecking(false);
    if (res.ok) {
      router.push(`/${h}`);
    } else {
      setNotFound(true);
    }
  }

  return (
    <div className="w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go();
        }}
        className="flex w-full items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-2 focus-within:border-violet-500"
      >
        <span className="pl-3 text-zinc-500">soltip.app/</span>
        <input
          value={handle}
          onChange={(e) => {
            setHandle(e.target.value);
            setNotFound(false);
          }}
          placeholder="alex"
          className="min-w-0 flex-1 bg-transparent py-2 text-zinc-100 outline-none placeholder:text-zinc-600"
        />
        <button
          type="submit"
          disabled={checking}
          className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-700 disabled:opacity-50"
        >
          {checking ? "…" : "Open"}
        </button>
      </form>
      {notFound && (
        <p className="mt-2 text-center text-sm text-zinc-500">
          No page with that name yet. It&apos;s free to claim!
        </p>
      )}
    </div>
  );
}
