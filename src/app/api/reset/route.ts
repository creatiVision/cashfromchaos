import { NextRequest, NextResponse } from "next/server";
import { listItems, resetDemo } from "@/lib/store";
import { checkApiAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Re-seed the three demo items. Handy between video takes.
export async function POST(req: NextRequest) {
  const denied = checkApiAuth(req);
  if (denied) return denied;
  await resetDemo();
  return NextResponse.json({ ok: true, items: listItems().length });
}
