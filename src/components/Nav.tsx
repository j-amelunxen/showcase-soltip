"use client";

import Link from "next/link";
import dynamic from "next/dynamic";

// The wallet button renders differently on server and client (connection
// state), so it must be client-only to avoid hydration mismatches.
const WalletMultiButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then(
      (mod) => mod.WalletMultiButton
    ),
  { ssr: false }
);

export default function Nav() {
  return (
    <nav className="no-print flex items-center justify-between px-6 py-4">
      <Link href="/" className="text-lg font-bold tracking-tight">
        <span className="text-violet-400">◎</span> SolTip
      </Link>
      <WalletMultiButton />
    </nav>
  );
}
