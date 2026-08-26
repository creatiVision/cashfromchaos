import { NextRequest } from "next/server";

/**
 * Safely validates and constructs the origin from the request Host header.
 * Only allows trusted hosts (localhost, private IPs, Tailscale IPs/domains,
 * or NEXT_PUBLIC_BASE_URL/APP_URL). Returns undefined for unvalidated or malicious hosts.
 */
export function resolveTrustedOrigin(req: NextRequest): string | undefined {
  const rawHost = req.headers.get("host") || "";
  if (!rawHost) return undefined;

  try {
    // Safely parse the hostname using the URL object to avoid parsing attacks (e.g. userinfo, trailing query)
    const dummyUrl = new URL(`http://${rawHost}`);
    const hostname = dummyUrl.hostname;

    const isLocalhost = ["localhost", "127.0.0.1", "[::1]"].includes(hostname);

    // Ensure strict ending to prevent bypasses like attacker.com?.ts.net
    const isTailscale =
      hostname.endsWith(".ts.net") ||
      /^100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\.\d{1,3}\.\d{1,3}$/.test(hostname);
    const isPrivateIP =
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname);

    let isBaseUrl = false;
    const baseUrlEnv = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL;
    if (baseUrlEnv) {
      try {
        const parsedBaseUrl = new URL(
          baseUrlEnv.startsWith("http") ? baseUrlEnv : `http://${baseUrlEnv}`
        );
        isBaseUrl =
          parsedBaseUrl.host === dummyUrl.host ||
          parsedBaseUrl.hostname === hostname;
      } catch {
        // Ignore invalid base URL env
      }
    }

    if (isLocalhost || isTailscale || isPrivateIP || isBaseUrl) {
      const rawProto =
        req.headers.get("x-forwarded-proto") ??
        req.nextUrl?.protocol?.replace(":", "") ??
        "http";
      const proto = rawProto === "https" ? "https" : "http";
      return `${proto}://${dummyUrl.host}`;
    }
  } catch {
    // Ignore malformed hosts
  }

  return undefined;
}

// Backward compatibility alias
export const getTrustedOrigin = resolveTrustedOrigin;