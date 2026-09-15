import { NextRequest, NextResponse } from "next/server";
import { ensureSeeded, getItem, negotiate } from "@/lib/store";
import { parseOffer } from "@/lib/money";
import { checkApiAuth } from "@/lib/auth";
import type { BuyerMessage } from "@/lib/types";

export const dynamic = "force-dynamic";

const MAX_ITEM_ID_LENGTH = 100;
const MAX_TEXT_LENGTH = 2000;
const MAX_BUYER_NAME_LENGTH = 100;

export async function POST(req: NextRequest) {
  const denied = checkApiAuth(req);
  if (denied) return denied;
  const body = await req.json();
  const { itemId, text, buyerName } = body ?? {};
  if (!itemId || !text) {
    return NextResponse.json({ error: "Missing itemId or text" }, { status: 400 });
  }

  if (typeof itemId !== "string" || itemId.length > MAX_ITEM_ID_LENGTH) {
    return NextResponse.json(
      { error: `itemId must be a string of at most ${MAX_ITEM_ID_LENGTH} characters` },
      { status: 400 }
    );
  }
  if (typeof text !== "string" || text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `text must be a string of at most ${MAX_TEXT_LENGTH} characters` },
      { status: 400 }
    );
  }
  if (
    buyerName !== undefined &&
    buyerName !== null &&
    (typeof buyerName !== "string" || buyerName.length > MAX_BUYER_NAME_LENGTH)
  ) {
    return NextResponse.json(
      { error: `buyerName must be a string of at most ${MAX_BUYER_NAME_LENGTH} characters` },
      { status: 400 }
    );
  }

  await ensureSeeded();
  const item = getItem(itemId);
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const msg: BuyerMessage = {
    itemId,
    buyerName: buyerName || "Buyer",
    text: String(text),
    offer: typeof body.offer === "number" ? body.offer : parseOffer(String(text)),
    ts: Date.now(),
  };
  const reply = await negotiate(item, msg);
  return NextResponse.json({ reply, item });
}
