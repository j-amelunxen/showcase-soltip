"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import bs58 from "bs58";
import { buildClaimMessage } from "@/lib/claim";
import { HANDLE_REGEX, RESERVED_HANDLES } from "@/lib/constants";

type Availability = "unknown" | "checking" | "free" | "taken" | "invalid";

export default function CreatePage() {
  const router = useRouter();
  const { publicKey, signMessage, connected } = useWallet();
  const { setVisible } = useWalletModal();

  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [checked, setChecked] = useState<{
    handle: string;
    free: boolean;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalized = handle.trim().toLowerCase();
  const syntaxOk =
    HANDLE_REGEX.test(normalized) && !RESERVED_HANDLES.has(normalized);

  // Availability is derived. The effect below only fills the cache.
  const availability: Availability = !normalized
    ? "unknown"
    : !syntaxOk
      ? "invalid"
      : checked?.handle === normalized
        ? checked.free
          ? "free"
          : "taken"
        : "checking";

  // Live availability check, debounced.
  useEffect(() => {
    if (!normalized || !syntaxOk) return;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/profiles/${encodeURIComponent(normalized)}`
        );
        setChecked({ handle: normalized, free: res.status === 404 });
      } catch {
        // Transient error, stays in "checking" until the next keystroke.
      }
    }, 350);
    return () => clearTimeout(t);
  }, [normalized, syntaxOk]);

  const claim = useCallback(async () => {
    if (!publicKey || !signMessage) {
      setError("Your wallet doesn't support message signing.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const wallet = publicKey.toBase58();
      const ts = Date.now();
      // A free signature proves wallet ownership without a transaction.
      const message = buildClaimMessage(normalized, wallet, ts);
      const signature = await signMessage(new TextEncoder().encode(message));

      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: normalized,
          wallet,
          displayName: displayName.trim() || normalized,
          bio: bio.trim() || undefined,
          ts,
          signature: bs58.encode(signature),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      router.push(`/${data.handle}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Signing was cancelled");
    } finally {
      setSubmitting(false);
    }
  }, [publicKey, signMessage, normalized, displayName, bio, router]);

  const canSubmit =
    connected && availability === "free" && !submitting && normalized;

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-6 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Claim your pay link</h1>
        <p className="text-zinc-400">
          Connect your wallet, pick a name, sign once, done. Signing is free,
          no transaction needed.
        </p>
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-400">
            Your handle
          </label>
          <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 focus-within:border-violet-500">
            <span className="text-zinc-500">soltip.app/</span>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="alex"
              className="min-w-0 flex-1 bg-transparent text-zinc-100 outline-none placeholder:text-zinc-600"
            />
            <span className="text-sm">
              {availability === "checking" && "⏳"}
              {availability === "free" && "✅"}
              {availability === "taken" && "❌"}
            </span>
          </div>
          {availability === "taken" && (
            <p className="mt-1.5 text-sm text-red-400">
              Already taken, try another one.
            </p>
          )}
          {availability === "invalid" && (
            <p className="mt-1.5 text-sm text-red-400">
              3-30 characters: a-z, 0-9, hyphen. Some names are reserved.
            </p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-400">
            Display name
          </label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Alex"
            maxLength={60}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition focus:border-violet-500 placeholder:text-zinc-600"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-400">
            Bio <span className="text-zinc-600">(optional)</span>
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Buy me a coffee ☕"
            maxLength={280}
            rows={2}
            className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition focus:border-violet-500 placeholder:text-zinc-600"
          />
        </div>

        {connected ? (
          <button
            onClick={claim}
            disabled={!canSubmit}
            className="rounded-xl bg-violet-600 px-6 py-4 text-lg font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Waiting for signature…" : "Sign & claim"}
          </button>
        ) : (
          <button
            onClick={() => setVisible(true)}
            className="rounded-xl bg-violet-600 px-6 py-4 text-lg font-semibold text-white transition hover:bg-violet-500"
          >
            Connect wallet
          </button>
        )}

        {error && <p className="text-center text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}
