/**
 * End-to-end verification against a running SolTip server + Solana devnet.
 *
 * 1. Claims a handle through the real API with a real ed25519 signature
 * 2. Airdrops devnet SOL to a payer wallet
 * 3. Pays the profile's wallet with a Solana-Pay-style reference key
 * 4. Finds & validates the payment exactly like the pay page does
 *
 * Usage: node scripts/e2e-devnet.mjs [handle]
 */
import {
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  clusterApiUrl,
} from "@solana/web3.js";
import { findReference, validateTransfer } from "@solana/pay";
import BigNumber from "bignumber.js";
import nacl from "tweetnacl";
import bs58 from "bs58";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const HANDLE = process.argv[2] ?? "demo";
const connection = new Connection(
  process.env.RPC_URL ?? clusterApiUrl("devnet"),
  "confirmed"
);

function buildClaimMessage(handle, wallet, ts) {
  return [
    "SolTip handle claim",
    `handle: ${handle}`,
    `wallet: ${wallet}`,
    `ts: ${ts}`,
  ].join("\n");
}

async function main() {
  // ── 1. Claim a handle via the real API ────────────────────────────────
  const recipient = Keypair.generate();
  const wallet = recipient.publicKey.toBase58();
  const ts = Date.now();
  const message = buildClaimMessage(HANDLE, wallet, ts);
  const signature = bs58.encode(
    nacl.sign.detached(new TextEncoder().encode(message), recipient.secretKey)
  );

  const claimRes = await fetch(`${BASE_URL}/api/profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      handle: HANDLE,
      wallet,
      displayName: HANDLE[0].toUpperCase() + HANDLE.slice(1),
      bio: "Buy me a coffee ☕ (e2e test profile)",
      ts,
      signature,
    }),
  });
  const claimBody = await claimRes.json();
  if (claimRes.status !== 201) {
    throw new Error(`Claim failed (${claimRes.status}): ${claimBody.error}`);
  }
  console.log(`✅ Claimed handle "${claimBody.handle}" for ${wallet}`);

  // Negative test: a bad signature must be rejected.
  const badRes = await fetch(`${BASE_URL}/api/profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      handle: HANDLE + "-evil",
      wallet: Keypair.generate().publicKey.toBase58(),
      displayName: "Mallory",
      ts: Date.now(),
      signature,
    }),
  });
  if (badRes.status !== 401) {
    throw new Error(`Forged claim was NOT rejected (got ${badRes.status})`);
  }
  console.log("✅ Forged signature correctly rejected (401)");

  // Profile is publicly readable
  const getRes = await fetch(`${BASE_URL}/api/profiles/${HANDLE}`);
  if (!getRes.ok) throw new Error("Profile GET failed");
  console.log("✅ Profile readable via GET /api/profiles/" + HANDLE);

  // ── 2. Fund a payer via devnet airdrop ────────────────────────────────
  const payer = process.env.PAYER_SECRET
    ? Keypair.fromSecretKey(bs58.decode(process.env.PAYER_SECRET))
    : Keypair.generate();
  console.log(`⏳ Funding payer ${payer.publicKey.toBase58()}…`);

  let funded =
    (await connection.getBalance(payer.publicKey)) > 0.1 * LAMPORTS_PER_SOL;
  for (let attempt = 1; !funded && attempt <= 5; attempt++) {
    try {
      const airdropSig = await connection.requestAirdrop(
        payer.publicKey,
        LAMPORTS_PER_SOL
      );
      const latest = await connection.getLatestBlockhash("confirmed");
      await connection.confirmTransaction(
        { signature: airdropSig, ...latest },
        "confirmed"
      );
      funded = true;
    } catch (e) {
      console.log(`   airdrop attempt ${attempt}/5 failed (${e.message?.slice(0, 60)}), retrying…`);
      await new Promise((r) => setTimeout(r, 4000 * attempt));
    }
  }
  if (!funded) {
    throw new Error(
      "Devnet faucet rate-limited. Fund a wallet at https://faucet.solana.com " +
        "and re-run with PAYER_SECRET=<base58 secret key>."
    );
  }
  console.log("✅ Payer funded");

  // ── 3. Pay with a reference key (what a wallet does after QR scan) ────
  const reference = Keypair.generate().publicKey;
  const amountSol = 0.05;
  const ix = SystemProgram.transfer({
    fromPubkey: payer.publicKey,
    toPubkey: recipient.publicKey,
    lamports: Math.round(amountSol * LAMPORTS_PER_SOL),
  });
  ix.keys.push({ pubkey: reference, isSigner: false, isWritable: false });
  const paySig = await sendAndConfirmTransaction(
    connection,
    new Transaction().add(ix),
    [payer],
    { commitment: "confirmed" }
  );
  console.log(`✅ Paid ${amountSol} SOL, tx ${paySig}`);

  // ── 4. Detect & validate like the pay page ────────────────────────────
  const start = Date.now();
  let sigInfo;
  for (;;) {
    try {
      sigInfo = await findReference(connection, reference, {
        finality: "confirmed",
      });
      break;
    } catch {
      if (Date.now() - start > 60_000) throw new Error("findReference timeout");
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  console.log(`✅ findReference located the payment in ${Date.now() - start}ms`);

  await validateTransfer(
    connection,
    sigInfo.signature,
    {
      recipient: recipient.publicKey,
      amount: new BigNumber(amountSol),
      reference,
    },
    { commitment: "confirmed" }
  );
  console.log("✅ validateTransfer: amount & recipient verified on-chain");

  console.log(
    `\n🎉 E2E PASS, profile live at ${BASE_URL}/${HANDLE}\n` +
      `   Explorer: https://explorer.solana.com/tx/${paySig}?cluster=devnet`
  );
}

main().catch((e) => {
  console.error("❌ E2E FAILED:", e.message ?? e);
  process.exit(1);
});
