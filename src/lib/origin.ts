import { NextRequest } from "next/server";

const STANDARD_HOST_REGEX = /^[a-zA-Z0-9.-]+(?::\d+)?$/;
const IPV6_HOST_REGEX = /^\[[a-fA-F0-9:]+\](?::\d+)?$/;

const CGNAT_IP_REGEX = /^100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\.\d{1,3}\.\d{1,3}$/;
const PRIVATE_10_IP_REGEX = /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const PRIVATE_172_IP_REGEX = /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/;
const PRIVATE_192_IP_REGEX = /^192\.168\.\d{1,3}\.\d{1,3}$/;

/**
 * Validates rawHost structure before URL parsing to prevent Host Header parsing attacks
 * (e.g. userinfo injection, trailing paths/queries, or backslashes).
 */
export function isValidHostFormat(rawHost: string): boolean {
  return STANDARD_HOST_REGEX.test(rawHost) || IPV6_HOST_REGEX.test(rawHost);
}

/**
 * Parses the raw host using the URL object and verifies no userinfo or path component is present.
 */
export function parseHostInfo(rawHost: string): {
  hostWithPort: string;
  hostname: string;
  dummyUrl: URL;
} | undefined {
  try {
    const dummyUrl = new URL(`http://${rawHost}`);
    if (
      dummyUrl.username ||
      dummyUrl.password ||
      (dummyUrl.pathname !== "/" && dummyUrl.pathname !== "")
    ) {
      return undefined;
    }
    return {
      hostWithPort: dummyUrl.host.toLowerCase(),
      hostname: dummyUrl.hostname.toLowerCase(),
      dummyUrl,
    };
  } catch {
    return undefined;
  }
}

/**
 * Checks if the hostname is a local address.
 */
export function isLocalhost(hostname: string): boolean {
  return ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
}

/**
 * Checks if the host matches NEXT_PUBLIC_BASE_URL or APP_URL environment variables.
 */
export function isBaseUrl(
  hostWithPort: string,
  hostname: string,
  baseUrlEnv?: string
): boolean {
  if (!baseUrlEnv) return false;
  try {
    const parsedBaseUrl = new URL(
      baseUrlEnv.startsWith("http") ? baseUrlEnv : `http://${baseUrlEnv}`
    );
    const baseHostWithPort = parsedBaseUrl.host.toLowerCase();
    const baseHostname = parsedBaseUrl.hostname.toLowerCase();
    return baseHostWithPort === hostWithPort || baseHostname === hostname;
  } catch {
    return false;
  }
}

/**
 * Checks if the host matches any host or origin in ALLOWED_HOSTS or ALLOWED_ORIGINS.
 */
export function isAllowedHost(
  hostWithPort: string,
  hostname: string,
  envAllowed?: string
): boolean {
  if (!envAllowed) return false;

  for (const entry of envAllowed.split(",")) {
    const trimmed = entry.trim().toLowerCase();
    if (!trimmed) continue;

    if (trimmed === hostWithPort || trimmed === hostname) {
      return true;
    }

    if (trimmed.includes("://")) {
      try {
        const u = new URL(trimmed);
        if (
          u.host.toLowerCase() === hostWithPort ||
          u.hostname.toLowerCase() === hostname
        ) {
          return true;
        }
      } catch {
        // Ignore invalid URL entries
      }
    }
  }

  return false;
}

/**
 * When no base URL environment variable is configured, allows Tailscale domains and private IP ranges.
 */
export function isTailscaleOrPrivate(
  hostname: string,
  baseUrlEnv?: string
): boolean {
  if (baseUrlEnv) return false;

  return (
    hostname.endsWith(".ts.net") ||
    CGNAT_IP_REGEX.test(hostname) ||
    PRIVATE_10_IP_REGEX.test(hostname) ||
    PRIVATE_172_IP_REGEX.test(hostname) ||
    PRIVATE_192_IP_REGEX.test(hostname)
  );
}

/**
 * Extracts and sanitizes the request protocol.
 */
export function extractSafeProtocol(req: NextRequest): string {
  const rawProto =
    req.headers.get("x-forwarded-proto") ??
    req.nextUrl?.protocol?.replace(":", "") ??
    "http";
  const lowerProto = rawProto.toLowerCase();
  return ["http", "https"].includes(lowerProto) ? lowerProto : "https";
}

/**
 * Validates and sanitizes the Host header from the request against allowed origins.
 * Prevents Host Header Injection attacks that could hijack post-payment checkout redirects.
 */
export function resolveTrustedOrigin(req: NextRequest): string | undefined {
  const rawHost = req.headers.get("host")?.trim() || "";
  if (!rawHost || !isValidHostFormat(rawHost)) {
    return undefined;
  }

  const hostInfo = parseHostInfo(rawHost);
  if (!hostInfo) {
    return undefined;
  }

  const { hostWithPort, hostname, dummyUrl } = hostInfo;
  const baseUrlEnv = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL;
  const envAllowed = process.env.ALLOWED_HOSTS || process.env.ALLOWED_ORIGINS;

  const isTrusted =
    isLocalhost(hostname) ||
    isBaseUrl(hostWithPort, hostname, baseUrlEnv) ||
    isAllowedHost(hostWithPort, hostname, envAllowed) ||
    isTailscaleOrPrivate(hostname, baseUrlEnv);

  if (!isTrusted) {
    return undefined;
  }

  const safeProto = extractSafeProtocol(req);
  return `${safeProto}://${dummyUrl.host}`;
}

export const getTrustedOrigin = resolveTrustedOrigin;
export const getSafeOrigin = resolveTrustedOrigin;
