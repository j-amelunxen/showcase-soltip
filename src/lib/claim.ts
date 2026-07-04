import nacl from "tweetnacl";
import bs58 from "bs58";
import { PublicKey } from "@solana/web3.js";
import { CLAIM_MESSAGE_MAX_AGE_MS } from "./constants";

/**
 * The exact message a wallet signs to prove ownership when claiming a handle.
 * Signing a message is free, no transaction, no fee.
 */
export function buildClaimMessage(handle: string, wallet: string, ts: number) {
  return [
    "SolTip handle claim",
    `handle: ${handle}`,
    `wallet: ${wallet}`,
    `ts: ${ts}`,
  ].join("\n");
}

export type ClaimVerification =
  | { ok: true }
  | { ok: false; error: string };

export function verifyClaim(params: {
  handle: string;
  wallet: string;
  ts: number;
  signature: string; // base58
}): ClaimVerification {
  const { handle, wallet, ts, signature } = params;

  if (!Number.isFinite(ts)) return { ok: false, error: "Invalid timestamp" };
  const age = Date.now() - ts;
  if (age > CLAIM_MESSAGE_MAX_AGE_MS || age < -60_000) {
    return { ok: false, error: "Claim message expired, please sign again" };
  }

  let pubkeyBytes: Uint8Array;
  try {
    pubkeyBytes = new PublicKey(wallet).toBytes();
  } catch {
    return { ok: false, error: "Invalid wallet address" };
  }

  let sigBytes: Uint8Array;
  try {
    sigBytes = bs58.decode(signature);
  } catch {
    return { ok: false, error: "Invalid signature encoding" };
  }

  const message = new TextEncoder().encode(
    buildClaimMessage(handle, wallet, ts)
  );

  const valid = nacl.sign.detached.verify(message, sigBytes, pubkeyBytes);
  if (!valid) return { ok: false, error: "Signature does not match wallet" };

  return { ok: true };
}
