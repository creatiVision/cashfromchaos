// ============================================================================
// Optional API auth. If CFC_API_TOKEN is set, mutating API endpoints require
// an "Authorization: Bearer <token>" header. Unset (the demo default) = fully
// open, so the LAN demo and the browser UI work with zero configuration.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";

export function apiAuthConfigured(): boolean {
  return Boolean(process.env.CFC_API_TOKEN);
}

/** Returns a 401 response when auth fails, or null when the request may pass. */
export function checkApiAuth(req: NextRequest): NextResponse | null {
  if (!apiAuthConfigured()) return null;
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (token && token === process.env.CFC_API_TOKEN) return null;
  return NextResponse.json(
    { error: "Missing or invalid API token. Send 'Authorization: Bearer <CFC_API_TOKEN>'." },
    { status: 401 }
  );
}
