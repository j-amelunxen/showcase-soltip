import Link from "next/link";
import HandleSearch from "@/components/HandleSearch";

const FEATURES = [
  {
    icon: "⚡",
    title: "Settled in ~1 second",
    text: "Solana confirms payments faster than a card terminal. Your tipper sees the confirmation live.",
  },
  {
    icon: "🪙",
    title: "Fees near zero",
    text: "A transaction costs a fraction of a cent. A 1 € tip stays a 1 € tip.",
  },
  {
    icon: "🔑",
    title: "Your keys, your money",
    text: "SolTip never touches funds. Payments go straight from wallet to wallet. We just host your link.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-12 px-6 py-16">
      <div className="flex flex-col items-center gap-5 text-center">
        <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm font-medium text-violet-300">
          Like PayPal.me, but on Solana
        </span>
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
          Get paid in{" "}
          <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            seconds
          </span>
        </h1>
        <p className="max-w-xl text-lg text-zinc-400">
          Claim your personal pay link, share it anywhere. Anyone can tip you
          in SOL or USDC with one scan. No account, no signup, no middleman.
        </p>
      </div>

      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <HandleSearch />
        <Link
          href="/create"
          className="w-full rounded-xl bg-violet-600 px-6 py-4 text-center text-lg font-semibold text-white transition hover:bg-violet-500"
        >
          Create your link →
        </Link>
      </div>

      <div className="grid w-full gap-4 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-5"
          >
            <div className="mb-2 text-2xl">{f.icon}</div>
            <h3 className="mb-1 font-semibold">{f.title}</h3>
            <p className="text-sm text-zinc-500">{f.text}</p>
          </div>
        ))}
      </div>

      <p className="text-sm text-zinc-600">
        Have a wallet address but no link?{" "}
        <Link href="/pay" className="text-violet-400 hover:underline">
          Pay any address directly
        </Link>
      </p>
    </div>
  );
}
