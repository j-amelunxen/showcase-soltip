"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import BigNumber from "bignumber.js";
import {
  AMOUNT_PRESETS,
  CLUSTER,
  POLL_INTERVAL_MS,
  POLL_TIMEOUT_MS,
  USDC_DECIMALS,
  USDC_MINT,
} from "@/lib/constants";
import { getConnection, hasUsdcAccount, shortAddress } from "@/lib/solana";

type Currency = "SOL" | "USDC";
type PaymentResult = { reference: string; signature: string };

export default function PayWidget({
  recipient,
  label,
}: {
  recipient: string;
  label: string;
}) {
  const { publicKey, sendTransaction, connected } = useWallet();
  const { setVisible } = useWalletModal();

  const [amount, setAmount] = useState<string>("5");
  const [currency, setCurrency] = useState<Currency>("SOL");
  const [usdcAvailable, setUsdcAvailable] = useState<boolean | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [timedOutRef, setTimedOutRef] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const qrRef = useRef<HTMLDivElement>(null);

  const recipientKey = useMemo(() => new PublicKey(recipient), [recipient]);
  const parsedAmount = useMemo(() => new BigNumber(amount || "0"), [amount]);
  const amountValid = parsedAmount.isFinite() && parsedAmount.isGreaterThan(0);

  // Fresh reference per payment attempt. This key lets us find
  // exactly this payment on-chain. Regenerates whenever the payment
  // parameters change, so stale attempts can never confirm.
  const reference = useMemo(
    () => Keypair.generate().publicKey,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [amount, currency, recipient, attempt]
  );
  const referenceB58 = reference.toBase58();

  // Status is derived, never set synchronously.
  const confirmed = result?.reference === referenceB58;
  const timedOut = timedOutRef === referenceB58;
  const waiting = amountValid && !confirmed && !timedOut;

  // Does the recipient have a USDC token account? If not, only offer SOL.
  useEffect(() => {
    let cancelled = false;
    hasUsdcAccount(recipientKey)
      .then((has) => !cancelled && setUsdcAvailable(has))
      .catch(() => !cancelled && setUsdcAvailable(false));
    return () => {
      cancelled = true;
    };
  }, [recipientKey]);

  const retry = useCallback(() => {
    setAttempt((a) => a + 1);
    setErrorMsg(null);
  }, []);

  // Render the Solana Pay QR code whenever the payment parameters change.
  useEffect(() => {
    if (!waiting) return;
    let cancelled = false;

    (async () => {
      const { encodeURL, createQR } = await import("@solana/pay");
      if (cancelled || !qrRef.current) return;

      const url = encodeURL({
        recipient: recipientKey,
        amount: parsedAmount,
        splToken: currency === "USDC" ? USDC_MINT : undefined,
        reference,
        label,
        message: `Tip for ${label} via SolTip`,
      });

      const qr = createQR(url, 240, "white", "black");
      qrRef.current.innerHTML = "";
      // Exposed for e2e tests: lets a test read the exact payment URL
      // (including the reference key) that this QR encodes.
      qrRef.current.dataset.paymentUrl = url.toString();
      qr.append(qrRef.current);
    })();

    return () => {
      cancelled = true;
    };
  }, [waiting, reference, recipientKey, parsedAmount, currency, label]);

  // Poll the chain for a transaction that includes our reference key.
  useEffect(() => {
    if (!waiting) return;

    let cancelled = false;
    const startedAt = Date.now();

    const interval = setInterval(async () => {
      if (cancelled) return;
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        setTimedOutRef(referenceB58);
        clearInterval(interval);
        return;
      }
      try {
        const { findReference, validateTransfer, FindReferenceError } =
          await import("@solana/pay");
        const connection = getConnection();

        let sigInfo;
        try {
          sigInfo = await findReference(connection, reference, {
            finality: "confirmed",
          });
        } catch (e) {
          if (e instanceof FindReferenceError) return; // not paid yet
          throw e;
        }

        await validateTransfer(
          connection,
          sigInfo.signature,
          {
            recipient: recipientKey,
            amount: parsedAmount,
            splToken: currency === "USDC" ? USDC_MINT : undefined,
            reference,
          },
          { commitment: "confirmed" }
        );

        if (cancelled) return;
        clearInterval(interval);
        setResult({ reference: referenceB58, signature: sigInfo.signature });

        const confetti = (await import("canvas-confetti")).default;
        confetti({ particleCount: 140, spread: 75, origin: { y: 0.6 } });
      } catch {
        // Validation failure or transient RPC error, keep polling until timeout.
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [waiting, reference, referenceB58, recipientKey, parsedAmount, currency]);

  // Direct payment through a connected browser wallet (Phantom etc.).
  const payDirectly = useCallback(async () => {
    if (!publicKey || !amountValid) return;
    setSending(true);
    setErrorMsg(null);
    try {
      const connection = getConnection();
      const tx = new Transaction();

      if (currency === "SOL") {
        const ix = SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientKey,
          lamports: BigInt(
            parsedAmount.times(LAMPORTS_PER_SOL).integerValue().toString()
          ),
        });
        // The reference key makes this transaction findable by our polling.
        ix.keys.push({ pubkey: reference, isSigner: false, isWritable: false });
        tx.add(ix);
      } else {
        const { getAssociatedTokenAddress, createTransferCheckedInstruction } =
          await import("@solana/spl-token");
        const source = await getAssociatedTokenAddress(USDC_MINT, publicKey);
        const destination = await getAssociatedTokenAddress(
          USDC_MINT,
          recipientKey
        );
        const ix = createTransferCheckedInstruction(
          source,
          USDC_MINT,
          destination,
          publicKey,
          BigInt(
            parsedAmount.times(10 ** USDC_DECIMALS).integerValue().toString()
          ),
          USDC_DECIMALS
        );
        ix.keys.push({ pubkey: reference, isSigner: false, isWritable: false });
        tx.add(ix);
      }

      await sendTransaction(tx, connection);
      // Polling confirms it and flips the UI to "confirmed".
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setSending(false);
    }
  }, [
    publicKey,
    reference,
    amountValid,
    currency,
    parsedAmount,
    recipientKey,
    sendTransaction,
  ]);

  const explorerUrl = result
    ? `https://explorer.solana.com/tx/${result.signature}?cluster=${CLUSTER}`
    : null;

  if (confirmed) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
        <div className="text-5xl">✨</div>
        <h2 className="text-2xl font-bold text-emerald-400">
          Payment received!
        </h2>
        <p className="text-zinc-400">
          {parsedAmount.toString()} {currency} landed in {label}&apos;s wallet.
        </p>
        {explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-emerald-400 underline underline-offset-4 hover:text-emerald-300"
          >
            View transaction on Solana Explorer ↗
          </a>
        )}
        <button
          onClick={retry}
          className="mt-2 rounded-full bg-zinc-800 px-5 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-700"
        >
          Send another tip
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Amount presets */}
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-400">
          Amount
        </label>
        <div className="flex gap-2">
          {AMOUNT_PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => setAmount(String(preset))}
              className={`flex-1 rounded-xl border px-4 py-3 text-lg font-semibold transition ${
                amount === String(preset)
                  ? "border-violet-500 bg-violet-500/20 text-violet-300"
                  : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
              }`}
            >
              {preset}
            </button>
          ))}
          <input
            type="number"
            min="0"
            step="any"
            value={AMOUNT_PRESETS.includes(Number(amount)) ? "" : amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Custom"
            className="w-28 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-lg font-semibold text-zinc-100 outline-none transition focus:border-violet-500"
          />
        </div>
      </div>

      {/* Currency toggle */}
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-400">
          Currency
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrency("SOL")}
            className={`flex-1 rounded-xl border px-4 py-3 font-semibold transition ${
              currency === "SOL"
                ? "border-violet-500 bg-violet-500/20 text-violet-300"
                : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
            }`}
          >
            ◎ SOL
          </button>
          <button
            onClick={() => usdcAvailable && setCurrency("USDC")}
            disabled={!usdcAvailable}
            className={`flex-1 rounded-xl border px-4 py-3 font-semibold transition ${
              currency === "USDC"
                ? "border-violet-500 bg-violet-500/20 text-violet-300"
                : usdcAvailable
                  ? "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
                  : "cursor-not-allowed border-zinc-800 bg-zinc-900/50 text-zinc-600"
            }`}
            title={
              usdcAvailable === false
                ? `${label} hasn't activated USDC yet`
                : undefined
            }
          >
            $ USDC
          </button>
        </div>
        {usdcAvailable === false && (
          <p className="mt-2 text-xs text-zinc-500">
            {label}{" "}hasn&apos;t received USDC before, so only SOL is
            available.
          </p>
        )}
      </div>

      {amountValid ? (
        <>
          {/* QR code */}
          <div className="flex flex-col items-center gap-3">
            <div
              ref={qrRef}
              className="overflow-hidden rounded-2xl bg-white p-2 shadow-lg"
            />
            <p className="flex items-center gap-2 text-sm text-zinc-400">
              {waiting && (
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-violet-400" />
              )}
              {waiting
                ? "Scan with your wallet, we are watching the chain live…"
                : "No payment detected."}
            </p>
            {timedOut && (
              <button
                onClick={retry}
                className="rounded-full bg-zinc-800 px-5 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-700"
              >
                Try again
              </button>
            )}
          </div>

          {/* Direct pay via browser wallet */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex w-full items-center gap-3 text-xs text-zinc-600">
              <div className="h-px flex-1 bg-zinc-800" />
              or
              <div className="h-px flex-1 bg-zinc-800" />
            </div>
            {connected && publicKey ? (
              <button
                onClick={payDirectly}
                disabled={sending}
                className="w-full rounded-xl bg-violet-600 px-6 py-3.5 font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
              >
                {sending
                  ? "Confirm in your wallet…"
                  : `Pay ${parsedAmount.toString()} ${currency} with ${shortAddress(publicKey.toBase58())}`}
              </button>
            ) : (
              <button
                onClick={() => setVisible(true)}
                className="w-full rounded-xl bg-violet-600 px-6 py-3.5 font-semibold text-white transition hover:bg-violet-500"
              >
                Connect wallet & pay
              </button>
            )}
            {errorMsg && (
              <p className="text-center text-sm text-red-400">{errorMsg}</p>
            )}
          </div>
        </>
      ) : (
        <p className="text-center text-sm text-zinc-500">
          Enter an amount to generate a payment QR code.
        </p>
      )}
    </div>
  );
}
