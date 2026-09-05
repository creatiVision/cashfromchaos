import { NextRequest, NextResponse } from "next/server";
import { ensureSeeded, getItem, saveItem, trace } from "@/lib/store";
import { createCheckout } from "@/lib/payments";
import { eur } from "@/lib/money";
import { checkApiAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Validates and sanitizes the Host header from the request against allowed origins.
 * Prevents Host Header Injection attacks that could hijack post-payment checkout redirects.
 */
export function getSafeOrigin(req: NextRequest): string | undefined {
  const rawHost = req.headers.get("host")?.trim() || "";
  if (!rawHost) return undefined;

  try {
    const dummyUrl = new URL(`http://${rawHost}`);
    const hostWithPort = dummyUrl.host.toLowerCase();
    const hostnameOnly = dummyUrl.hostname.toLowerCase();

    const allowedHosts = new Set<string>();

    const baseUrlEnv = process.env.NEXT_PUBLIC_BASE_URL;
    if (baseUrlEnv) {
      try {
        const parsedBaseUrl = new URL(baseUrlEnv);
        allowedHosts.add(parsedBaseUrl.host.toLowerCase());
        allowedHosts.add(parsedBaseUrl.hostname.toLowerCase());
      } catch {
        // ignore invalid NEXT_PUBLIC_BASE_URL
      }
    }

    const envAllowed = process.env.ALLOWED_HOSTS || process.env.ALLOWED_ORIGINS;
    if (envAllowed) {
      for (const entry of envAllowed.split(",")) {
        const trimmed = entry.trim().toLowerCase();
        if (trimmed) {
          allowedHosts.add(trimmed);
          if (trimmed.includes("://")) {
            try {
              const u = new URL(trimmed);
              allowedHosts.add(u.host.toLowerCase());
              allowedHosts.add(u.hostname.toLowerCase());
            } catch {
              // ignore invalid URL entries
            }
          }
        }
      }
    }

    const isDev = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
    if (isDev || !baseUrlEnv) {
      allowedHosts.add("localhost");
      allowedHosts.add("127.0.0.1");
      allowedHosts.add("[::1]");
    }

    if (allowedHosts.has(hostWithPort) || allowedHosts.has(hostnameOnly)) {
      const rawProto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
      const safeProto = ["http", "https"].includes(rawProto.toLowerCase()) ? rawProto.toLowerCase() : "https";
      return `${safeProto}://${dummyUrl.host}`;
    }
  } catch {
    // Malformed Host header
  }

  return undefined;
}

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

  const origin = getSafeOrigin(req);

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
