import { renderToString } from "react-dom/server";
import { BuyerListing } from "../BuyerListing";
import type { Item } from "@/lib/types";
import { eur } from "@/lib/money";
import { isSafeRedirectUrl } from "@/lib/redirect";

const mockItem: Item = {
  id: "test-item-1",
  createdAt: 1735689600000,
  status: "listed",
  intake: {
    clue: "Vintage camera",
    photos: ["https://example.com/photo.jpg"],
    notes: "Sample item",
    answers: {},
  },
  analysis: {
    title: "Test Vintage Camera",
    category: "Electronics",
    condition: "good",
    confidence: "high",
    detectedAttributes: { Brand: "Leica" },
    estimatedMarketLow: 100,
    estimatedMarketHigh: 200,
    rationale: ["Well maintained"],
    missingInfo: [],
    flags: [],
  },
  plan: {
    primary: {
      channelId: "ebay",
      name: "eBay",
      fitScore: 0.9,
      feePct: 10,
      reason: "High demand",
      shippingFriendly: true,
    },
    alternates: [],
    bundleRecommended: false,
    strategy: ["List at target price"],
  },
  listings: [
    {
      channelId: "ebay",
      title: "Test Vintage Camera",
      body: "Great vintage camera in good condition.",
      price: 150,
      currency: "EUR",
      tags: ["camera", "vintage"],
    },
  ],
  policy: {
    currency: "EUR",
    targetPrice: 150,
    floorPrice: 100,
    autoAcceptAtOrAbove: 140,
    autoCounterDownTo: 110,
    requireHumanBelow: 100,
    maxFulfillmentSpend: 20,
    shippingAllowed: true,
    pickupAllowed: false,
    allowedPaymentMethods: ["stripe"],
    allowedChannels: ["ebay"],
    suspiciousBuyerEscalation: true,
  },
  messages: [
    {
      itemId: "test-item-1",
      buyerName: "Buyer 1",
      text: "Would you take €120?",
      ts: 1735689600000,
    },
  ],
  agentReplies: [
    {
      reply: "I can do €130.",
      decision: "counter",
      reason: "Above floor price",
      dealAgreed: false,
    },
  ],
  payment: {
    provider: "simulated",
    status: "none",
    amount: 0,
  },
  fulfillment: undefined,
  ledger: [],
  trace: [],
};

describe("BuyerListing component", () => {
  it("renders item title, price, description, and chat history", () => {
    const html = renderToString(<BuyerListing initial={mockItem} paid={false} />);

    expect(html).toContain("Test Vintage Camera");
    expect(html).toContain("Great vintage camera in good condition.");
    expect(html).toContain("camera");
    expect(html).toContain("vintage");
    expect(html).toContain("Hermes (seller’s agent)");
    expect(html).toContain("Would you take €120?");
    expect(html).toContain("I can do €130.");
    expect(html).toContain("Hermes");
    expect(html).toContain("counter");
  });

  it("renders input panel with suggested questions when deal is not agreed and not paid", () => {
    const html = renderToString(<BuyerListing initial={mockItem} paid={false} />);

    expect(html).toContain("Would you take €50?");
    expect(html).toContain("Does it work?");
    expect(html).toContain("Can you ship it?");
    expect(html).toContain("Make an offer or ask…");
    expect(html).toContain("Send");
  });

  it("renders deal agreed panel when offer-accepted status and payment amount present", () => {
    const agreedItem: Item = {
      ...mockItem,
      status: "offer-accepted",
      payment: {
        ...mockItem.payment,
        amount: 130,
      },
    };

    const html = renderToString(<BuyerListing initial={agreedItem} paid={false} />);

    expect(html).toContain("Deal agreed at");
    expect(html).toContain(eur(130));
    expect(html).toContain("Pay");
    expect(html).toContain("with Stripe →");
  });

  it("renders paid status panel when paid prop is true or payment status is held/released", () => {
    const paidItem: Item = {
      ...mockItem,
      payment: {
        ...mockItem.payment,
        status: "held",
        amount: 130,
      },
    };

    const html = renderToString(<BuyerListing initial={paidItem} paid={true} />);

    expect(html).toContain("✓ Paid · ");
    expect(html).toContain(eur(130));
    expect(html).toContain("held");
    expect(html).toContain("Funds released on delivery.");
    expect(html).toContain("operation page");
  });

  describe("checkout redirect validation", () => {
    it("validates trusted checkout URLs before redirecting", () => {
      const trustedStripeUrl = "https://checkout.stripe.com/pay/cs_test_12345";
      const trustedRelativeUrl = "/api/checkout/confirm?itemId=test-item-1";
      const trustedPaypalUrl = "https://www.paypal.com/checkoutnow?token=EC-12345";

      expect(isSafeRedirectUrl(trustedStripeUrl)).toBe(true);
      expect(isSafeRedirectUrl(trustedRelativeUrl)).toBe(true);
      expect(isSafeRedirectUrl(trustedPaypalUrl)).toBe(true);
    });

    it("rejects malicious or open redirect attempt URLs", () => {
      const maliciousUrl = "https://evil-phishing-site.com/steal-creds";
      const protocolRelativeUrl = "//evil.com";
      const javascriptUrl = "javascript:alert('xss')";

      expect(isSafeRedirectUrl(maliciousUrl)).toBe(false);
      expect(isSafeRedirectUrl(protocolRelativeUrl)).toBe(false);
      expect(isSafeRedirectUrl(javascriptUrl)).toBe(false);
    });
  });

  it("throws error on unsafe checkout redirect URL during payment", async () => {
    const agreedItem: Item = {
      ...mockItem,
      status: "offer-accepted",
      payment: {
        ...mockItem.payment,
        amount: 130,
      },
    };

    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: "https://evil.com/phishing" }),
    } as Response);

    try {
      const res = await global.fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      const { isSafeRedirectUrl } = await import("@/lib/redirect");

      expect(() => {
        if (data.url && !isSafeRedirectUrl(data.url)) {
          throw new Error(`Untrusted or unsafe checkout redirect URL: ${data.url}`);
        }
      }).toThrow("Untrusted or unsafe checkout redirect URL: https://evil.com/phishing");
    } finally {
      global.fetch = originalFetch;
    }
  });
});
