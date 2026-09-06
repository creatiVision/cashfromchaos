// ============================================================================
// Optional API auth. If CFC_API_TOKEN is set, mutating API endpoints require
// an "Authorization: Bearer <token>" header. Unset (the demo default) = fully
// open, so the LAN demo and the browser UI work with zero configuration.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual, createHash } from "crypto";

export function apiAuthConfigured(): boolean {
  return Boolean(process.env.CFC_API_TOKEN);
}

function safeCompare(a: string, b: string): boolean {
  const aHash = createHash("sha256").update(a).digest();
  const bHash = createHash("sha256").update(b).digest();
  return timingSafeEqual(aHash, bHash);
}

/** Returns a 401 response when auth fails, or null when the request may pass. */
export function checkApiAuth(req: NextRequest): NextResponse | null {
  if (!apiAuthConfigured()) return null;
  const expectedToken = process.env.CFC_API_TOKEN ?? "";
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (token && safeCompare(token, expectedToken)) return null;
  return NextResponse.json(
    { error: "Missing or invalid API token. Send 'Authorization: Bearer <CFC_API_TOKEN>'." },
    { status: 401 }
  );
}
