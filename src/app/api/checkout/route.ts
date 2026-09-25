import { NextRequest, NextResponse } from "next/server";
import { ensureSeeded, getItem, saveItem, trace } from "@/lib/store";
import { createCheckout } from "@/lib/payments";
import { eur } from "@/lib/money";
import { checkApiAuth } from "@/lib/auth";
import { resolveTrustedOrigin } from "@/lib/origin";

export const dynamic = "force-dynamic";

const MAX_ITEM_ID_LENGTH = 100;

export async function POST(req: NextRequest) {
  const denied = checkApiAuth(req);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { itemId } = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;

  if (!itemId) {
    return NextResponse.json({ error: "Missing itemId" }, { status: 400 });
  }

  if (typeof itemId !== "string" || itemId.length > MAX_ITEM_ID_LENGTH) {
    return NextResponse.json(
      { error: `itemId must be a string of at most ${MAX_ITEM_ID_LENGTH} characters` },
      { status: 400 }
    );
  }

  await ensureSeeded();
  const item = getItem(itemId);
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  if (item.payment.amount <= 0) {
    return NextResponse.json({ error: "No agreed price yet" }, { status: 400 });
  }

  // Build the post-payment redirect from the host the buyer actually used, so
  // Stripe returns them to the same address (Tailscale IP / MagicDNS / localhost).
  // Origin is strictly validated to prevent host header injection vulnerabilities.
  const origin = resolveTrustedOrigin(req);

  const session = await createCheckout(item, origin);
  item.payment = {
    ...item.payment,
    provider: session.provider,
    status: "pending",
    sessionId: session.sessionId,
    checkoutUrl: session.url,
  };
  trace(
    item,
    "stripe",
    `Checkout created (${session.provider})`,
    `${eur(item.payment.amount)} held pending delivery`,
    "money"
  );
  saveItem(item);
  return NextResponse.json({ url: session.url, provider: session.provider });
}
