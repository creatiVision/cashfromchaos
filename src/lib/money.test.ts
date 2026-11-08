import { eur, round2, niceRound, parseOffer } from "./money";

/** Helper to replace non-breaking spaces (\u00a0 and \u202f) with regular spaces for clean assertions */
function cleanSpaces(str: string): string {
  return str.replace(/[\u00a0\u202f]/g, " ");
}

describe("eur", () => {
  it("formats positive whole numbers with two decimal places and euro symbol in es-ES locale", () => {
    expect(cleanSpaces(eur(100))).toBe("100,00 €");
    expect(cleanSpaces(eur(10))).toBe("10,00 €");
    expect(cleanSpaces(eur(1))).toBe("1,00 €");
  });

  it("formats decimal amounts accurately", () => {
    expect(cleanSpaces(eur(12.34))).toBe("12,34 €");
    expect(cleanSpaces(eur(9.99))).toBe("9,99 €");
    expect(cleanSpaces(eur(0.99))).toBe("0,99 €");
  });

  it("pads single decimal places to two decimal digits", () => {
    expect(cleanSpaces(eur(5.5))).toBe("5,50 €");
  });

  it("rounds amounts to a maximum of two fraction digits", () => {
    expect(cleanSpaces(eur(12.345))).toBe("12,35 €");
    expect(cleanSpaces(eur(12.341))).toBe("12,34 €");
    expect(cleanSpaces(eur(10.556))).toBe("10,56 €");
    expect(cleanSpaces(eur(10.554))).toBe("10,55 €");
  });

  it("formats zero correctly", () => {
    expect(cleanSpaces(eur(0))).toBe("0,00 €");
  });

  it("formats negative numbers correctly", () => {
    expect(cleanSpaces(eur(-15.99))).toBe("-15,99 €");
    expect(cleanSpaces(eur(-15.5))).toBe("-15,50 €");
    expect(cleanSpaces(eur(-5))).toBe("-5,00 €");
  });

  it("formats large numbers with thousand separators", () => {
    expect(cleanSpaces(eur(1234567.89))).toBe("1.234.567,89 €");
  });

  it("handles NaN and Infinity gracefully", () => {
    expect(cleanSpaces(eur(NaN))).toBe("NaN €");
    expect(cleanSpaces(eur(Infinity))).toMatch(/∞\s*€/);
  });
});

describe("round2", () => {
  it("preserves whole numbers and 1 or 2 decimal place numbers", () => {
    expect(round2(0)).toBe(0);
    expect(round2(10)).toBe(10);
    expect(round2(10.5)).toBe(10.5);
    expect(round2(10.25)).toBe(10.25);
  });

  it("rounds positive numbers to 2 decimal places (including 10.123 -> 10.12 and 10.125 -> 10.13)", () => {
    expect(round2(10.123)).toBe(10.12);
    expect(round2(10.125)).toBe(10.13);
    expect(round2(12.3456)).toBe(12.35);
    expect(round2(12.341)).toBe(12.34);
    expect(round2(10.556)).toBe(10.56);
    expect(round2(10.554)).toBe(10.55);
    expect(round2(1.004)).toBe(1);
    expect(round2(0.005)).toBe(0.01);
    expect(round2(0.004)).toBe(0);
  });

  it("handles floating point arithmetic quirks correctly", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(0.1 + 0.7)).toBe(0.8);
    expect(round2(1.005)).toBe(1);
  });

  it("handles negative numbers correctly", () => {
    expect(round2(-10.123)).toBe(-10.12);
    expect(round2(-10.125)).toBe(-10.12);
    expect(round2(-10.126)).toBe(-10.13);
    expect(round2(-10.555)).toBe(-10.55);
    expect(round2(-10.556)).toBe(-10.56);
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
  it("parses simple numbers and currency variants from text", () => {
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
