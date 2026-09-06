import { netPayout } from "@/lib/payments";
import { Item } from "@/lib/types";

function calculateDashboardStats(items: Item[]) {
  return items.reduce(
    (acc, item) => {
      if (item.status !== "payout-released") {
        acc.live += 1;
      }
      if (item.payment.status === "released") {
        acc.earned += netPayout(item);
      } else {
        acc.pipeline += item.payment.amount || item.policy.targetPrice;
      }
      return acc;
    },
    { live: 0, earned: 0, pipeline: 0 }
  );
}

describe("Dashboard calculation logic", () => {
  it("correctly computes live, earned, and pipeline in a single pass", () => {
    const mockItems: Item[] = [
      ({
        id: "1",
        status: "active",
        payment: { provider: "stripe", status: "released", amount: 200 },
        policy: {
          currency: "EUR",
          floorPrice: 100,
          targetPrice: 200,
          autoAcceptAtOrAbove: 200,
          autoCounterDownTo: 150,
          requireHumanBelow: 100,
          hardFloor: 90,
          maxDiscountPercent: 20,
          shippingPolicy: "seller-pays",
          allowBundleDiscount: false,
        },
        fee: 20,
        ledger: [
          { at: 1, type: "gross", amount: 200, note: "" },
          { at: 2, type: "fee", amount: -20, note: "" },
        ],
      } as unknown) as Item,
      ({
        id: "2",
        status: "payout-released",
        payment: { provider: "stripe", status: "released", amount: 150 },
        policy: {
          currency: "EUR",
          floorPrice: 80,
          targetPrice: 150,
          autoAcceptAtOrAbove: 150,
          autoCounterDownTo: 100,
          requireHumanBelow: 80,
          hardFloor: 70,
          maxDiscountPercent: 20,
          shippingPolicy: "seller-pays",
          allowBundleDiscount: false,
        },
        fee: 15,
        ledger: [
          { at: 1, type: "gross", amount: 150, note: "" },
          { at: 2, type: "fee", amount: -15, note: "" },
        ],
      } as unknown) as Item,
      ({
        id: "3",
        status: "negotiating",
        payment: { provider: "stripe", status: "pending", amount: 0 },
        policy: {
          currency: "EUR",
          floorPrice: 50,
          targetPrice: 100,
          autoAcceptAtOrAbove: 100,
          autoCounterDownTo: 75,
          requireHumanBelow: 50,
          hardFloor: 40,
          maxDiscountPercent: 20,
          shippingPolicy: "seller-pays",
          allowBundleDiscount: false,
        },
        fee: 10,
        ledger: [],
      } as unknown) as Item,
    ];

    const { live, earned, pipeline } = calculateDashboardStats(mockItems);

    // live: items with status !== 'payout-released' (item 1 and 3) -> 2
    expect(live).toBe(2);

    // earned: items with payment.status === 'released' (item 1: 180, item 2: 135) -> 315
    expect(earned).toBe(315);

    // pipeline: items with payment.status !== 'released' (item 3: payment.amount || targetPrice = 100) -> 100
    expect(pipeline).toBe(100);
  });

  it("handles empty array correctly", () => {
    const stats = calculateDashboardStats([]);
    expect(stats).toEqual({ live: 0, earned: 0, pipeline: 0 });
  });
});
