"use client";

import { ReactNode, useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { RPC_URL } from "@/lib/constants";

import "@solana/wallet-adapter-react-ui/styles.css";

export default function WalletProviders({ children }: { children: ReactNode }) {
  // Phantom, Solflare & co. register themselves via the Wallet Standard,
  // so no explicit adapters are needed.
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={RPC_URL}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
