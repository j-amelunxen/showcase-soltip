import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params;
  const profile = db
    .select()
    .from(profiles)
    .where(eq(profiles.handle, handle.toLowerCase()))
    .get();

  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    handle: profile.handle,
    wallet: profile.wallet,
    displayName: profile.displayName,
    bio: profile.bio,
    createdAt: profile.createdAt,
  });
}
