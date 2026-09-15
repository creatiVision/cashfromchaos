// ============================================================================
// API auth. Mutating API endpoints require an "Authorization: Bearer <token>"
// header matching CFC_API_TOKEN by default (fail-closed design).
// To explicitly disable authentication (e.g. for unauthenticated local demo),
// set CFC_DISABLE_API_AUTH=true or DISABLE_API_AUTH=true in environment.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual, createHash } from "crypto";

export function isApiAuthDisabled(): boolean {
  const disabled = (
    process.env.CFC_DISABLE_API_AUTH ??
    process.env.DISABLE_API_AUTH ??
    ""
  ).toLowerCase().trim();
  return disabled === "true" || disabled === "1" || disabled === "yes";
}

export function apiAuthConfigured(): boolean {
  return !isApiAuthDisabled();
}

function safeCompare(a: string, b: string): boolean {
  const aHash = createHash("sha256").update(a).digest();
  const bHash = createHash("sha256").update(b).digest();
  return timingSafeEqual(aHash, bHash);
}

/** Returns a 401 response when auth fails, or null when the request may pass. */
export function checkApiAuth(req: NextRequest): NextResponse | null {
  if (isApiAuthDisabled()) return null;

  const expectedToken = process.env.CFC_API_TOKEN ?? "";
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();

  if (expectedToken && token && safeCompare(token, expectedToken)) {
    return null;
  }

  return NextResponse.json(
    { error: "Missing or invalid API token. Send 'Authorization: Bearer <CFC_API_TOKEN>'." },
    { status: 401 }
  );
}
