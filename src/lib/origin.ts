import { NextRequest } from "next/server";

/**
 * Safely validates and constructs the origin from the request Host header.
 * Only allows trusted hosts (localhost, private IPs, Tailscale IPs/domains,
 * or NEXT_PUBLIC_BASE_URL). Returns undefined for unvalidated or malicious hosts.
 */
export function getTrustedOrigin(req: NextRequest): string | undefined {
  const rawHost = req.headers.get("host") || "";
  if (!rawHost) return undefined;

  // HTTP Host header must not contain userinfo (@), paths (/), query (? or #)
  if (rawHost.includes("@") || rawHost.includes("/") || rawHost.includes("?") || rawHost.includes("#")) {
    return undefined;
  }

  let host: string | undefined = undefined;

  try {
    // Safely parse host using URL constructor
    const dummyUrl = new URL(`http://${rawHost}`);

    // Reject if URL parsing detected userinfo
    if (dummyUrl.username || dummyUrl.password) {
      return undefined;
    }

    const hostname = dummyUrl.hostname;

    const isLocalhost = ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
    const isTailscale =
      hostname.endsWith(".ts.net") ||
      /^100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\.\d{1,3}\.\d{1,3}$/.test(hostname);
    const isPrivateIP =
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname);

    let isBaseUrl = false;
    const baseUrlEnv = process.env.NEXT_PUBLIC_BASE_URL;
    if (baseUrlEnv) {
      try {
        const parsedBase = new URL(baseUrlEnv);
        if (parsedBase.host === dummyUrl.host || parsedBase.hostname === hostname) {
          isBaseUrl = true;
        }
      } catch {
        // Ignore invalid NEXT_PUBLIC_BASE_URL
      }
    }

    if (isLocalhost || isTailscale || isPrivateIP || isBaseUrl) {
      host = dummyUrl.host;
    }
  } catch {
    // Return undefined on malformed Host headers
    return undefined;
  }

  if (!host) return undefined;

  const rawProto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  const proto = rawProto === "https" ? "https" : "http";

  return `${proto}://${host}`;
}
