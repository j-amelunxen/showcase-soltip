import { clusterApiUrl, PublicKey } from "@solana/web3.js";

export const APP_NAME = "SolTip";

export const CLUSTER = (process.env.NEXT_PUBLIC_CLUSTER ?? "devnet") as
  | "devnet"
  | "mainnet-beta";

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? clusterApiUrl(CLUSTER);

// Circle devnet USDC (faucet: https://faucet.circle.com). Override for mainnet:
// EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
export const USDC_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_USDC_MINT ??
    "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);

export const USDC_DECIMALS = 6;

export const HANDLE_REGEX = /^[a-z0-9-]{3,30}$/;

export const RESERVED_HANDLES = new Set([
  "api",
  "create",
  "pay",
  "qr",
  "admin",
  "www",
  "app",
  "soltip",
  "about",
  "help",
  "settings",
  "static",
  "_next",
]);

// Claim messages older than this are rejected (replay window).
export const CLAIM_MESSAGE_MAX_AGE_MS = 5 * 60 * 1000;

export const AMOUNT_PRESETS = [1, 5, 10];

// Payment polling
export const POLL_INTERVAL_MS = 1500;
export const POLL_TIMEOUT_MS = 120_000;
