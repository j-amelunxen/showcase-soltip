import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { RPC_URL, USDC_MINT } from "./constants";

let connection: Connection | null = null;

export function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(RPC_URL, "confirmed");
  }
  return connection;
}

/**
 * USDC lives in an Associated Token Account. If the recipient never held
 * USDC, that account does not exist and a plain transfer would fail,
 * so the pay page checks this and only offers USDC when it's safe.
 */
export async function hasUsdcAccount(owner: PublicKey): Promise<boolean> {
  const ata = await getAssociatedTokenAddress(USDC_MINT, owner);
  const info = await getConnection().getAccountInfo(ata);
  return info !== null;
}

export function shortAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

export function isValidAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

export function timeAgo(unixSeconds: number): string {
  const diff = Math.max(0, Date.now() / 1000 - unixSeconds);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
