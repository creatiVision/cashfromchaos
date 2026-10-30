import { isSafeRedirectUrl } from "../redirect";

describe("isSafeRedirectUrl", () => {
  const originalEnv = process.env.NEXT_PUBLIC_BASE_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_BASE_URL = originalEnv;
  });

  describe("relative URLs", () => {
    it("allows valid relative URLs", () => {
      expect(isSafeRedirectUrl("/market")).toBe(true);
      expect(isSafeRedirectUrl("/api/checkout/confirm?item=123")).toBe(true);
    });

    it("rejects protocol-relative URLs starting with //", () => {
      expect(isSafeRedirectUrl("//evil.com")).toBe(false);
      expect(isSafeRedirectUrl("//evil.com/phishing")).toBe(false);
    });

    it("rejects backslash protocol-relative URLs starting with /\\", () => {
      expect(isSafeRedirectUrl("/\\evil.com")).toBe(false);
    });
  });

  describe("same-origin URLs", () => {
    it("allows URLs matching currentOrigin argument", () => {
      expect(
        isSafeRedirectUrl(
          "http://localhost:3000/api/checkout/confirm",
          "http://localhost:3000"
        )
      ).toBe(true);
    });

    it("allows URLs matching NEXT_PUBLIC_BASE_URL", () => {
      process.env.NEXT_PUBLIC_BASE_URL = "https://marketplace.example.com";
      expect(
        isSafeRedirectUrl(
          "https://marketplace.example.com/api/checkout/confirm?item=demo"
        )
      ).toBe(true);
    });

    it("allows URLs matching NEXT_PUBLIC_BASE_URL without protocol prefix", () => {
      process.env.NEXT_PUBLIC_BASE_URL = "marketplace.example.com";
      expect(
        isSafeRedirectUrl(
          "https://marketplace.example.com/api/checkout/confirm?item=demo"
        )
      ).toBe(true);
    });

    it("handles window.location.origin fallback when window is defined", () => {
      const originalWindow = (global as unknown as { window?: unknown }).window;
      (global as unknown as { window: unknown }).window = {
        location: { origin: "https://my-app.com" },
      };

      try {
        expect(
          isSafeRedirectUrl("https://my-app.com/checkout/success")
        ).toBe(true);
        expect(
          isSafeRedirectUrl("https://evil.com/checkout/success")
        ).toBe(false);
      } finally {
        if (originalWindow === undefined) {
          delete (global as unknown as { window?: unknown }).window;
        } else {
          (global as unknown as { window: unknown }).window = originalWindow;
        }
      }
    });

    it("handles invalid currentOrigin argument gracefully", () => {
      expect(
        isSafeRedirectUrl(
          "https://checkout.stripe.com/pay/cs_test_12345",
          "://invalid-origin"
        )
      ).toBe(true);

      expect(
        isSafeRedirectUrl(
          "https://evil.com/phishing",
          "://invalid-origin"
        )
      ).toBe(false);
    });

    it("handles invalid NEXT_PUBLIC_BASE_URL gracefully", () => {
      process.env.NEXT_PUBLIC_BASE_URL = "http://:";
      expect(
        isSafeRedirectUrl("https://checkout.stripe.com/pay/cs_test_12345")
      ).toBe(true);

      expect(
        isSafeRedirectUrl("https://evil.com/phishing")
      ).toBe(false);
    });
  });

  describe("trusted payment provider domains", () => {
    it("allows Stripe checkout URLs", () => {
      expect(
        isSafeRedirectUrl("https://checkout.stripe.com/pay/cs_test_12345")
      ).toBe(true);
      expect(
        isSafeRedirectUrl("https://stripe.com/checkout/pay/cs_test_12345")
      ).toBe(true);
    });

    it("allows PayPal checkout URLs", () => {
      expect(
        isSafeRedirectUrl("https://www.paypal.com/checkoutnow?token=EC-12345")
      ).toBe(true);
      expect(
        isSafeRedirectUrl("https://sandbox.paypal.com/checkoutnow?token=EC-12345")
      ).toBe(true);
    });
  });

  describe("untrusted or malicious URLs and error conditions", () => {
    it("rejects non-http/https protocols", () => {
      expect(isSafeRedirectUrl("javascript:alert(1)")).toBe(false);
      expect(isSafeRedirectUrl("data:text/html,<script>alert(1)</script>")).toBe(
        false
      );
      expect(isSafeRedirectUrl("file:///etc/passwd")).toBe(false);
      expect(isSafeRedirectUrl("blob:https://example.com/uuid")).toBe(false);
      expect(isSafeRedirectUrl("ws://example.com/socket")).toBe(false);
      expect(isSafeRedirectUrl("wss://example.com/socket")).toBe(false);
      expect(isSafeRedirectUrl("about:blank")).toBe(false);
      expect(isSafeRedirectUrl("vbscript:msgbox(1)")).toBe(false);
    });

    it("rejects untrusted external domains", () => {
      expect(isSafeRedirectUrl("https://evil.com")).toBe(false);
      expect(isSafeRedirectUrl("https://phishing-site.com/login")).toBe(false);
    });

    it("rejects domain spoofing / prefix-suffix attack attempts", () => {
      expect(
        isSafeRedirectUrl("https://checkout.stripe.com.attacker.com/pay")
      ).toBe(false);
      expect(isSafeRedirectUrl("https://notstripe.com")).toBe(false);
      expect(isSafeRedirectUrl("https://paypal.com.evil.com")).toBe(false);
    });

    it("handles null, empty or invalid strings gracefully", () => {
      expect(isSafeRedirectUrl("")).toBe(false);
      expect(isSafeRedirectUrl("   ")).toBe(false);
      expect(isSafeRedirectUrl(null as unknown as string)).toBe(false);
      expect(isSafeRedirectUrl(undefined as unknown as string)).toBe(false);
      expect(isSafeRedirectUrl("not a valid url")).toBe(false);
    });

    it("handles non-string types safely", () => {
      expect(isSafeRedirectUrl(12345 as unknown as string)).toBe(false);
      expect(isSafeRedirectUrl(true as unknown as string)).toBe(false);
      expect(isSafeRedirectUrl({ url: "https://stripe.com" } as unknown as string)).toBe(false);
      expect(isSafeRedirectUrl(["https://stripe.com"] as unknown as string)).toBe(false);
      expect(isSafeRedirectUrl(Symbol("url") as unknown as string)).toBe(false);
    });

    it("returns false for malformed URLs that cause URL constructor to throw", () => {
      expect(isSafeRedirectUrl("://invalid-url")).toBe(false);
      expect(isSafeRedirectUrl("http://")).toBe(false);
      expect(isSafeRedirectUrl("https://")).toBe(false);
      expect(isSafeRedirectUrl("http://:")).toBe(false);
      expect(isSafeRedirectUrl("http://[invalid-ipv6]")).toBe(false);
      expect(isSafeRedirectUrl("https://example.com:abc")).toBe(false);
      expect(isSafeRedirectUrl("http://example.com:70000")).toBe(false);
      expect(isSafeRedirectUrl("http://user:pass@")).toBe(false);
      expect(isSafeRedirectUrl("http://%80")).toBe(false);
    });
  });
});
