import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import PrintQR from "@/components/PrintQR";

export const dynamic = "force-dynamic";

export default async function QRPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const profile = db
    .select()
    .from(profiles)
    .where(eq(profiles.handle, handle.toLowerCase()))
    .get();
  if (!profile) notFound();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10 print:text-black">
      <h1 className="text-4xl font-extrabold tracking-tight">
        Tip {profile.displayName} ⚡
      </h1>
      <p className="text-lg text-zinc-400 print:text-zinc-700">
        Scan with any Solana wallet. It takes about a second.
      </p>
      <PrintQR recipient={profile.wallet} label={profile.displayName} />
      <p className="font-mono text-sm text-zinc-500">
        soltip.app/{profile.handle}
      </p>
    </div>
  );
}
