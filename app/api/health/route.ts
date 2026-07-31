import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.HEALTHCHECK_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";

  const supplied = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!supplied) return false;

  const expectedBuffer = Buffer.from(secret);
  const suppliedBuffer = Buffer.from(supplied);
  return (
    expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer)
  );
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Supabase is not configured" },
      { status: 503 }
    );
  }

  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("healthcheck");
  if (error) {
    return NextResponse.json(
      { ok: false, error: "Database is unavailable" },
      { status: 503 }
    );
  }

  return NextResponse.json(
    { ok: true, databaseTime: data },
    { headers: { "Cache-Control": "no-store" } }
  );
}
