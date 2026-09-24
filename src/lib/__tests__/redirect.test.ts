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

  describe("untrusted or malicious URLs", () => {
    it("rejects non-http/https protocols", () => {
      expect(isSafeRedirectUrl("javascript:alert(1)")).toBe(false);
      expect(isSafeRedirectUrl("data:text/html,<script>alert(1)</script>")).toBe(
        false
      );
      expect(isSafeRedirectUrl("file:///etc/passwd")).toBe(false);
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
      expect(isSafeRedirectUrl(null as unknown as string)).toBe(false);
      expect(isSafeRedirectUrl(undefined as unknown as string)).toBe(false);
      expect(isSafeRedirectUrl("not a valid url")).toBe(false);
    });
  });
});
