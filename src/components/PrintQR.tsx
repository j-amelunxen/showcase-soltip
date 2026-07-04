"use client";

import { useEffect, useRef } from "react";
import { PublicKey } from "@solana/web3.js";

/**
 * A large, amount-less Solana Pay QR. The payer's wallet asks for the
 * amount. Made to be printed and taped to a counter or laptop.
 */
export default function PrintQR({
  recipient,
  label,
}: {
  recipient: string;
  label: string;
}) {
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { encodeURL, createQR } = await import("@solana/pay");
      if (cancelled || !qrRef.current) return;
      const url = encodeURL({
        recipient: new PublicKey(recipient),
        label,
        message: `Tip for ${label} via SolTip`,
      });
      const qr = createQR(url, 380, "white", "black");
      qrRef.current.innerHTML = "";
      qr.append(qrRef.current);
    })();
    return () => {
      cancelled = true;
    };
  }, [recipient, label]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div ref={qrRef} className="overflow-hidden rounded-3xl bg-white p-4" />
      <button
        onClick={() => window.print()}
        className="no-print rounded-full bg-zinc-800 px-6 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-zinc-700"
      >
        🖨 Print this page
      </button>
    </div>
  );
}
