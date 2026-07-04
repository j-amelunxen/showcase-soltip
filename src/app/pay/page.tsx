"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import PayWidget from "@/components/PayWidget";
import { isValidAddress, shortAddress } from "@/lib/solana";

/** Pay any raw Solana address, no registration required. */
function PayPageInner() {
  const searchParams = useSearchParams();
  const initial = searchParams.get("to") ?? "";
  const [address, setAddress] = useState(initial);

  const valid = isValidAddress(address.trim());

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Pay any address</h1>
        <p className="text-zinc-400">
          No SolTip page needed. Paste a Solana wallet address and send.
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-400">
          Recipient address
        </label>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="e.g. 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 font-mono text-sm text-zinc-100 outline-none transition focus:border-violet-500 placeholder:text-zinc-700"
        />
        {address.trim() && !valid && (
          <p className="mt-1.5 text-sm text-red-400">
            That doesn&apos;t look like a valid Solana address.
          </p>
        )}
      </div>

      {valid && (
        <PayWidget
          recipient={address.trim()}
          label={shortAddress(address.trim())}
        />
      )}
    </div>
  );
}

export default function PayPage() {
  return (
    <Suspense>
      <PayPageInner />
    </Suspense>
  );
}
