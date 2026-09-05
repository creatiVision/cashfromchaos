import { eur, round2, niceRound, parseOffer } from "./money";

/** Helper to replace non-breaking spaces (\u00a0 and \u202f) with regular spaces for clean assertions */
function cleanSpaces(str: string): string {
  return str.replace(/[\u00a0\u202f]/g, " ");
}

describe("eur", () => {
  it("formats positive whole numbers with two decimal places and euro symbol in es-ES locale", () => {
    expect(cleanSpaces(eur(100))).toBe("100,00 €");
    expect(cleanSpaces(eur(1))).toBe("1,00 €");
  });

  it("formats decimal amounts accurately", () => {
    expect(cleanSpaces(eur(12.34))).toBe("12,34 €");
    expect(cleanSpaces(eur(0.99))).toBe("0,99 €");
  });

  it("pads single decimal places to two decimal digits", () => {
    expect(cleanSpaces(eur(5.5))).toBe("5,50 €");
  });

  it("rounds amounts to a maximum of two fraction digits", () => {
    expect(cleanSpaces(eur(12.345))).toBe("12,35 €");
    expect(cleanSpaces(eur(12.341))).toBe("12,34 €");
  });

  it("formats zero correctly", () => {
    expect(cleanSpaces(eur(0))).toBe("0,00 €");
  });

  it("formats negative numbers correctly", () => {
    expect(cleanSpaces(eur(-15.99))).toBe("-15,99 €");
    expect(cleanSpaces(eur(-5))).toBe("-5,00 €");
  });

  it("formats large numbers with thousand separators", () => {
    expect(cleanSpaces(eur(1234567.89))).toBe("1.234.567,89 €");
  });
});

describe("round2", () => {
  it("rounds numbers to 2 decimal places", () => {
    expect(round2(12.3456)).toBe(12.35);
    expect(round2(12.341)).toBe(12.34);
    expect(round2(10)).toBe(10);
  });
});

describe("niceRound", () => {
  it("returns 0 for non-positive numbers", () => {
    expect(niceRound(0)).toBe(0);
    expect(niceRound(-10)).toBe(0);
  });

  it("rounds low-value items (< 30) to whole euros with a minimum of 1", () => {
    expect(niceRound(0.4)).toBe(1);
    expect(niceRound(18.40)).toBe(18);
    expect(niceRound(29.60)).toBe(30);
  });

  it("snaps higher-value items (>= 30) to the nearest 5", () => {
    expect(niceRound(31)).toBe(30);
    expect(niceRound(33)).toBe(35);
    expect(niceRound(73.75)).toBe(75);
    expect(niceRound(110.72)).toBe(110);
  });
});

describe("parseOffer", () => {
  it("parses simple numbers from text", () => {
    expect(parseOffer("50")).toBe(50);
    expect(parseOffer("50€")).toBe(50);
    expect(parseOffer("€50")).toBe(50);
    expect(parseOffer("50 euros")).toBe(50);
  });

  it("parses decimal amounts with dot or comma", () => {
    expect(parseOffer("50.5")).toBe(50.5);
    expect(parseOffer("75,50")).toBe(75.5);
  });

  it("handles thousands separators", () => {
    expect(parseOffer("1.200")).toBe(1200);
    expect(parseOffer("1.200€")).toBe(1200);
  });

  it("returns undefined for text without numeric offers", () => {
    expect(parseOffer("hello world")).toBeUndefined();
    expect(parseOffer("no price here")).toBeUndefined();
  });
});
