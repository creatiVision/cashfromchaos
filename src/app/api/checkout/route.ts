import { NextRequest, NextResponse } from "next/server";
import { ensureSeeded, getItem, saveItem, trace } from "@/lib/store";
import { createCheckout } from "@/lib/payments";
import { eur } from "@/lib/money";
import { checkApiAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const denied = checkApiAuth(req);
  if (denied) return denied;
  const { itemId } = await req.json();
  await ensureSeeded();
  const item = getItem(itemId);
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  if (item.payment.amount <= 0) {
    return NextResponse.json({ error: "No agreed price yet" }, { status: 400 });
  }

  // Build the post-payment redirect from the host the buyer actually used, so
  // Stripe returns them to the same address (Tailscale IP / MagicDNS / localhost).

  const rawHost = req.headers.get("host") || "";
  let host: string | null = null;

  try {
    // Safely parse the hostname using the URL object to avoid parsing attacks (e.g. userinfo, trailing query)
    const dummyUrl = new URL(`http://${rawHost}`);
    const hostname = dummyUrl.hostname;

    const isLocalhost = ["localhost", "127.0.0.1", "[::1]"].includes(hostname);

    // Ensure strict ending to prevent bypasses like attacker.com?.ts.net
    const isTailscale = hostname.endsWith(".ts.net") || /^100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\.\d{1,3}\.\d{1,3}$/.test(hostname);
    const isPrivateIP = /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) || /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname) || /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname);

    let isBaseUrl = false;
    const baseUrlEnv = process.env.NEXT_PUBLIC_BASE_URL;
    if (baseUrlEnv) {
      const parsedBaseUrl = new URL(baseUrlEnv);
      isBaseUrl = parsedBaseUrl.host === dummyUrl.host || parsedBaseUrl.hostname === hostname;
    }

    if (isLocalhost || isTailscale || isPrivateIP || isBaseUrl) {
      // Use dummyUrl.host to safely extract just the valid host and port without potential userinfo or path
      host = dummyUrl.host;
    }
  } catch (e) {
    // Ignore malformed hosts
  }

  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  const origin = host ? `${proto}://${host}` : undefined;

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
