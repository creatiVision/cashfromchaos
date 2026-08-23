import { parseOffer } from "./money";

describe("parseOffer", () => {
  it("parses whole numbers", () => {
    expect(parseOffer("50")).toBe(50);
  });

  it("parses amounts with euro symbols", () => {
    expect(parseOffer("50€")).toBe(50);
    expect(parseOffer("€50")).toBe(50);
    expect(parseOffer("50 euros")).toBe(50);
    expect(parseOffer("50 eur")).toBe(50);
  });

  it("parses decimal amounts", () => {
    expect(parseOffer("50.5")).toBe(50.5);
    expect(parseOffer("50.50")).toBe(50.5);
    expect(parseOffer("75,50")).toBe(75.5);
  });

  it("parses amounts with thousands separators", () => {
    expect(parseOffer("1.200")).toBe(1200);
    expect(parseOffer("1.200,50")).toBe(1200.5);
  });

  it("returns undefined for invalid inputs", () => {
    expect(parseOffer("")).toBeUndefined();
    expect(parseOffer("hello")).toBeUndefined();
    expect(parseOffer("free")).toBeUndefined();
  });
});
