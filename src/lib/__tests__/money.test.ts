import { niceRound, round2, parseOffer } from "../money";

describe("niceRound", () => {
  describe("Branch 1: zero and negative values (n <= 0)", () => {
    it.each([
      [0, 0],
      [-0.0001, 0],
      [-0.01, 0],
      [-0.5, 0],
      [-1, 0],
      [-5, 0],
      [-18.4, 0],
      [-100, 0],
      [-Number.MAX_VALUE, 0],
    ])("returns 0 for %p", (input, expected) => {
      expect(niceRound(input)).toBe(expected);
    });
  });

  describe("Branch 2: values strictly between 0 and 30 (0 < n < 30)", () => {
    it.each([
      [0.0001, 1], // Minimum positive price ensures at least 1
      [0.001, 1],
      [0.1, 1],
      [0.4, 1], // Math.round(0.4) is 0 -> Math.max(1, 0) is 1
      [0.49, 1],
      [0.5, 1], // Math.round(0.5) is 1
      [0.99, 1],
      [1, 1],
      [1.2, 1],
      [1.4, 1],
      [1.5, 2],
      [18.4, 18],
      [18.5, 19],
      [29, 29],
      [29.4, 29],
      [29.49, 29],
      [29.5, 30],
      [29.9, 30],
      [29.99, 30],
      [29.999, 30],
    ])("rounds %p to %p (whole numbers, min 1)", (input, expected) => {
      expect(niceRound(input)).toBe(expected);
    });
  });

  describe("Branch 3: values equal to or greater than 30 (n >= 30)", () => {
    it.each([
      [30, 30],
      [30.0, 30],
      [30.1, 30],
      [32.4, 30],
      [32.49, 30],
      [32.5, 35],
      [33, 35],
      [37.49, 35],
      [37.5, 40],
      [38, 40],
      [72.4, 70],
      [73.75, 75],
      [100, 100],
      [110.72, 110],
      [112.49, 110],
      [112.5, 115],
      [500, 500],
      [999.9, 1000],
      [999.99, 1000],
      [1234.56, 1235],
    ])("snaps %p to nearest 5: %p", (input, expected) => {
      expect(niceRound(input)).toBe(expected);
    });
  });
});

describe("round2", () => {
  it("preserves whole numbers and 2-decimal numbers", () => {
    expect(round2(10)).toBe(10);
    expect(round2(10.5)).toBe(10.5);
    expect(round2(10.25)).toBe(10.25);
    expect(round2(0)).toBe(0);
  });

  it("rounds decimal numbers correctly (e.g. 10.123 -> 10.12, 10.125 -> 10.13)", () => {
    expect(round2(10.123)).toBe(10.12);
    expect(round2(10.125)).toBe(10.13);
    expect(round2(10.555)).toBe(10.56);
    expect(round2(10.554)).toBe(10.55);
    expect(round2(10.256)).toBe(10.26);
    expect(round2(10.254)).toBe(10.25);
    expect(round2(1.004)).toBe(1);
  });

  it("handles floating point precision quirks", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(0.1 + 0.7)).toBe(0.8);
    // Note: 1.005 * 100 in JS is 100.49999999999999, so Math.round evaluates to 100 -> 1
    expect(round2(1.005)).toBe(1);
  });

  it("handles negative numbers", () => {
    expect(round2(-10.123)).toBe(-10.12);
    expect(round2(-10.125)).toBe(-10.12);
    expect(round2(-10.256)).toBe(-10.26);
    expect(round2(-10.555)).toBe(-10.55);
    expect(round2(-10.556)).toBe(-10.56);
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
    expect(parseOffer("50 €")).toBe(50);
  });

  it("parses amounts with euro text variations", () => {
    expect(parseOffer("50 euros")).toBe(50);
    expect(parseOffer("50 eur")).toBe(50);
    expect(parseOffer("50 euro")).toBe(50);
  });

  it("parses decimal amounts with dot or comma", () => {
    expect(parseOffer("50.5")).toBe(50.5);
    expect(parseOffer("50,50")).toBe(50.5);
    expect(parseOffer("75,50")).toBe(75.5);
    expect(parseOffer("€75,50")).toBe(75.5);
  });

  it("handles thousands separators", () => {
    expect(parseOffer("1.200")).toBe(1200);
    expect(parseOffer("1.200,50")).toBe(1200.5);
  });

  it("extracts offer from buyer sentence", () => {
    expect(parseOffer("I can give you 50€ for this")).toBe(50);
    expect(parseOffer("Would you take 75,50 euros?")).toBe(75.5);
    expect(parseOffer("I can offer 45 euros for this item")).toBe(45);
    expect(parseOffer("Would you take €35?")).toBe(35);
  });

  it("returns undefined when no valid offer/number is present", () => {
    expect(parseOffer("hello world")).toBeUndefined();
    expect(parseOffer("is this available?")).toBeUndefined();
    expect(parseOffer("hello there")).toBeUndefined();
    expect(parseOffer("")).toBeUndefined();
  });
});
