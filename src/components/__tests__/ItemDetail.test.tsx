import { renderToString } from "react-dom/server";
import { ItemDetail } from "../ItemDetail";
import type { Item } from "@/lib/types";

describe("ItemDetail component", () => {
  const baseItem: Item = {
    id: "item_test_123",
    createdAt: Date.now(),
    intake: {
      clue: "Test pedal",
      photos: ["/img/pedal.svg"],
    },
    analysis: {
      title: "Vintage Guitar Pedal",
      category: "musical instruments / gear",
      detectedAttributes: { Type: "Overdrive" },
      condition: "like-new",
      confidence: "high",
      rationale: ["Good condition gear"],
      missingInfo: [],
      flags: [],
      estimatedMarketLow: 70,
      estimatedMarketHigh: 120,
    },
    plan: {
      primary: {
        channelId: "reverb-mock",
        name: "Reverb",
        fitScore: 0.9,
        reason: "Best for music gear",
        feePct: 5,
        shippingFriendly: true,
      },
      alternates: [],
      bundleRecommended: false,
      strategy: ["Lead on music gear channels"],
    },
    policy: {
      currency: "EUR",
      targetPrice: 100,
      floorPrice: 70,
      autoAcceptAtOrAbove: 95,
      autoCounterDownTo: 80,
      requireHumanBelow: 70,
      maxFulfillmentSpend: 8,
      allowedPaymentMethods: ["stripe"],
      allowedChannels: ["reverb-mock"],
      shippingAllowed: true,
      pickupAllowed: true,
      suspiciousBuyerEscalation: true,
    },
    listings: [
      {
        channelId: "reverb-mock",
        title: "Vintage Guitar Pedal",
        body: "Mint condition pedal",
        tags: ["pedal", "guitar"],
        price: 100,
        currency: "EUR",
      },
    ],
    status: "paid",
    messages: [],
    agentReplies: [],
    payment: {
      provider: "stripe",
      status: "held",
      amount: 100,
    },
    ledger: [
      { label: "Buyer payment (Reverb)", amount: 100, kind: "revenue" },
      { label: "Marketplace fee (5%)", amount: -5, kind: "fee" },
      { label: "Shipping label (Correos)", amount: -4.9, kind: "shipping" },
    ],
    trace: [
      { ts: Date.now(), actor: "seller", label: "Item submitted", level: "info" },
    ],
  };

  it("renders P&L net payout correctly using netPayout(item)", () => {
    const html = renderToString(<ItemDetail initial={baseItem} />);
    expect(html).toContain("Vintage Guitar Pedal");
    expect(html).toContain("Net to seller");
    // 100 - 5 - 4.9 = 90.10 EUR
    expect(html).toContain("90,10");
  });

  it("uses cached item.netPayout when already populated", () => {
    const cachedItem: Item = {
      ...baseItem,
      netPayout: 90.1,
    };
    const html = renderToString(<ItemDetail initial={cachedItem} />);
    expect(html).toContain("Net to seller");
    expect(html).toContain("90,10");
  });

  it("handles empty ledger in P&L tab gracefully", () => {
    const emptyItem: Item = {
      ...baseItem,
      ledger: [],
      netPayout: undefined,
    };
    const html = renderToString(<ItemDetail initial={emptyItem} />);
    expect(html).toContain("No financials yet — appears after payment.");
  });
});
