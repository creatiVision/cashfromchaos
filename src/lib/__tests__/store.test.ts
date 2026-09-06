import { newId } from "../store";

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

import { ensureSeeded, resetDemo, listItems, getItem, saveItem, createItemFromIntake, negotiate } from "../store";
import { FixtureBrain } from "../operator/fixtureBrain";

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
});
