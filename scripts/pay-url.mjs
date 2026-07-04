/**
 * Pays a Solana Pay transfer-request URL. It behaves like a mobile wallet
 * that just scanned the QR code. Used by the browser e2e test.
 *
 * Usage: RPC_URL=http://127.0.0.1:8899 node scripts/pay-url.mjs "solana:...?amount=..&reference=.."
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
import { parseURL } from "@solana/pay";

const url = process.argv[2];
if (!url) {
  console.error("Usage: node scripts/pay-url.mjs <solana-pay-url>");
  process.exit(1);
}

const connection = new Connection(
  process.env.RPC_URL ?? clusterApiUrl("devnet"),
  "confirmed"
);

const { recipient, amount, reference } = parseURL(url);

const payer = Keypair.generate();
const airdropSig = await connection.requestAirdrop(
  payer.publicKey,
  Math.ceil((amount.toNumber() + 0.01) * LAMPORTS_PER_SOL)
);
const latest = await connection.getLatestBlockhash("confirmed");
await connection.confirmTransaction(
  { signature: airdropSig, ...latest },
  "confirmed"
);

const ix = SystemProgram.transfer({
  fromPubkey: payer.publicKey,
  toPubkey: recipient,
  lamports: Math.round(amount.toNumber() * LAMPORTS_PER_SOL),
});
for (const ref of reference ?? []) {
  ix.keys.push({ pubkey: ref, isSigner: false, isWritable: false });
}

const sig = await sendAndConfirmTransaction(
  connection,
  new Transaction().add(ix),
  [payer],
  { commitment: "confirmed" }
);
console.log(`✅ Paid ${amount.toString()} SOL to ${recipient.toBase58()}, tx ${sig}`);
