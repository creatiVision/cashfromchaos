/**
 * Allowed payment domains / hosts for checkout redirects.
 */
const TRUSTED_PAYMENT_HOSTS = [
  "checkout.stripe.com",
  "stripe.com",
  "paypal.com",
  "www.paypal.com",
  "sandbox.paypal.com",
];

/**
 * Validates if a target URL is safe to redirect to.
 * Protects against Open Redirect vulnerabilities (e.g. javascript: URIs, protocol-relative // URLs,
 * untrusted third-party domains).
 */
export function isSafeRedirectUrl(
  targetUrl: string,
  currentOrigin?: string
): boolean {
  if (!targetUrl || typeof targetUrl !== "string") {
    return false;
  }

  const trimmed = targetUrl.trim();

  // Allow relative URLs starting with '/' but NOT '//' (which are protocol-relative URLs)
  if (trimmed.startsWith("/")) {
    return !trimmed.startsWith("//") && !trimmed.startsWith("/\\");
  }

  try {
    const parsed = new URL(trimmed);

    // Protocol must be http or https
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    const targetHostname = parsed.hostname.toLowerCase();

    // Check same origin if currentOrigin / window.location.origin is available
    const effectiveOrigin =
      currentOrigin ||
      (typeof window !== "undefined" ? window.location.origin : undefined);

    if (effectiveOrigin) {
      try {
        const originUrl = new URL(effectiveOrigin);
        if (parsed.origin.toLowerCase() === originUrl.origin.toLowerCase()) {
          return true;
        }
      } catch {
        // Invalid origin passed
      }
    }

    // Check NEXT_PUBLIC_BASE_URL if set
    if (process.env.NEXT_PUBLIC_BASE_URL) {
      try {
        const baseUrl = new URL(
          process.env.NEXT_PUBLIC_BASE_URL.startsWith("http")
            ? process.env.NEXT_PUBLIC_BASE_URL
            : `https://${process.env.NEXT_PUBLIC_BASE_URL}`
        );
        if (parsed.origin.toLowerCase() === baseUrl.origin.toLowerCase()) {
          return true;
        }
      } catch {
        // Invalid NEXT_PUBLIC_BASE_URL
      }
    }

    // Check if hostname matches or ends with a trusted payment domain (e.g. checkout.stripe.com)
    for (const host of TRUSTED_PAYMENT_HOSTS) {
      if (
        targetHostname === host ||
        targetHostname.endsWith("." + host)
      ) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}
