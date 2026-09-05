import { niceRound, round2, parseOffer } from "../money";

describe("niceRound", () => {
  describe("zero and negative numbers", () => {
    it("returns 0 for zero", () => {
      expect(niceRound(0)).toBe(0);
    });

    it("returns 0 for negative numbers", () => {
      expect(niceRound(-1)).toBe(0);
      expect(niceRound(-5)).toBe(0);
      expect(niceRound(-18.4)).toBe(0);
      expect(niceRound(-100)).toBe(0);
    });
  });

  describe("low-value items (< 30)", () => {
    it("never returns 0 for a small positive price (minimum 1)", () => {
      expect(niceRound(0.01)).toBe(1);
      expect(niceRound(0.1)).toBe(1);
      expect(niceRound(0.49)).toBe(1);
      expect(niceRound(0.5)).toBe(1);
    });

    it("rounds to nearest whole integer for prices under 30", () => {
      expect(niceRound(1.2)).toBe(1);
      expect(niceRound(1.8)).toBe(2);
      expect(niceRound(18.4)).toBe(18);
      expect(niceRound(18.5)).toBe(19);
      expect(niceRound(29.4)).toBe(29);
      expect(niceRound(29.5)).toBe(30);
      expect(niceRound(29.99)).toBe(30);
    });
  });

  describe("standard items (>= 30)", () => {
    it("snaps to the nearest €5 step for values 30 or greater", () => {
      expect(niceRound(30)).toBe(30);
      expect(niceRound(32.4)).toBe(30);
      expect(niceRound(32.5)).toBe(35);
      expect(niceRound(73.75)).toBe(75);
      expect(niceRound(110.72)).toBe(110);
      expect(niceRound(112.5)).toBe(115);
      expect(niceRound(1002)).toBe(1000);
      expect(niceRound(1003)).toBe(1005);
    });
  });
});

describe("round2", () => {
  it("preserves whole numbers and 2-decimal numbers", () => {
    expect(round2(10)).toBe(10);
    expect(round2(10.5)).toBe(10.5);
    expect(round2(10.25)).toBe(10.25);
  });

  it("rounds decimals to 2 decimal places", () => {
    expect(round2(10.256)).toBe(10.26);
    expect(round2(10.254)).toBe(10.25);
  });

  it("handles floating point precision quirks", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });

  it("handles negative numbers", () => {
    expect(round2(-10.256)).toBe(-10.26);
  });
});

describe("parseOffer", () => {
  it("parses plain numeric string", () => {
    expect(parseOffer("50")).toBe(50);
  });

  it("parses amounts with euro symbols", () => {
    expect(parseOffer("50€")).toBe(50);
    expect(parseOffer("€50")).toBe(50);
    expect(parseOffer("€ 50")).toBe(50);
  });

  it("parses amounts with euro text variations", () => {
    expect(parseOffer("50 euros")).toBe(50);
    expect(parseOffer("50 eur")).toBe(50);
    expect(parseOffer("50 euro")).toBe(50);
  });

  it("parses decimal amounts with dot or comma", () => {
    expect(parseOffer("50.5")).toBe(50.5);
    expect(parseOffer("75,50")).toBe(75.5);
  });

  it("handles thousands separators", () => {
    expect(parseOffer("1.200")).toBe(1200);
    expect(parseOffer("1.200,50")).toBe(1200.5);
  });

  it("extracts offer from buyer sentence", () => {
    expect(parseOffer("I can give you 50€ for this")).toBe(50);
    expect(parseOffer("Would you take 75,50 euros?")).toBe(75.5);
  });

  it("returns undefined when no valid offer/number is present", () => {
    expect(parseOffer("hello world")).toBeUndefined();
    expect(parseOffer("is this available?")).toBeUndefined();
    expect(parseOffer("")).toBeUndefined();
  });
});
