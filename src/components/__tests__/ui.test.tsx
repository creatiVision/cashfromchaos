import React from "react";
import { renderToString } from "react-dom/server";
import { StatusBadge, ConfidenceBadge, TraceList, Section } from "../ui";
import type { TransactionStatus, Confidence, TraceEvent } from "@/lib/types";

describe("UI Components (src/components/ui.tsx)", () => {
  describe("StatusBadge", () => {
    const statusMap: Record<TransactionStatus, { label: string; toneClass: string }> = {
      analyzed: { label: "Analyzed", toneClass: "text-muted border-edge" },
      listed: { label: "Listed", toneClass: "text-sky-600 border-sky-500/30 bg-sky-500/10" },
      "buyer-engaged": { label: "Buyer engaged", toneClass: "text-gold border-gold/30 bg-gold/10" },
      "offer-accepted": { label: "Offer accepted", toneClass: "text-gold border-gold/40 bg-gold/10" },
      paid: { label: "Paid", toneClass: "text-cash border-cash/40 bg-cash/10" },
      "shipping-required": { label: "Shipping required", toneClass: "text-orange-300 border-orange-500/30 bg-orange-500/10" },
      "in-transit": { label: "In transit", toneClass: "text-orange-300 border-orange-500/30 bg-orange-500/10" },
      delivered: { label: "Delivered", toneClass: "text-cash border-cash/40 bg-cash/10" },
      "payout-released": { label: "Payout released", toneClass: "text-cash border-cash/50 bg-cash/15" },
      escalated: { label: "Escalated", toneClass: "text-chaos border-chaos/40 bg-chaos/10" },
    };

    const statuses = Object.keys(statusMap) as TransactionStatus[];

    it.each(statuses)("renders status badge correctly for status '%s'", (status) => {
      const { label, toneClass } = statusMap[status];
      const html = renderToString(<StatusBadge status={status} />);

      expect(html).toContain(label);
      expect(html).toContain(toneClass);
      expect(html).toContain("chip");
    });
  });

  describe("ConfidenceBadge", () => {
    const confidenceMap: Record<Confidence, string> = {
      high: "text-cash border-cash/40",
      "medium-high": "text-gold border-gold/40",
      medium: "text-gold/80 border-gold/30",
      low: "text-chaos border-chaos/40",
    };

    const confidences = Object.keys(confidenceMap) as Confidence[];

    it.each(confidences)("renders confidence badge correctly for level '%s'", (value) => {
      const tone = confidenceMap[value];
      const html = renderToString(<ConfidenceBadge value={value} />);

      expect(html).toContain("confidence:");
      expect(html).toContain(value);
      expect(html).toContain(tone);
      expect(html).toContain("chip");
    });
  });

  describe("TraceList", () => {
    it("renders trace events with correct actors, labels, details, and level dot styling", () => {
      const events: TraceEvent[] = [
        {
          ts: 1000,
          actor: "operator",
          label: "Analyzed item photo",
          detail: "Detected guitar pedal in good condition",
          level: "info",
        },
        {
          ts: 2000,
          actor: "buyer",
          label: "Submitted offer",
          detail: "Offered €75",
          level: "money",
        },
        {
          ts: 3000,
          actor: "seller",
          label: "Approved counteroffer",
          level: "decision",
        },
        {
          ts: 4000,
          actor: "system",
          label: "Warning event",
          level: "warn",
        },
        {
          ts: 5000,
          actor: "stripe",
          label: "Payment captured",
        },
      ];

      const html = renderToString(<TraceList events={events} />);

      // Actors
      expect(html).toContain("operator");
      expect(html).toContain("buyer");
      expect(html).toContain("seller");
      expect(html).toContain("system");
      expect(html).toContain("stripe");

      // Labels
      expect(html).toContain("Analyzed item photo");
      expect(html).toContain("Submitted offer");
      expect(html).toContain("Approved counteroffer");
      expect(html).toContain("Warning event");
      expect(html).toContain("Payment captured");

      // Details
      expect(html).toContain("Detected guitar pedal in good condition");
      expect(html).toContain("Offered €75");

      // Level dot styles
      expect(html).toContain("bg-muted");
      expect(html).toContain("bg-gold");
      expect(html).toContain("bg-cash");
      expect(html).toContain("bg-chaos");

      // Actor tones
      expect(html).toContain("text-cash");
      expect(html).toContain("text-gold");
      expect(html).toContain("text-sky-600");
      expect(html).toContain("text-muted");
      expect(html).toContain("text-[#635bff]");
    });

    it("defaults missing level to 'info'", () => {
      const events: TraceEvent[] = [
        {
          ts: 1000,
          actor: "system",
          label: "No level event",
        },
      ];

      const html = renderToString(<TraceList events={events} />);
      expect(html).toContain("bg-muted");
    });
  });

  describe("Section", () => {
    it("renders title, children, and optional right header content", () => {
      const html = renderToString(
        <Section title="Transaction Details" right={<button>Edit</button>}>
          <p>Section body content</p>
        </Section>
      );

      expect(html).toContain("Transaction Details");
      expect(html).toContain("<button>Edit</button>");
      expect(html).toContain("<p>Section body content</p>");
      expect(html).toContain("panel");
    });

    it("renders section without right header when right prop is omitted", () => {
      const html = renderToString(
        <Section title="Simple Section">
          <div>Simple body</div>
        </Section>
      );

      expect(html).toContain("Simple Section");
      expect(html).toContain("<div>Simple body</div>");
    });
  });
});
