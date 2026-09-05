import { eur, round2, niceRound, parseOffer } from "./money";

describe("eur", () => {
  it("formats positive integers as EUR currency in es-ES locale", () => {
    const result = eur(10);
    // es-ES formats 10 as "10,00 €" with a non-breaking space or narrow space
    expect(result.replace(/[\u00a0\u202f]/g, " ")).toBe("10,00 €");
  });

  it("formats positive decimal amounts accurately", () => {
    const result = eur(9.99);
    expect(result.replace(/[\u00a0\u202f]/g, " ")).toBe("9,99 €");
  });

  it("formats zero correctly", () => {
    const result = eur(0);
    expect(result.replace(/[\u00a0\u202f]/g, " ")).toBe("0,00 €");
  });

  it("formats negative amounts correctly", () => {
    const result = eur(-15.5);
    expect(result.replace(/[\u00a0\u202f]/g, " ")).toBe("-15,50 €");
  });

  it("rounds decimals exceeding maximumFractionDigits (2)", () => {
    expect(eur(10.556).replace(/[\u00a0\u202f]/g, " ")).toBe("10,56 €");
    expect(eur(10.554).replace(/[\u00a0\u202f]/g, " ")).toBe("10,55 €");
  });

  it("formats large numbers with thousands separators", () => {
    const result = eur(1234567.89);
    // es-ES uses period for thousands separator: "1.234.567,89 €"
    expect(result.replace(/[\u00a0\u202f]/g, " ")).toBe("1.234.567,89 €");
  });

  it("handles NaN and Infinity gracefully", () => {
    expect(eur(NaN)).toBe("NaN €");
    expect(eur(Infinity).replace(/[\u00a0\u202f]/g, " ")).toMatch(/∞\s*€/);
  });
});

describe("round2", () => {
  it("rounds numbers to 2 decimal places", () => {
    expect(round2(10.556)).toBe(10.56);
    expect(round2(10.554)).toBe(10.55);
    expect(round2(10)).toBe(10);
  });
});

describe("niceRound", () => {
  it("returns 0 for non-positive numbers", () => {
    expect(niceRound(0)).toBe(0);
    expect(niceRound(-10)).toBe(0);
  });

  it("rounds values under 30 to whole euros, minimum 1", () => {
    expect(niceRound(0.4)).toBe(1);
    expect(niceRound(18.4)).toBe(18);
    expect(niceRound(29.6)).toBe(30);
  });

  it("snaps values 30 and above to nearest 5 euros", () => {
    expect(niceRound(73.75)).toBe(75);
    expect(niceRound(110.72)).toBe(110);
  });
});

describe("parseOffer", () => {
  it("parses offer amounts from text", () => {
    expect(parseOffer("50")).toBe(50);
    expect(parseOffer("50€")).toBe(50);
    expect(parseOffer("€50")).toBe(50);
    expect(parseOffer("50.5")).toBe(50.5);
    expect(parseOffer("75,50")).toBe(75.5);
    expect(parseOffer("1.200")).toBe(1200);
  });

  it("returns undefined if no offer amount is found", () => {
    expect(parseOffer("hello world")).toBeUndefined();
  });
});
