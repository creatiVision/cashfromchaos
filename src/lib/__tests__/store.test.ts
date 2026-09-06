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
