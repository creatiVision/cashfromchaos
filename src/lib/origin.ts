import { NextRequest } from "next/server";

/**
 * Validates and sanitizes the Host header from the request against allowed origins.
 * Prevents Host Header Injection attacks that could hijack post-payment checkout redirects.
 */
export function resolveTrustedOrigin(req: NextRequest): string | undefined {
  const rawHost = req.headers.get("host")?.trim() || "";
  if (!rawHost) return undefined;

  try {
    // Safely parse the hostname using the URL object to avoid parsing attacks (e.g. userinfo, trailing query)
    const dummyUrl = new URL(`http://${rawHost}`);
    const hostWithPort = dummyUrl.host.toLowerCase();
    const hostname = dummyUrl.hostname.toLowerCase();

    const isLocalhost = ["localhost", "127.0.0.1", "[::1]"].includes(hostname);

    const baseUrlEnv = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL;
    let isBaseUrl = false;
    if (baseUrlEnv) {
      try {
        const parsedBaseUrl = new URL(
          baseUrlEnv.startsWith("http") ? baseUrlEnv : `http://${baseUrlEnv}`
        );
        isBaseUrl =
          parsedBaseUrl.host.toLowerCase() === hostWithPort ||
          parsedBaseUrl.hostname.toLowerCase() === hostname;
      } catch {
        // Ignore invalid base URL env
      }
    }

    const envAllowed = process.env.ALLOWED_HOSTS || process.env.ALLOWED_ORIGINS;
    let isAllowedHost = false;
    if (envAllowed) {
      for (const entry of envAllowed.split(",")) {
        const trimmed = entry.trim().toLowerCase();
        if (trimmed) {
          if (trimmed === hostWithPort || trimmed === hostname) {
            isAllowedHost = true;
            break;
          }
          if (trimmed.includes("://")) {
            try {
              const u = new URL(trimmed);
              if (
                u.host.toLowerCase() === hostWithPort ||
                u.hostname.toLowerCase() === hostname
              ) {
                isAllowedHost = true;
                break;
              }
            } catch {
              // ignore invalid URL entries
            }
          }
        }
      }
    }

    // When NEXT_PUBLIC_BASE_URL is explicitly configured, reject arbitrary external .ts.net domains
    // unless explicitly permitted via ALLOWED_HOSTS/ALLOWED_ORIGINS.
    // When no baseUrl is set (e.g. self-hosted Tailscale development/testing), allow Tailscale & private IPs.
    const isTailscaleOrPrivate =
      !baseUrlEnv &&
      (hostname.endsWith(".ts.net") ||
        /^100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\.\d{1,3}\.\d{1,3}$/.test(
          hostname
        ) ||
        /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
        /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
        /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname));

    if (isLocalhost || isBaseUrl || isAllowedHost || isTailscaleOrPrivate) {
      const rawProto =
        req.headers.get("x-forwarded-proto") ??
        req.nextUrl?.protocol?.replace(":", "") ??
        "http";
      const safeProto = ["http", "https"].includes(rawProto.toLowerCase())
        ? rawProto.toLowerCase()
        : "https";
      return `${safeProto}://${dummyUrl.host}`;
    }
  } catch {
    // Ignore malformed hosts
  }

  return undefined;
}

export const getTrustedOrigin = resolveTrustedOrigin;
export const getSafeOrigin = resolveTrustedOrigin;
