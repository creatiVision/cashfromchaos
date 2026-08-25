import { GET } from "../route";
import { NextRequest } from "next/server";
import { getItem, saveItem } from "@/lib/store";
import type { Item } from "@/lib/types";

// Mock stripe
const mockRetrieve = jest.fn();
jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        retrieve: mockRetrieve,
      },
    },
  }));
});

// Mock getOperator
jest.mock("@/lib/operator", () => ({
  getOperator: () => ({
    decideFulfillment: jest.fn().mockResolvedValue({
      mode: "shipping",
      carrier: "DHL",
      labelCost: 5,
      instruction: "Ship package",
    }),
  }),
}));

// Mock ensureSeeded so it doesn't run seedDemo with mocked operator
jest.mock("@/lib/store", () => {
  const original = jest.requireActual("@/lib/store");
  return {
    ...original,
    ensureSeeded: jest.fn().mockResolvedValue(undefined),
  };
});

function createDummyItem(id: string): Item {
  return {
    id,
    createdAt: Date.now(),
    status: "listed",
    intake: {
      clue: "Test item",
      photos: [],
    },
    analysis: {
      title: "Test Item",
      category: "Electronics",
      condition: "good",
      confidence: "high",
      detectedAttributes: {},
      rationale: [],
      missingInfo: [],
      flags: [],
      estimatedMarketLow: 80,
      estimatedMarketHigh: 120,
    },
    plan: {
      primary: { channelId: "ebay-de", name: "eBay Germany", feePct: 10, fitScore: 0.9, reason: "Good fit", shippingFriendly: true },
      alternates: [],
      bundleRecommended: false,
      strategy: [],
    },
    policy: {
      currency: "EUR",
      targetPrice: 100,
      floorPrice: 50,
      autoAcceptAtOrAbove: 90,
      autoCounterDownTo: 70,
      requireHumanBelow: 50,
      maxFulfillmentSpend: 20,
      allowedPaymentMethods: ["stripe"],
      allowedChannels: ["ebay-de"],
      shippingAllowed: true,
      pickupAllowed: true,
      suspiciousBuyerEscalation: false,
    },
    listings: [],
    messages: [],
    agentReplies: [],
    payment: {
      status: "pending",
      amount: 100,
      provider: "stripe",
    },
    fulfillment: undefined,
    ledger: [],
    trace: [],
  };
}

describe("GET /api/checkout/confirm", () => {
  const originalEnv = process.env;
  const testItemId = "test_item_123";

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.clearAllMocks();
    saveItem(createDummyItem(testItemId));
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns 400 if item parameter is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/checkout/confirm?session=sim_123");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Missing item");
  });

  it("returns 400 if session parameter is missing", async () => {
    const req = new NextRequest(`http://localhost:3000/api/checkout/confirm?item=${testItemId}`);
    const res = await GET(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Missing session");
  });

  it("returns 404 if item is not found", async () => {
    const req = new NextRequest("http://localhost:3000/api/checkout/confirm?item=non_existent&session=sim_non_existent");
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  describe("when Stripe is NOT configured (simulated/mock flow)", () => {
    beforeEach(() => {
      delete process.env.STRIPE_SECRET_KEY;
    });

    it("accepts valid sim session ID sim_{itemId}", async () => {
      const req = new NextRequest(`http://localhost:3000/api/checkout/confirm?item=${testItemId}&session=sim_${testItemId}`);
      const res = await GET(req);
      expect(res.status).toBe(307); // Redirect to market URL
      expect(res.headers.get("location")).toContain(`/market/${testItemId}?paid=1`);

      const updated = getItem(testItemId);
      expect(updated?.payment.status).toBe("held");
    });

    it("accepts valid pp session ID pp_{itemId}", async () => {
      const req = new NextRequest(`http://localhost:3000/api/checkout/confirm?item=${testItemId}&session=pp_${testItemId}&provider=paypal`);
      const res = await GET(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain(`/market/${testItemId}?paid=1`);

      const updated = getItem(testItemId);
      expect(updated?.payment.status).toBe("held");
    });

    it("rejects invalid session ID for item", async () => {
      const req = new NextRequest(`http://localhost:3000/api/checkout/confirm?item=${testItemId}&session=sim_wrong_item`);
      const res = await GET(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid simulated session");
    });
  });

  describe("when Stripe IS configured", () => {
    beforeEach(() => {
      process.env.STRIPE_SECRET_KEY = "sk_test_mock";
    });

    it("verifies paid Stripe session successfully", async () => {
      mockRetrieve.mockResolvedValueOnce({
        id: "cs_test_123",
        payment_status: "paid",
        metadata: { itemId: testItemId },
      });

      const req = new NextRequest(`http://localhost:3000/api/checkout/confirm?item=${testItemId}&session=cs_test_123`);
      const res = await GET(req);
      expect(mockRetrieve).toHaveBeenCalledWith("cs_test_123");
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain(`/market/${testItemId}?paid=1`);

      const updated = getItem(testItemId);
      expect(updated?.payment.status).toBe("held");
    });

    it("rejects unpaid Stripe session", async () => {
      mockRetrieve.mockResolvedValueOnce({
        id: "cs_test_123",
        payment_status: "unpaid",
        metadata: { itemId: testItemId },
      });

      const req = new NextRequest(`http://localhost:3000/api/checkout/confirm?item=${testItemId}&session=cs_test_123`);
      const res = await GET(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Payment not completed");
    });

    it("rejects Stripe session with mismatched itemId metadata", async () => {
      mockRetrieve.mockResolvedValueOnce({
        id: "cs_test_123",
        payment_status: "paid",
        metadata: { itemId: "other_item" },
      });

      const req = new NextRequest(`http://localhost:3000/api/checkout/confirm?item=${testItemId}&session=cs_test_123`);
      const res = await GET(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid session for this item");
    });

    it("handles Stripe API error gracefully", async () => {
      mockRetrieve.mockRejectedValueOnce(new Error("Stripe API connection failed"));

      const req = new NextRequest(`http://localhost:3000/api/checkout/confirm?item=${testItemId}&session=cs_test_invalid`);
      const res = await GET(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid Stripe session");
    });
  });
});
