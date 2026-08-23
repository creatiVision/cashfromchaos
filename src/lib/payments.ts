// ============================================================================
// Payments + payout custody. Real Stripe test-mode Checkout when a key is set;
// otherwise a fully-simulated held-payment flow so the demo runs offline.
//
// Wording per CLAUDE.md: this is an *escrow-like* marketplace flow for demo
// purposes — "Stripe-powered held payment", "funds released after delivery
// confirmation". We do not claim legal escrow.
// ============================================================================

import { round2 } from "@/lib/money";
import type { Item, LedgerEntry } from "@/lib/types";

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function paypalConfigured(): boolean {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

// ---------------------------------------------------------------------------
// Payment providers — swappable checkout front-ends behind one interface.
// The escrow-like held-payment semantics live in the store/confirm route and
// are identical for every provider; only how the buyer pays differs.
// ---------------------------------------------------------------------------
interface CheckoutResult {
  url: string;
  sessionId: string;
}

interface PaymentProvider {
  id: "stripe" | "paypal" | "simulated";
  isConfigured(): boolean;
  createCheckout(item: Item, base: string): Promise<CheckoutResult>;
}

const stripeProvider: PaymentProvider = {
  id: "stripe",
  isConfigured: () => stripeConfigured(),
  async createCheckout(item, base) {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // "paypal" enables real PayPal funding through Stripe Checkout.
      payment_method_types: ["card", "paypal"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: Math.round(item.payment.amount * 100),
            product_data: {
              name: item.analysis.title,
              description: `CashFromChaos held payment · released on delivery confirmation`,
            },
          },
        },
      ],
      success_url: `${base}/api/checkout/confirm?item=${item.id}&session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/market/${item.id}?canceled=1`,
      metadata: { itemId: item.id },
    });
    return { sessionId: session.id, url: session.url ?? `${base}/market/${item.id}` };
  },
};

// Mock PayPal checkout: no real API call, no SDK. Deterministic URL so the
// confirm route can recognize it. Real PayPal Orders API can slot in later.
const paypalProvider: PaymentProvider = {
  id: "paypal",
  isConfigured: () => paypalConfigured(),
  async createCheckout(item, base) {
    const sessionId = `pp_${item.id}`;
    return {
      sessionId,
      url: `${base}/api/checkout/confirm?item=${item.id}&session=${sessionId}&provider=paypal`,
    };
  },
};

const simulatedProvider: PaymentProvider = {
  id: "simulated",
  isConfigured: () => true,
  async createCheckout(item, base) {
    const sessionId = `sim_${item.id}`;
    return {
      sessionId,
      url: `${base}/api/checkout/confirm?item=${item.id}&session=${sessionId}&sim=1`,
    };
  },
};

const PROVIDERS: Record<string, PaymentProvider> = {
  stripe: stripeProvider,
  paypal: paypalProvider,
  simulated: simulatedProvider,
};

/**
 * Provider selection via PAYMENT_PROVIDER env ("stripe" | "paypal" |
 * "simulated", default "stripe"). If the chosen provider lacks credentials
 * (e.g. paypal without PAYPAL_CLIENT_ID), we fall back to the offline
 * simulated flow so the demo never breaks.
 */
function selectProvider(): PaymentProvider {
  const requested = (process.env.PAYMENT_PROVIDER ?? "stripe").toLowerCase();
  const chosen = PROVIDERS[requested];
  if (chosen?.isConfigured()) return chosen;
  return simulatedProvider;
}

export function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
}

/**
 * Create a Checkout session for an agreed item. Returns a URL to redirect the
 * buyer to. Uses real Stripe test mode if STRIPE_SECRET_KEY is present, else a
 * simulated success URL handled inside the app.
 */
export async function createCheckout(
  item: Item,
  origin?: string
): Promise<{
  url: string;
  sessionId: string;
  provider: "stripe" | "paypal" | "simulated";
}> {
  // Redirect back to the exact host the buyer is using (Tailscale IP, MagicDNS
  // name, or localhost), falling back to NEXT_PUBLIC_BASE_URL. This avoids the
  // Next.js gotcha where NEXT_PUBLIC_* gets frozen into the build at build time.
  const base = origin || baseUrl();
  const provider = selectProvider();
  const result = await provider.createCheckout(item, base);
  return { provider: provider.id, ...result };
}

// ---------------------------------------------------------------------------
// Ledger / P&L. Built when payment is captured; payout finalizes on delivery.
// ---------------------------------------------------------------------------
export function buildLedger(item: Item): LedgerEntry[] {
  const gross = item.payment.amount;
  const channel = item.plan.primary;
  const feePct = channel.feePct ?? 0;
  const fee = round2((gross * feePct) / 100);
  const shipping = item.fulfillment?.labelCost ?? 0;
  const entries: LedgerEntry[] = [
    { label: `Buyer payment (${channel.name})`, amount: gross, kind: "revenue" },
  ];
  if (fee > 0)
    entries.push({ label: `Marketplace fee (${feePct}%)`, amount: -fee, kind: "fee" });
  if (shipping > 0)
    entries.push({
      label: `Shipping label (${item.fulfillment?.carrier ?? "carrier"})`,
      amount: -shipping,
      kind: "shipping",
    });
  return entries;
}

export function netPayout(item: Item): number {
  return round2(item.ledger.reduce((acc, e) => acc + e.amount, 0));
}
