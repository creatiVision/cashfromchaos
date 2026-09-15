import React from "react";
import { renderToString } from "react-dom/server";
import { Timeline } from "../Timeline";
import type { TransactionStatus } from "@/lib/types";

describe("Timeline component", () => {
  const allStatuses: { status: TransactionStatus; expectedActiveIndex: number }[] = [
    { status: "analyzed", expectedActiveIndex: 0 },
    { status: "listed", expectedActiveIndex: 1 },
    { status: "buyer-engaged", expectedActiveIndex: 2 },
    { status: "offer-accepted", expectedActiveIndex: 3 },
    { status: "paid", expectedActiveIndex: 4 },
    { status: "shipping-required", expectedActiveIndex: 5 },
    { status: "in-transit", expectedActiveIndex: 6 },
    { status: "delivered", expectedActiveIndex: 7 },
    { status: "payout-released", expectedActiveIndex: 8 },
  ];

  it.each(allStatuses)(
    "renders correctly for status '$status' with active step index $expectedActiveIndex",
    ({ status, expectedActiveIndex }) => {
      const html = renderToString(<Timeline status={status} />);

      // Verify rendered step labels
      expect(html).toContain("Analyzed");
      expect(html).toContain("Listed");
      expect(html).toContain("Buyer engaged");
      expect(html).toContain("Offer accepted");
      expect(html).toContain("Paid");
      expect(html).toContain("Fulfillment");
      expect(html).toContain("In transit");
      expect(html).toContain("Delivered");
      expect(html).toContain("Payout");

      // Verify the number of checkmarks (done steps)
      const checkmarkMatches = html.match(/✓/g);
      const expectedDoneCount = expectedActiveIndex * 2; // rendered in both mobile (<ol>) and desktop (<ol>)
      if (expectedDoneCount === 0) {
        expect(checkmarkMatches).toBeNull();
      } else {
        expect(checkmarkMatches?.length).toBe(expectedDoneCount);
      }

      // Verify active step animation styling
      expect(html).toContain("animate-pulseline");
    }
  );

  it("handles 'escalated' status by placing active step at index 2 (buyer-engaged)", () => {
    const html = renderToString(<Timeline status="escalated" />);

    // 'escalated' forces active index to 2 ('buyer-engaged')
    // Therefore 2 steps before index 2 (indices 0 and 1) are done in both mobile and desktop lists -> 4 checkmarks
    const checkmarkMatches = html.match(/✓/g);
    expect(checkmarkMatches?.length).toBe(4);
    expect(html).toContain("Buyer engaged");
  });

  it("handles unknown/unrecognized status gracefully by defaulting active step to index 1 (listed)", () => {
    const html = renderToString(<Timeline status={"unknown-status" as TransactionStatus} />);

    // Unknown status has indexOf = -1, which is reset to current = 1 ('listed')
    // Index 0 ('analyzed') is done in both mobile and desktop lists -> 2 checkmarks
    const checkmarkMatches = html.match(/✓/g);
    expect(checkmarkMatches?.length).toBe(2);
    expect(html).toContain("Listed");
  });
});
