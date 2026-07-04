import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import PayWidget from "@/components/PayWidget";
import RecentTips from "@/components/RecentTips";
import Avatar from "@/components/Avatar";
import { shortAddress } from "@/lib/solana";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ handle: string }> };

function getProfile(handle: string) {
  return db
    .select()
    .from(profiles)
    .where(eq(profiles.handle, handle.toLowerCase()))
    .get();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const profile = getProfile(handle);
  if (!profile) return { title: "Not found | SolTip" };
  return {
    title: `Tip ${profile.displayName} | SolTip`,
    description: profile.bio ?? `Send ${profile.displayName} a tip on Solana.`,
  };
}

export default async function ProfilePage({ params }: Props) {
  const { handle } = await params;
  const profile = getProfile(handle);
  if (!profile) notFound();

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <Avatar name={profile.displayName} seed={profile.wallet} />
        <div>
          <h1 className="text-2xl font-bold">{profile.displayName}</h1>
          <p className="text-sm text-zinc-500">
            @{profile.handle} · {shortAddress(profile.wallet)}
          </p>
        </div>
        {profile.bio && <p className="text-zinc-400">{profile.bio}</p>}
        <Link
          href={`/${profile.handle}/qr`}
          className="text-xs text-violet-400 hover:underline"
        >
          Print-friendly QR page ↗
        </Link>
      </div>

      <PayWidget recipient={profile.wallet} label={profile.displayName} />

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Recent tips
        </h2>
        <RecentTips wallet={profile.wallet} />
      </div>
    </div>
  );
}
