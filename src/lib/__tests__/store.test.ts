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

  it("matches the expected string format: {prefix}_{base36Timestamp}_{counter}", () => {
    const prefix = "test";
    const id = newId(prefix);
    const parts = id.split("_");

    expect(parts.length).toBe(3);
    expect(parts[0]).toBe(prefix);
    // base36 string contains numbers and lowercase letters
    expect(parts[1]).toMatch(/^[0-9a-z]+$/);
    // counter is a numeric integer string
    expect(parts[2]).toMatch(/^\d+$/);
  });

  it("increments counter on sequential calls", () => {
    const id1 = newId("seq");
    const id2 = newId("seq");

    const counter1 = parseInt(id1.split("_")[2], 10);
    const counter2 = parseInt(id2.split("_")[2], 10);

    expect(counter2).toBe(counter1 + 1);
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
