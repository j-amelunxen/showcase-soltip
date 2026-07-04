import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { verifyClaim } from "@/lib/claim";
import { HANDLE_REGEX, RESERVED_HANDLES } from "@/lib/constants";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { handle, wallet, displayName, bio, ts, signature } = (body ?? {}) as {
    handle?: string;
    wallet?: string;
    displayName?: string;
    bio?: string;
    ts?: number;
    signature?: string;
  };

  if (!handle || !wallet || !displayName || !ts || !signature) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const normalized = handle.toLowerCase().trim();
  if (!HANDLE_REGEX.test(normalized)) {
    return NextResponse.json(
      { error: "Handle must be 3-30 chars: a-z, 0-9, hyphen" },
      { status: 400 }
    );
  }
  if (RESERVED_HANDLES.has(normalized)) {
    return NextResponse.json({ error: "Handle is reserved" }, { status: 400 });
  }
  if (displayName.trim().length === 0 || displayName.length > 60) {
    return NextResponse.json(
      { error: "Display name must be 1-60 characters" },
      { status: 400 }
    );
  }
  if (bio && bio.length > 280) {
    return NextResponse.json(
      { error: "Bio must be at most 280 characters" },
      { status: 400 }
    );
  }

  // Server-side proof of wallet ownership. Never trust the client here.
  const verification = verifyClaim({
    handle: normalized,
    wallet,
    ts,
    signature,
  });
  if (!verification.ok) {
    return NextResponse.json({ error: verification.error }, { status: 401 });
  }

  const existingHandle = db
    .select()
    .from(profiles)
    .where(eq(profiles.handle, normalized))
    .get();
  if (existingHandle) {
    return NextResponse.json(
      { error: "Handle is already taken" },
      { status: 409 }
    );
  }

  const existingWallet = db
    .select()
    .from(profiles)
    .where(eq(profiles.wallet, wallet))
    .get();
  if (existingWallet) {
    return NextResponse.json(
      {
        error: `This wallet already owns the handle "${existingWallet.handle}"`,
        handle: existingWallet.handle,
      },
      { status: 409 }
    );
  }

  db.insert(profiles)
    .values({
      handle: normalized,
      wallet,
      displayName: displayName.trim(),
      bio: bio?.trim() || null,
      createdAt: new Date(),
    })
    .run();

  return NextResponse.json({ handle: normalized }, { status: 201 });
}
