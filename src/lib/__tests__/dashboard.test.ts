import { calculateDashboardStats } from "../dashboard";
import { Item } from "../types";

function createMockItem(overrides?: Partial<Item>): Item {
  return {
    id: "item_1",
    createdAt: Date.now(),
    intake: { clue: "test", photos: [] },
    analysis: {
      title: "Test Item",
      category: "Electronics",
      detectedAttributes: {},
      condition: "good",
      confidence: "high",
      rationale: [],
      missingInfo: [],
      flags: [],
      estimatedMarketLow: 10,
      estimatedMarketHigh: 20,
    },
    plan: {
      primary: {
        channelId: "ebay-de",
        name: "eBay DE",
        fitScore: 0.9,
        reason: "good fit",
        feePct: 10,
        shippingFriendly: true,
      },
      alternates: [],
      bundleRecommended: false,
      strategy: [],
    },
    policy: {
      currency: "EUR",
      targetPrice: 50,
      floorPrice: 40,
      autoAcceptAtOrAbove: 45,
      autoCounterDownTo: 42,
      requireHumanBelow: 40,
      maxFulfillmentSpend: 10,
      allowedPaymentMethods: ["card"],
      allowedChannels: ["ebay-de"],
      shippingAllowed: true,
      pickupAllowed: true,
      suspiciousBuyerEscalation: false,
    },
    listings: [],
    status: "listed",
    messages: [],
    agentReplies: [],
    payment: {
      provider: "simulated",
      status: "none",
      amount: 0,
    },
    ledger: [],
    trace: [],
    ...overrides,
  };
}

describe("calculateDashboardStats", () => {
  it("calculates live, earned, and pipeline stats correctly", () => {
    const items: Item[] = [
      createMockItem({
        status: "listed",
        payment: { provider: "simulated", status: "none", amount: 0 },
        policy: { currency: "EUR", targetPrice: 100 } as any,
      }),
      createMockItem({
        status: "payout-released",
        payment: { provider: "simulated", status: "released", amount: 150 },
        ledger: [
          { label: "Buyer payment", amount: 150, kind: "revenue" },
          { label: "Marketplace fee", amount: -15, kind: "fee" },
          { label: "Shipping label", amount: -5, kind: "shipping" },
        ],
      }),
      createMockItem({
        status: "buyer-engaged",
        payment: { provider: "simulated", status: "held", amount: 80 },
      }),
    ];

    const stats = calculateDashboardStats(items);
    expect(stats.live).toBe(2); // items[0] and items[2]
    expect(stats.earned).toBe(130); // 150 - 15 - 5
    expect(stats.pipeline).toBe(180); // items[0]: 100 (targetPrice), items[2]: 80 (amount)
  });

  it("handles empty items list", () => {
    expect(calculateDashboardStats([])).toEqual({
      live: 0,
      earned: 0,
      pipeline: 0,
    });
  });

  it("benchmark calculation speed", () => {
    // Generate 10,000 items with ledger entries
    const items: Item[] = Array.from({ length: 10000 }, (_, i) => {
      const isReleased = i % 2 === 0;
      const isPayoutReleased = i % 3 === 0;
      return createMockItem({
        id: `item_${i}`,
        status: isPayoutReleased ? "payout-released" : "listed",
        payment: {
          provider: "simulated",
          status: isReleased ? "released" : "held",
          amount: 100,
        },
        policy: { currency: "EUR", targetPrice: 100 } as any,
        ledger: isReleased
          ? [
              { label: "Revenue", amount: 100, kind: "revenue" },
              { label: "Fee", amount: -10, kind: "fee" },
              { label: "Shipping", amount: -5, kind: "shipping" },
            ]
          : [],
      });
    });

    const warmup = calculateDashboardStats(items);
    expect(warmup.live).toBeGreaterThan(0);

    const iterations = 500;
    const start = performance.now();
    for (let iter = 0; iter < iterations; iter++) {
      calculateDashboardStats(items);
    }
    const durationMs = performance.now() - start;
    console.log(
      `Benchmark (10,000 items x 500 runs): ${durationMs.toFixed(2)}ms (${(
        (iterations / durationMs) *
        1000
      ).toFixed(0)} ops/sec)`
    );
  });
});
