import { NextRequest, NextResponse } from "next/server";
import { ensureSeeded, getItem, saveItem, setStatus, trace } from "@/lib/store";
import { getOperator } from "@/lib/operator";
import { buildLedger, stripeConfigured } from "@/lib/payments";
import Stripe from "stripe";
import { eur } from "@/lib/money";

export const dynamic = "force-dynamic";

// Stripe success_url and the simulated flow both land here.
export async function GET(req: NextRequest) {
  const itemId = req.nextUrl.searchParams.get("item");
  const sessionId = req.nextUrl.searchParams.get("session");
  if (!itemId) return NextResponse.json({ error: "Missing item" }, { status: 400 });
  if (!sessionId) return NextResponse.json({ error: "Missing session" }, { status: 400 });

  await ensureSeeded();
  const item = getItem(itemId);
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  if (stripeConfigured()) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== "paid") {
        return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
      }
      if (session.metadata?.itemId !== itemId) {
        return NextResponse.json({ error: "Invalid session for this item" }, { status: 400 });
      }
    } catch (err) {
      return NextResponse.json({ error: "Invalid Stripe session" }, { status: 400 });
    }
  } else {
    // Simulated flow validation
    if (sessionId !== `sim_${itemId}`) {
      return NextResponse.json({ error: "Invalid simulated session" }, { status: 400 });
    }
  }

  if (item.payment.status !== "released") {
    // Mark payment held in custody.
    item.payment.status = "held";
    trace(item, "stripe", "Payment received — held in custody", eur(item.payment.amount), "money");
    setStatus(item, "paid");

    // Operator decides fulfillment, then we build the ledger.
    const fulfillment = await getOperator().decideFulfillment(item);
    item.fulfillment = fulfillment;
    item.ledger = buildLedger(item);
    trace(
      item,
      "operator",
      fulfillment.mode === "shipping" ? "Shipping label generated" : "Local pickup arranged",
      fulfillment.instruction,
      "money"
    );
    setStatus(item, fulfillment.mode === "shipping" ? "shipping-required" : "shipping-required");
    saveItem(item);
  }

  return NextResponse.redirect(new URL(`/market/${itemId}?paid=1`, req.url));
}
