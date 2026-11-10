import { NextRequest, NextResponse } from "next/server";
import { ensureSeeded, getItem, saveItem, setStatus, trace } from "@/lib/store";
import { checkApiAuth } from "@/lib/auth";
import { eur } from "@/lib/money";

export const dynamic = "force-dynamic";

const MAX_ITEM_ID_LENGTH = 100;

/**
 * POST /api/approve
 * Human-in-the-loop escalation approval endpoint.
 * Body: { itemId: string, decision: "approve" | "decline" }
 */
export async function POST(req: NextRequest) {
  const denied = checkApiAuth(req);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { itemId, decision } = (body as Record<string, unknown> | null) ?? {};

  if (!itemId || typeof itemId !== "string" || itemId.length > MAX_ITEM_ID_LENGTH) {
    return NextResponse.json(
      { error: `itemId must be a non-empty string of at most ${MAX_ITEM_ID_LENGTH} characters` },
      { status: 400 }
    );
  }

  try {
    if (decision !== "approve" && decision !== "decline") {
      return NextResponse.json({ error: "decision must be either 'approve' or 'decline'" }, { status: 400 });
    }

    await ensureSeeded();
    const item = getItem(itemId);
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (!item.pendingOffer) {
      return NextResponse.json({ error: "No pending offer awaiting approval for this item" }, { status: 400 });
    }

    const { offer, buyerName } = item.pendingOffer;

    if (decision === "approve") {
      // Seller overrides policy floor and accepts the offer
      item.payment = {
        provider: item.payment.provider,
        status: "none",
        amount: offer,
      };
      item.pendingOffer = undefined;
      setStatus(item, "offer-accepted");
      trace(
        item,
        "seller",
        `Seller approved escalated offer of ${eur(offer)}`,
        `Direct human override: accepted ${buyerName}'s below-floor offer. Deal agreed.`,
        "money"
      );

      return NextResponse.json({
        ok: true,
        action: "approved",
        status: item.status,
        agreedPrice: offer,
      });
    } else {
      // Seller declined the below-floor offer
      item.pendingOffer = undefined;
      setStatus(item, "buyer-engaged");
      trace(
        item,
        "seller",
        `Seller declined escalated offer of ${eur(offer)}`,
        `Offer from ${buyerName} was turned down. Item remains listed.`,
        "decision"
      );

      return NextResponse.json({
        ok: true,
        action: "declined",
        status: item.status,
      });
    }
  } catch {
    // Fail securely: do not expose internal error messages or stack traces to clients
    return NextResponse.json({ error: "Failed to process approval" }, { status: 500 });
  }
}
