import { FixtureBrain } from "../fixtureBrain";
import type { Item, CommercePolicy, ItemAnalysis, MarketplacePlan, BuyerMessage } from "@/lib/types";

describe("FixtureBrain - handleBuyerMessage negotiation state machine", () => {
  let brain: FixtureBrain;
  let baseItem: Item;

  beforeEach(() => {
    brain = new FixtureBrain();

    const analysis: ItemAnalysis = {
      title: "Fender Stratocaster",
      category: "Guitars",
      detectedAttributes: { color: "Sunburst" },
      condition: "good",
      confidence: "high",
      rationale: ["Solid condition"],
      missingInfo: [],
      flags: [],
      estimatedMarketLow: 100,
      estimatedMarketHigh: 200,
      fulfillment: "either",
    };

    const plan: MarketplacePlan = {
      primary: {
        channelId: "ebay-de-mock",
        name: "eBay DE Mock",
        fitScore: 0.9,
        reason: "Good channel",
        feePct: 10,
        shippingFriendly: true,
      },
      alternates: [],
      bundleRecommended: false,
      strategy: ["Sell fast"],
    };

    const policy: CommercePolicy = {
      currency: "EUR",
      targetPrice: 150,
      floorPrice: 100,
      autoAcceptAtOrAbove: 140,
      autoCounterDownTo: 110,
      requireHumanBelow: 100,
      maxFulfillmentSpend: 8,
      allowedPaymentMethods: ["stripe"],
      allowedChannels: ["ebay-de-mock"],
      shippingAllowed: true,
      pickupAllowed: true,
      suspiciousBuyerEscalation: true,
    };

    baseItem = {
      id: "item-123",
      createdAt: Date.now(),
      intake: { clue: "Guitar", photos: [] },
      analysis,
      plan,
      policy,
      listings: [],
      status: "buyer-engaged",
      messages: [],
      agentReplies: [],
      payment: { provider: "stripe", status: "none", amount: 150 },
      ledger: [],
      trace: [],
    };
  });

  describe("Scam / off-platform / overpayment detection", () => {
    it("should escalate to human when scam or off-platform keywords are detected", async () => {
      const scamKeywords = [
        "Can I pay via whatsapp?",
        "Will pay with western union",
        "Send money via bizum to my friend",
        "Paypal friends and family only",
        "I will send a gift card",
        "Wire transfer to account",
        "Click this link to receive payment",
        "The shipping company I use will pick it up",
        "I will overpay you by $50",
        "I'll pay with a cashier's cheque",
        "Send extra cash with the item",
        "I will pay you more than asking price",
        "An agent will collect the parcel",
      ];

      for (const text of scamKeywords) {
        const msg: BuyerMessage = { itemId: "item-123", buyerName: "Scammer", text, ts: Date.now() };
        const reply = await brain.handleBuyerMessage(baseItem, msg);
        expect(reply.decision).toBe("escalate-human");
        expect(reply.dealAgreed).toBe(false);
        expect(reply.reply).toContain("on-platform");
      }
    });
  });

  describe("Personal info extraction prevention", () => {
    it("should withhold contact details and explain privacy policy", async () => {
      const probingTexts = [
        "What is your address?",
        "Where do you live?",
        "Give me your home address",
        "Can I have your phone number?",
        "Contact me on instagram",
        "What is your email?",
        "Send your post code or zip code",
        "Can I meet at your place?",
        "What is your full name or real name?",
        "Tell me your exact location",
      ];

      for (const text of probingTexts) {
        const msg: BuyerMessage = { itemId: "item-123", buyerName: "Buyer", text, ts: Date.now() };
        const reply = await brain.handleBuyerMessage(baseItem, msg);
        expect(reply.decision).toBe("answer");
        expect(reply.dealAgreed).toBe(false);
        expect(reply.reply).toContain("I don't share the seller's address or personal contact");
      }
    });

    it("should escalate if whatsapp is mentioned (scam check takes priority)", async () => {
      const msg: BuyerMessage = { itemId: "item-123", buyerName: "Buyer", text: "Contact me on whatsapp", ts: Date.now() };
      const reply = await brain.handleBuyerMessage(baseItem, msg);
      expect(reply.decision).toBe("escalate-human");
    });
  });

  describe("Fulfillment restrictions", () => {
    it("should decline shipping if item policy prohibits shipping", async () => {
      baseItem.policy.shippingAllowed = false;
      const msg: BuyerMessage = { itemId: "item-123", buyerName: "Buyer", text: "Can you ship it to me?", ts: Date.now() };
      const reply = await brain.handleBuyerMessage(baseItem, msg);
      expect(reply.decision).toBe("answer");
      expect(reply.dealAgreed).toBe(false);
      expect(reply.reply).toContain("local pickup only");
    });

    it("should not trigger shipping restriction if shipping is allowed", async () => {
      baseItem.policy.shippingAllowed = true;
      const msg: BuyerMessage = { itemId: "item-123", buyerName: "Buyer", text: "Can you ship it to me?", ts: Date.now() };
      const reply = await brain.handleBuyerMessage(baseItem, msg);
      expect(reply.decision).toBe("answer");
      expect(reply.reply).not.toContain("local pickup only");
    });
  });

  describe("Manipulation / urgency tactics without concrete offer", () => {
    it("should refuse manipulation tactics when no offer is present", async () => {
      const manipulativeTexts = [
        "Trust me I will pay tomorrow",
        "Send it first and I will pay after",
        "Ship before payment please",
        "Reserve it for me",
        "I'm broke and this is for my sick kid",
        "Emergency, give it to me for free for charity",
      ];

      for (const text of manipulativeTexts) {
        const msg: BuyerMessage = { itemId: "item-123", buyerName: "Buyer", text, ts: Date.now() };
        const reply = await brain.handleBuyerMessage(baseItem, msg);
        expect(reply.decision).toBe("answer");
        expect(reply.dealAgreed).toBe(false);
        expect(reply.reply).toContain("terms are firm");
      }
    });

    it("should proceed to offer evaluation if a manipulation text contains a concrete offer", async () => {
      const msg: BuyerMessage = { itemId: "item-123", buyerName: "Buyer", text: "Trust me I can offer 145€", offer: 145, ts: Date.now() };
      const reply = await brain.handleBuyerMessage(baseItem, msg);
      expect(reply.decision).toBe("accept");
    });
  });

  describe("Verbal agreement handling", () => {
    it("should accept at standing ask when buyer agrees in words", async () => {
      const agreeTexts = ["ok deal", "i'll take it", "sounds good", "vale, me lo quedo", "de acuerdo"];
      for (const text of agreeTexts) {
        const msg: BuyerMessage = { itemId: "item-123", buyerName: "Buyer", text, ts: Date.now() };
        const reply = await brain.handleBuyerMessage(baseItem, msg);
        expect(reply.decision).toBe("accept");
        expect(reply.dealAgreed).toBe(true);
        expect(reply.price).toBe(baseItem.policy.targetPrice);
        expect(reply.agreedPrice).toBe(baseItem.policy.targetPrice);
      }
    });

    it("should accept bare yes if there was a previous counter offer", async () => {
      baseItem.agentReplies.push({
        decision: "counter",
        price: 130,
        reply: "I can do 130€",
        reason: "counter",
        dealAgreed: false,
      });

      const msg: BuyerMessage = { itemId: "item-123", buyerName: "Buyer", text: "ok", ts: Date.now() };
      const reply = await brain.handleBuyerMessage(baseItem, msg);
      expect(reply.decision).toBe("accept");
      expect(reply.price).toBe(130);
      expect(reply.dealAgreed).toBe(true);
    });

    it("should not accept verbal agreement if text contains a question mark", async () => {
      const msg: BuyerMessage = { itemId: "item-123", buyerName: "Buyer", text: "deal?", ts: Date.now() };
      const reply = await brain.handleBuyerMessage(baseItem, msg);
      expect(reply.decision).toBe("answer");
      expect(reply.dealAgreed).toBe(false);
    });
  });

  describe("Informational reply (no price named)", () => {
    it("should answer confidently when no offer or agreement is present", async () => {
      const msg: BuyerMessage = { itemId: "item-123", buyerName: "Buyer", text: "Is this still available?", ts: Date.now() };
      const reply = await brain.handleBuyerMessage(baseItem, msg);
      expect(reply.decision).toBe("answer");
      expect(reply.dealAgreed).toBe(false);
      expect(reply.reply).toContain(`It's €${baseItem.policy.targetPrice}`);
    });
  });

  describe("Implausibly high offer", () => {
    it("should counter with target price if offer is excessively high", async () => {
      const msg: BuyerMessage = { itemId: "item-123", buyerName: "Buyer", text: "I'll give you 500€ for it", offer: 500, ts: Date.now() };
      const reply = await brain.handleBuyerMessage(baseItem, msg);
      expect(reply.decision).toBe("counter");
      expect(reply.price).toBe(baseItem.policy.targetPrice);
      expect(reply.dealAgreed).toBe(false);
      expect(reply.reason).toContain("implausibly above market");
    });
  });

  describe("Below floor price / Human escalation", () => {
    it("should escalate to human if offer is below requireHumanBelow threshold", async () => {
      const msg: BuyerMessage = { itemId: "item-123", buyerName: "Lowballer", text: "How about 50€?", offer: 50, ts: Date.now() };
      const reply = await brain.handleBuyerMessage(baseItem, msg);
      expect(reply.decision).toBe("escalate-human");
      expect(reply.price).toBe(baseItem.policy.floorPrice);
      expect(reply.dealAgreed).toBe(false);
      expect(reply.reply).toContain("below what the seller will take");
    });
  });

  describe("Auto-accept rules", () => {
    it("should accept if offer is >= autoAcceptAtOrAbove", async () => {
      const msg: BuyerMessage = { itemId: "item-123", buyerName: "Buyer", text: "I offer 145€", offer: 145, ts: Date.now() };
      const reply = await brain.handleBuyerMessage(baseItem, msg);
      expect(reply.decision).toBe("accept");
      expect(reply.price).toBe(145);
      expect(reply.dealAgreed).toBe(true);
    });

    it("should accept if offer meets standing ask within tolerance", async () => {
      // targetPrice = 150, tol = max(2, round(150 * 0.03)) = 5, standingAsk - tol = 145
      const msg: BuyerMessage = { itemId: "item-123", buyerName: "Buyer", text: "I'll give you 147€", offer: 147, ts: Date.now() };
      const reply = await brain.handleBuyerMessage(baseItem, msg);
      expect(reply.decision).toBe("accept");
      expect(reply.price).toBe(147);
      expect(reply.dealAgreed).toBe(true);
      expect(reply.reason).toContain("meets our standing ask");
    });
  });

  describe("Counter-offer calculation & multi-round state memory", () => {
    it("should calculate counter-offer by conceding half the gap to standing ask", async () => {
      // standingAsk = 150, offer = 110. (150+110)/2 = 130. autoCounterDownTo = 110. niceRound(130) = 130.
      const msg: BuyerMessage = { itemId: "item-123", buyerName: "Buyer", text: "How about 110€?", offer: 110, ts: Date.now() };
      const reply = await brain.handleBuyerMessage(baseItem, msg);
      expect(reply.decision).toBe("counter");
      expect(reply.price).toBe(130);
      expect(reply.dealAgreed).toBe(false);
    });

    it("should close deal if counter-offer lands within tolerance of the offer", async () => {
      // standingAsk = 120, offer = 118. Concession = 119 -> niceRound(119) = 120. Within tol=5 of 118 -> accept.
      baseItem.agentReplies.push({
        decision: "counter",
        price: 120,
        reply: "120",
        reason: "",
        dealAgreed: false,
      });

      const msg: BuyerMessage = { itemId: "item-123", buyerName: "Buyer", text: "118€", offer: 118, ts: Date.now() };
      const reply = await brain.handleBuyerMessage(baseItem, msg);
      expect(reply.decision).toBe("accept");
      expect(reply.price).toBe(118);
      expect(reply.dealAgreed).toBe(true);
    });

    it("should get firmer after 2 or more buyer offers", async () => {
      baseItem.messages = [
        { itemId: "item-123", buyerName: "Buyer", text: "105€", offer: 105, ts: Date.now() - 2000 },
        { itemId: "item-123", buyerName: "Buyer", text: "110€", offer: 110, ts: Date.now() - 1000 },
      ];

      const msg: BuyerMessage = { itemId: "item-123", buyerName: "Buyer", text: "110€", offer: 110, ts: Date.now() };
      const reply = await brain.handleBuyerMessage(baseItem, msg);
      expect(reply.decision).toBe("counter");
      expect(reply.reply).toContain("That's my best");
      expect(reply.reason).toContain("firm");
    });

    it("should respect counterFloor from prior agent concessions and never undercut", async () => {
      baseItem.agentReplies = [
        { decision: "counter", price: 125, reply: "125", reason: "", dealAgreed: false },
      ];

      // standingAsk = 125. offer = 100.
      // (standingAsk + offer) / 2 = 112.5. niceRound(112.5) -> nearest 5 = 115.
      const msg: BuyerMessage = { itemId: "item-123", buyerName: "Buyer", text: "100€", offer: 100, ts: Date.now() };
      const reply = await brain.handleBuyerMessage(baseItem, msg);
      expect(reply.decision).toBe("counter");
      expect(reply.price).toBe(115);
    });

    it("should trigger auto-accept when counter-offer is within tolerance of offer", async () => {
      const customItem: Item = {
        ...baseItem,
        policy: {
          ...baseItem.policy,
          targetPrice: 90,
          floorPrice: 50,
          requireHumanBelow: 50,
          autoAcceptAtOrAbove: 90,
          autoCounterDownTo: 85,
        },
      };
      const msg: BuyerMessage = { itemId: "item-123", buyerName: "Buyer", text: "84€", offer: 84, ts: Date.now() };
      const reply = await brain.handleBuyerMessage(customItem, msg);
      expect(reply.decision).toBe("accept");
      expect(reply.reason).toContain("accept rather than quibble");
    });
  });

  describe("Full FixtureBrain coverage (analyzeItem, chooseMarketplace, buildPolicy, draftListings, decideFulfillment)", () => {
    it("should execute analyzeItem, chooseMarketplace, buildPolicy, draftListings, decideFulfillment without errors", async () => {
      const intake = { clue: "Fender guitar pedal", photos: [], answers: { q1: "works perfectly" } };
      const analysis = await brain.analyzeItem(intake);
      expect(analysis.title).toBeDefined();

      const plan = await brain.chooseMarketplace(analysis);
      expect(plan.primary).toBeDefined();

      const policy = await brain.buildPolicy(analysis, plan);
      expect(policy.targetPrice).toBeGreaterThan(0);

      const drafts = await brain.draftListings(analysis, plan, policy);
      expect(drafts.length).toBeGreaterThan(0);

      const fulfillmentLocal = await brain.decideFulfillment({ ...baseItem, analysis: { ...baseItem.analysis, fulfillment: "local-pickup" } });
      expect(fulfillmentLocal.mode).toBe("local-pickup");

      const fulfillmentShipping = await brain.decideFulfillment({ ...baseItem, analysis: { ...baseItem.analysis, fulfillment: "shipping" } });
      expect(fulfillmentShipping.mode).toBe("shipping");
    });

    it("should handle unknown adapter in channelOption fallback", async () => {
      const analysis: ItemAnalysis = {
        title: "Unknown Item",
        category: "Unknown",
        detectedAttributes: {},
        condition: "good",
        confidence: "medium",
        rationale: [],
        missingInfo: [],
        flags: [],
        estimatedMarketLow: 50,
        estimatedMarketHigh: 100,
      };
      const plan = await brain.chooseMarketplace(analysis);
      expect(plan).toBeDefined();
    });

    it("should refine with faulty or broken answers in refineWithAnswers", async () => {
      const intakeFaulty = {
        clue: "guitar pedal",
        photos: [],
        answers: { q1: "faulty, not working" },
      };
      const analysis = await brain.analyzeItem(intakeFaulty);
      expect(analysis.rationale.some((r) => r.includes("faulty/for-parts"))).toBe(true);

      const intakeWear = {
        clue: "guitar pedal",
        photos: [],
        answers: { q1: "minor wear, needs a clean" },
      };
      const analysisWear = await brain.analyzeItem(intakeWear);
      expect(analysisWear.rationale.some((r) => r.includes("Minor wear noted"))).toBe(true);
    });

    it("should handle shipping-only fulfillment override in analyzeItem", async () => {
      const intakeShipping = {
        clue: "guitar pedal",
        photos: [],
        fulfillmentOverride: "shipping" as const,
      };
      const analysis = await brain.analyzeItem(intakeShipping);
      expect(analysis.rationale.some((r) => r.includes("shipping only"))).toBe(true);
    });
  });
});
