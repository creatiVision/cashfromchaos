import {
  newId,
  ensureSeeded,
  resetDemo,
  listItems,
  createItemFromIntake,
  getItem,
  saveItem,
  setStatus,
  trace,
  negotiate,
} from "../store";
import { FixtureBrain } from "../operator/fixtureBrain";
import type { Item } from "../types";

describe("newId", () => {
  it("uses default prefix 'item' when no prefix is provided", () => {
    const id = newId();
    expect(id.startsWith("item_")).toBe(true);
  });

  it("uses provided prefix", () => {
    const prefix = "custom_prefix";
    const id = newId(prefix);
    expect(id.startsWith(`${prefix}_`)).toBe(true);
  });

  it("matches the expected string format: {prefix}_{uuidv4}", () => {
    const prefix = "test";
    const id = newId(prefix);
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const uuidPart = id.slice(prefix.length + 1);

    expect(id.startsWith(`${prefix}_`)).toBe(true);
    expect(uuidPart).toMatch(uuidPattern);
  });

  it("generates unique strings across multiple rapid calls", () => {
    const count = 1000;
    const generatedIds = new Set<string>();

    for (let i = 0; i < count; i++) {
      generatedIds.add(newId("unique"));
    }

    expect(generatedIds.size).toBe(count);
  });
});

describe("ensureSeeded & resetDemo", () => {
  beforeEach(async () => {
    await resetDemo();
  });

  it("seeds the three demo items correctly", async () => {
    await ensureSeeded();
    const items = listItems();
    expect(items.length).toBe(3);

    const pokemon = items.find((i) => i.id === "demo_pokemon");
    const pedal = items.find((i) => i.id === "demo_pedal");
    const furniture = items.find((i) => i.id === "demo_furniture");

    expect(pokemon).toBeDefined();
    expect(pedal).toBeDefined();
    expect(furniture).toBeDefined();

    expect(pokemon?.messages.length).toBeGreaterThan(0);
    expect(furniture?.messages.length).toBeGreaterThan(0);
  });

  it("resets store and re-seeds items", async () => {
    const customItem = await createItemFromIntake(
      { clue: "Test item", photos: [] },
      { brain: new FixtureBrain() }
    );
    expect(listItems().find((i) => i.id === customItem.id)).toBeDefined();

    await resetDemo();
    expect(listItems().find((i) => i.id === customItem.id)).toBeUndefined();
    expect(listItems().length).toBe(3);
  });

  it("respects skipSave option during item creation and negotiation", async () => {
    const brain = new FixtureBrain();
    const intake = { clue: "Unsaved guitar pedal", photos: [] };
    const unSavedItem = await createItemFromIntake(intake, {
      id: "unsaved_123",
      brain,
      skipSave: true,
    });

    expect(getItem("unsaved_123")).toBeUndefined();

    await negotiate(
      unSavedItem,
      {
        itemId: unSavedItem.id,
        buyerName: "Tester",
        text: "Would you take 10 euros?",
        offer: 10,
        ts: Date.now(),
      },
      brain,
      { skipSave: true }
    );

    expect(getItem("unsaved_123")).toBeUndefined();
    expect(unSavedItem.messages.length).toBe(1);

    saveItem(unSavedItem);
    expect(getItem("unsaved_123")).toBeDefined();
  });

  it("is idempotent when called sequentially multiple times", async () => {
    await ensureSeeded();
    const countAfterFirst = listItems().length;
    expect(countAfterFirst).toBe(3);

    await ensureSeeded();
    await ensureSeeded();
    expect(listItems().length).toBe(countAfterFirst);
  });

  it("handles concurrent calls to ensureSeeded without duplicating items", async () => {
    await resetDemo();
    const promises = [ensureSeeded(), ensureSeeded(), ensureSeeded()];
    await Promise.all(promises);
    expect(listItems().length).toBe(3);
  });

  it("returns immediately without seeding if seeded flag is already true", async () => {
    await ensureSeeded();
    expect(listItems().length).toBe(3);

    // Call ensureSeeded again - should resolve immediately and perform no action
    const res = await ensureSeeded();
    expect(res).toBeUndefined();
    expect(listItems().length).toBe(3);
  });

  it("preserves custom items added to store when already seeded", async () => {
    await ensureSeeded();
    const customItem = await createItemFromIntake(
      { clue: "Custom item after seed", photos: [] },
      { id: "custom_after_seed", brain: new FixtureBrain() }
    );
    expect(getItem("custom_after_seed")).toBeDefined();

    // Calling ensureSeeded again should be a no-op and preserve customItem
    await ensureSeeded();
    expect(getItem("custom_after_seed")).toBeDefined();
    expect(listItems().length).toBe(4);
  });

  it("populates expected fields, listings, policies, and trace events for seeded items", async () => {
    await ensureSeeded();
    const items = listItems();
    for (const item of items) {
      expect(item.id).toBeTruthy();
      expect(item.intake.clue).toBeTruthy();
      expect(item.analysis.title).toBeTruthy();
      expect(item.plan.primary.channelId).toBeTruthy();
      expect(item.policy.targetPrice).toBeGreaterThan(0);
      expect(item.listings.length).toBeGreaterThan(0);
      expect(item.trace.length).toBeGreaterThan(0);
    }
  });

});

describe("getItem, saveItem, listItems, setStatus, trace", () => {
  const createMockItem = (id: string, createdAt: number): Item => ({
    id,
    createdAt,
    intake: { clue: "Test intake", photos: [] },
    analysis: {
      title: "Test Item",
      category: "Test Category",
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
        name: "eBay Germany",
        fitScore: 0.95,
        reason: "Good fit",
        feePct: 0.1,
        shippingFriendly: true,
      },
      alternates: [],
      bundleRecommended: false,
      strategy: [],
    },
    policy: {
      currency: "EUR",
      targetPrice: 20,
      floorPrice: 15,
      autoAcceptAtOrAbove: 20,
      autoCounterDownTo: 16,
      requireHumanBelow: 14,
      maxFulfillmentSpend: 10,
      allowedPaymentMethods: ["stripe"],
      allowedChannels: ["ebay-de"],
      shippingAllowed: true,
      pickupAllowed: true,
      suspiciousBuyerEscalation: true,
    },
    listings: [],
    status: "listed",
    messages: [],
    agentReplies: [],
    payment: { provider: "simulated", status: "none", amount: 0 },
    ledger: [],
    trace: [],
  });

  beforeEach(async () => {
    await resetDemo();
  });

  describe("getItem & saveItem", () => {
    it("returns undefined for non-existent item id", () => {
      expect(getItem("non_existent_id")).toBeUndefined();
    });

    it("saves an item and retrieves it by id", () => {
      const mockItem = createMockItem("item_test_1", Date.now());
      saveItem(mockItem);

      const retrieved = getItem("item_test_1");
      expect(retrieved).toEqual(mockItem);
    });

    it("updates an existing item when saved again", () => {
      const mockItem = createMockItem("item_test_2", Date.now());
      saveItem(mockItem);

      mockItem.status = "paid";
      saveItem(mockItem);

      const retrieved = getItem("item_test_2");
      expect(retrieved?.status).toBe("paid");
    });
  });

  describe("listItems", () => {
    it("returns items sorted by createdAt in descending order", () => {
      const now = Date.now();
      const itemOld = createMockItem("item_old", now - 10000);
      const itemNew = createMockItem("item_new", now);
      const itemMid = createMockItem("item_mid", now - 5000);

      saveItem(itemOld);
      saveItem(itemNew);
      saveItem(itemMid);

      const items = listItems();
      const testItems = items.filter((i) => ["item_old", "item_new", "item_mid"].includes(i.id));

      expect(testItems[0].id).toBe("item_new");
      expect(testItems[1].id).toBe("item_mid");
      expect(testItems[2].id).toBe("item_old");
    });
  });

  describe("setStatus", () => {
    it("updates item status and saves it in store", () => {
      const mockItem = createMockItem("item_status_test", Date.now());
      saveItem(mockItem);

      setStatus(mockItem, "offer-accepted");

      expect(mockItem.status).toBe("offer-accepted");
      expect(getItem("item_status_test")?.status).toBe("offer-accepted");
    });
  });

  describe("trace", () => {
    it("appends a trace event with default level 'info'", () => {
      const mockItem = createMockItem("item_trace_test", Date.now());
      const beforeTs = Date.now();

      trace(mockItem, "seller", "Item submitted", "Detail message");

      expect(mockItem.trace.length).toBe(1);
      const event = mockItem.trace[0];
      expect(event.actor).toBe("seller");
      expect(event.label).toBe("Item submitted");
      expect(event.detail).toBe("Detail message");
      expect(event.level).toBe("info");
      expect(event.ts).toBeGreaterThanOrEqual(beforeTs);
    });

    it("appends a trace event with custom level", () => {
      const mockItem = createMockItem("item_trace_level_test", Date.now());

      trace(mockItem, "operator", "Needs details", "Missing condition", "warn");

      expect(mockItem.trace.length).toBe(1);
      const event = mockItem.trace[0];
      expect(event.level).toBe("warn");
    });
  });
});
