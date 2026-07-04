"use client";

import { useEffect, useState } from "react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { getConnection, shortAddress, timeAgo } from "@/lib/solana";
import { USDC_DECIMALS, USDC_MINT } from "@/lib/constants";

type Tip = {
  signature: string;
  amount: number;
  currency: "SOL" | "USDC";
  from: string;
  blockTime: number;
};

/**
 * The blockchain is our payment history, no database needed.
 * Reads recent incoming SOL and USDC transfers straight from the chain.
 */
export default function RecentTips({ wallet }: { wallet: string }) {
  const [tips, setTips] = useState<Tip[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const connection = getConnection();
        const owner = new PublicKey(wallet);
        const usdcAta = await getAssociatedTokenAddress(USDC_MINT, owner);
        const ownerB58 = owner.toBase58();
        const ataB58 = usdcAta.toBase58();

        const sigs = await connection.getSignaturesForAddress(owner, {
          limit: 15,
        });
        if (sigs.length === 0) {
          if (!cancelled) setTips([]);
          return;
        }

        const txs = await connection.getParsedTransactions(
          sigs.map((s) => s.signature),
          { maxSupportedTransactionVersion: 0 }
        );

        const found: Tip[] = [];
        for (const tx of txs) {
          if (!tx?.blockTime || tx.meta?.err) continue;
          for (const ix of tx.transaction.message.instructions) {
            if (!("parsed" in ix)) continue;
            const { type, info } = ix.parsed ?? {};
            if (
              ix.program === "system" &&
              type === "transfer" &&
              info?.destination === ownerB58 &&
              info?.source !== ownerB58
            ) {
              found.push({
                signature: tx.transaction.signatures[0],
                amount: Number(info.lamports) / LAMPORTS_PER_SOL,
                currency: "SOL",
                from: info.source,
                blockTime: tx.blockTime,
              });
            }
            if (
              ix.program === "spl-token" &&
              (type === "transferChecked" || type === "transfer") &&
              info?.destination === ataB58
            ) {
              const raw =
                info.tokenAmount?.uiAmount ??
                Number(info.amount ?? 0) / 10 ** USDC_DECIMALS;
              found.push({
                signature: tx.transaction.signatures[0],
                amount: raw,
                currency: "USDC",
                from: info.authority ?? info.multisigAuthority ?? "unknown",
                blockTime: tx.blockTime,
              });
            }
          }
        }

        if (!cancelled) setTips(found.slice(0, 8));
      } catch {
        if (!cancelled) setTips([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [wallet]);

  if (tips === null) {
    return (
      <div className="animate-pulse text-sm text-zinc-600">
        Reading tips from the blockchain…
      </div>
    );
  }

  if (tips.length === 0) {
    return (
      <p className="text-sm text-zinc-600">
        No tips yet. Be the first! 💜
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {tips.map((tip) => (
        <li
          key={tip.signature + tip.currency}
          className="flex items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-2.5 text-sm"
        >
          <span className="font-medium text-zinc-300">
            {tip.currency === "SOL" ? "◎" : "$"}{" "}
            {tip.amount.toLocaleString("en-US", { maximumFractionDigits: 4 })}{" "}
            {tip.currency}
          </span>
          <span className="text-zinc-500">
            from {shortAddress(tip.from)} · {timeAgo(tip.blockTime)}
          </span>
        </li>
      ))}
    </ul>
  );
}
