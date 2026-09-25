import { FixtureBrain } from "../fixtureBrain";
import { HermesBrain, LlmBrain } from "../llmBrain";
import { runHermes, runHermesJson } from "../hermesCli";
import type {
  ItemIntake,
  MarketplacePlan,
  CommercePolicy,
  Item,
  BuyerMessage,
} from "@/lib/types";

jest.mock("../hermesCli", () => ({
  runHermes: jest.fn(),
  runHermesJson: jest.fn(),
}));

const mockedRunHermes = runHermes as jest.MockedFunction<typeof runHermes>;
const mockedRunHermesJson = runHermesJson as jest.MockedFunction<typeof runHermesJson>;

describe("HermesBrain (LlmBrain)", () => {
  let brain: HermesBrain;

  beforeEach(() => {
    jest.clearAllMocks();
    brain = new HermesBrain();
  });

  describe("Class definition and alias", () => {
    it("has name 'hermes'", () => {
      expect(brain.name).toBe("hermes");
    });

    it("exports LlmBrain as an alias to HermesBrain", () => {
      expect(LlmBrain).toBe(HermesBrain);
      const aliasInstance = new LlmBrain();
      expect(aliasInstance.name).toBe("hermes");
    });
  });

  describe("analyzeItem", () => {
    const mockIntake: ItemIntake = {
      clue: "Charizard 1st edition PSA 9 card",
      photos: [],
      notes: "Slight edge wear on top back",
      answers: {
        condition: "near_mint",
        authentic: "yes",
      },
    };

    it("generates custom title, description, and selling points using runHermesJson", async () => {
      mockedRunHermesJson.mockResolvedValueOnce({
        title: "Rare Charizard 1st Edition PSA 9 Holo Card",
        description: "An exceptional collectible Pokemon card in near mint condition.",
        sellingPoints: ["Graded PSA 9", "1st Edition Holo", "Includes protective case"],
      });

      const analysis = await brain.analyzeItem(mockIntake);

      expect(mockedRunHermesJson).toHaveBeenCalledTimes(1);
      const promptArg = mockedRunHermesJson.mock.calls[0][0];
      expect(promptArg).toContain('Seller\'s clue: "Charizard 1st edition PSA 9 card"');
      expect(promptArg).toContain("Extra notes: Slight edge wear on top back.");
      expect(promptArg).toContain("condition: near_mint");
      expect(promptArg).toContain("authentic: yes");

      expect(analysis.title).toBe("Rare Charizard 1st Edition PSA 9 Holo Card");
      expect(analysis.description).toBe("An exceptional collectible Pokemon card in near mint condition.");
      expect(analysis.sellingPoints).toEqual([
        "Graded PSA 9",
        "1st Edition Holo",
        "Includes protective case",
      ]);
      expect(analysis.category).toBeDefined();
    });

    it("handles missing notes and answers gracefully in prompt formatting", async () => {
      const minimalIntake: ItemIntake = {
        clue: "Roland Synth synthesizer",
        photos: [],
      };

      mockedRunHermesJson.mockResolvedValueOnce({
        title: "Roland Synthesizer Keyboard",
        description: "Great working condition synthesizer.",
      });

      await brain.analyzeItem(minimalIntake);

      const promptArg = mockedRunHermesJson.mock.calls[0][0];
      expect(promptArg).toContain("Extra notes: none.");
      expect(promptArg).toContain("Seller's answers to questions: none.");
    });

    it("handles non-array sellingPoints gracefully", async () => {
      mockedRunHermesJson.mockResolvedValueOnce({
        title: "Test Item",
        description: "Test Description",
        sellingPoints: "not-an-array" as any,
      });

      const analysis = await brain.analyzeItem(mockIntake);
      expect(analysis.title).toBe("Test Item");
      expect(analysis.description).toBe("Test Description");
      expect(analysis.sellingPoints).toBeUndefined();
    });

    it("falls back to base title when Hermes returns empty title or whitespace", async () => {
      mockedRunHermesJson.mockResolvedValueOnce({
        title: "   ",
        description: "A solid item.",
      });

      const analysis = await brain.analyzeItem(mockIntake);

      expect(analysis.title).not.toBe("   ");
      expect(analysis.title).toBeDefined();
      expect(analysis.description).toBe("A solid item.");
    });

    it("trims and truncates long titles, descriptions, and limits selling points to 4", async () => {
      const longTitle = "A".repeat(100);
      const longDesc = "B".repeat(700);
      const manyPoints = ["P1", "  P2  ", "P3", "P4", "P5", "P6"];

      mockedRunHermesJson.mockResolvedValueOnce({
        title: longTitle,
        description: longDesc,
        sellingPoints: manyPoints,
      });

      const analysis = await brain.analyzeItem(mockIntake);

      expect(analysis.title.length).toBe(70);
      expect(analysis.description?.length).toBe(600);
      expect(analysis.sellingPoints).toEqual(["P1", "P2", "P3", "P4"]);
    });

    it("catches errors from runHermesJson and falls back to deterministic base analysis", async () => {
      mockedRunHermesJson.mockRejectedValueOnce(new Error("CLI connection failed"));

      const analysis = await brain.analyzeItem(mockIntake);

      expect(analysis.title).toBeDefined();
      expect(analysis.description).toBeUndefined();
      expect(analysis.sellingPoints).toBeUndefined();
    });
  });

  describe("draftListings", () => {
    it("returns base drafts unmodified if analysis has no description", async () => {
      const intake: ItemIntake = { clue: "Fender Guitar", photos: [] };
      const analysis = await brain.analyzeItem(intake);
      analysis.description = undefined;

      const plan: MarketplacePlan = {
        primary: { channelId: "ebay-de-mock", name: "eBay DE Mock", fitScore: 0.9, reason: "Best market", feePct: 10, shippingFriendly: true },
        alternates: [],
        bundleRecommended: false,
        strategy: ["Sell fast"],
      };
      const policy: CommercePolicy = {
        currency: "EUR",
        targetPrice: 100,
        floorPrice: 80,
        autoAcceptAtOrAbove: 95,
        autoCounterDownTo: 85,
        requireHumanBelow: 80,
        maxFulfillmentSpend: 10,
        allowedPaymentMethods: ["stripe"],
        allowedChannels: ["ebay-de-mock"],
        shippingAllowed: true,
        pickupAllowed: true,
        suspiciousBuyerEscalation: true,
      };

      const drafts = await brain.draftListings(analysis, plan, policy);
      expect(drafts.length).toBeGreaterThan(0);
      expect(drafts[0].channelId).toBe("ebay-de-mock");
    });

    it("updates primary listing draft body with description and selling points", async () => {
      const intake: ItemIntake = { clue: "Fender Stratocaster", photos: [] };
      const analysis = await brain.analyzeItem(intake);
      analysis.description = "Authentic Fender Stratocaster in sunburst finish.";
      analysis.sellingPoints = ["Sunburst finish", "Includes hard case"];

      const plan: MarketplacePlan = {
        primary: { channelId: "ebay-de-mock", name: "eBay DE Mock", fitScore: 0.9, reason: "Best market", feePct: 10, shippingFriendly: true },
        alternates: [{ channelId: "vinted", name: "Vinted", fitScore: 0.7, reason: "Secondary", feePct: 5, shippingFriendly: true }],
        bundleRecommended: false,
        strategy: ["Sell fast"],
      };
      const policy: CommercePolicy = {
        currency: "EUR",
        targetPrice: 200,
        floorPrice: 150,
        autoAcceptAtOrAbove: 190,
        autoCounterDownTo: 160,
        requireHumanBelow: 150,
        maxFulfillmentSpend: 15,
        allowedPaymentMethods: ["stripe"],
        allowedChannels: ["ebay-de-mock", "vinted"],
        shippingAllowed: true,
        pickupAllowed: false,
        suspiciousBuyerEscalation: true,
      };

      const drafts = await brain.draftListings(analysis, plan, policy);
      expect(drafts.length).toBeGreaterThanOrEqual(1);

      const primaryDraft = drafts.find((d) => d.channelId === "ebay-de-mock");
      expect(primaryDraft).toBeDefined();
      expect(primaryDraft?.body).toContain("Authentic Fender Stratocaster in sunburst finish.");
      expect(primaryDraft?.body).toContain("• Sunburst finish\n• Includes hard case");

      const altDraft = drafts.find((d) => d.channelId === "vinted");
      if (altDraft) {
        expect(altDraft.body).not.toContain("• Sunburst finish");
      }
    });

    it("handles draft listing update when sellingPoints is empty", async () => {
      const intake: ItemIntake = { clue: "Fender Stratocaster", photos: [] };
      const analysis = await brain.analyzeItem(intake);
      analysis.description = "Clean Fender Stratocaster.";
      analysis.sellingPoints = [];

      const plan: MarketplacePlan = {
        primary: { channelId: "ebay-de-mock", name: "eBay DE Mock", fitScore: 0.9, reason: "Best market", feePct: 10, shippingFriendly: true },
        alternates: [],
        bundleRecommended: false,
        strategy: ["Sell fast"],
      };
      const policy: CommercePolicy = {
        currency: "EUR",
        targetPrice: 200,
        floorPrice: 150,
        autoAcceptAtOrAbove: 190,
        autoCounterDownTo: 160,
        requireHumanBelow: 150,
        maxFulfillmentSpend: 15,
        allowedPaymentMethods: ["stripe"],
        allowedChannels: ["ebay-de-mock"],
        shippingAllowed: true,
        pickupAllowed: false,
        suspiciousBuyerEscalation: true,
      };

      const drafts = await brain.draftListings(analysis, plan, policy);
      const primaryDraft = drafts.find((d) => d.channelId === "ebay-de-mock");
      expect(primaryDraft?.body).toContain("Clean Fender Stratocaster.");
      expect(primaryDraft?.body).not.toContain("•");
    });
  });

    it("returns empty array if super.draftListings returns empty drafts", async () => {
      const intake: ItemIntake = { clue: "Fender Guitar", photos: [] };
      const analysis = await brain.analyzeItem(intake);
      analysis.description = "Some description";

      jest.spyOn(FixtureBrain.prototype, "draftListings").mockResolvedValueOnce([]);

      const plan: MarketplacePlan = {
        primary: { channelId: "ebay-de-mock", name: "eBay DE Mock", fitScore: 0.9, reason: "Best market", feePct: 10, shippingFriendly: true },
        alternates: [],
        bundleRecommended: false,
        strategy: ["Sell fast"],
      };
      const policy: CommercePolicy = {
        currency: "EUR",
        targetPrice: 100,
        floorPrice: 80,
        autoAcceptAtOrAbove: 95,
        autoCounterDownTo: 85,
        requireHumanBelow: 80,
        maxFulfillmentSpend: 10,
        allowedPaymentMethods: ["stripe"],
        allowedChannels: ["ebay-de-mock"],
        shippingAllowed: true,
        pickupAllowed: true,
        suspiciousBuyerEscalation: true,
      };

      const drafts = await brain.draftListings(analysis, plan, policy);
      expect(drafts).toEqual([]);
    });
  describe("handleBuyerMessage", () => {
    let mockItem: Item;

    beforeEach(async () => {
      const intake: ItemIntake = { clue: "Vintage Camera", photos: [] };
      const analysis = await brain.analyzeItem(intake);
      mockItem = {
        id: "item-camera-123",
        createdAt: Date.now(),
        intake,
        analysis,
        plan: {
          primary: { channelId: "ebay-de-mock", name: "eBay DE Mock", fitScore: 0.9, reason: "Primary", feePct: 10, shippingFriendly: true },
          alternates: [],
          bundleRecommended: false,
          strategy: ["Sell fast"],
        },
        policy: {
          currency: "EUR",
          targetPrice: 100,
          floorPrice: 70,
          autoAcceptAtOrAbove: 95,
          autoCounterDownTo: 80,
          requireHumanBelow: 70,
          maxFulfillmentSpend: 10,
          allowedPaymentMethods: ["stripe"],
          allowedChannels: ["ebay-de-mock"],
          shippingAllowed: true,
          pickupAllowed: true,
          suspiciousBuyerEscalation: true,
        },
        listings: [],
        messages: [],
        agentReplies: [],
        payment: { provider: "stripe", status: "none", amount: 100 },
        ledger: [],
        trace: [],
        status: "listed",
      };
    });

    it("calls runHermes and returns updated reply prose with fixed decision", async () => {
      mockedRunHermes.mockResolvedValueOnce(
        "Thanks for your interest! The camera is in excellent shape, so €90 is my bottom price."
      );

      const message: BuyerMessage = {
        itemId: mockItem.id,
        buyerName: "John",
        text: "Will you take €50?",
        ts: Date.now(),
      };

      const reply = await brain.handleBuyerMessage(mockItem, message);

      expect(mockedRunHermes).toHaveBeenCalledTimes(1);
      const promptArg = mockedRunHermes.mock.calls[0][0];
      expect(promptArg).toContain('Buyer said: "Will you take €50?"');
      expect(promptArg).toContain("listed at €100");
      expect(promptArg).toContain("floor the seller won't cross: €70");

      expect(reply.reply).toBe(
        "Thanks for your interest! The camera is in excellent shape, so €90 is my bottom price."
      );
      // Fixed policy decision & reason from FixtureBrain are preserved
      expect(reply.decision).toBeDefined();
      expect(reply.reason).toBeDefined();
    });

    it("truncates replies longer than 400 characters", async () => {
      const longReply = "C".repeat(500);
      mockedRunHermes.mockResolvedValueOnce(longReply);

      const message: BuyerMessage = {
        itemId: mockItem.id,
        buyerName: "John",
        text: "Hello!",
        ts: Date.now(),
      };

      const reply = await brain.handleBuyerMessage(mockItem, message);

      expect(reply.reply.length).toBe(400);
    });

    it("falls back to deterministic base reply if runHermes returns empty string", async () => {
      mockedRunHermes.mockResolvedValueOnce("");

      const message: BuyerMessage = {
        itemId: mockItem.id,
        buyerName: "John",
        text: "Is this still available?",
        ts: Date.now(),
      };

      const reply = await brain.handleBuyerMessage(mockItem, message);

      expect(reply.reply).toBeDefined();
      expect(reply.reply.length).toBeGreaterThan(0);
    });

    it("catches errors in runHermes and falls back to deterministic base reply", async () => {
      mockedRunHermes.mockRejectedValueOnce(new Error("CLI failure"));

      const message: BuyerMessage = {
        itemId: mockItem.id,
        buyerName: "John",
        text: "Can you ship it to me?",
        ts: Date.now(),
      };

      const reply = await brain.handleBuyerMessage(mockItem, message);

      expect(reply.reply).toBeDefined();
      expect(reply.decision).toBeDefined();
    });
  });
});
