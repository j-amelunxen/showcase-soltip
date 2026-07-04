import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-5xl">🔍</div>
      <h1 className="text-2xl font-bold">This page doesn&apos;t exist yet</h1>
      <p className="max-w-sm text-zinc-400">
        No one has claimed this handle yet. It could be yours.
      </p>
      <Link
        href="/create"
        className="rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white transition hover:bg-violet-500"
      >
        Claim it now →
      </Link>
    </div>
  );
}
