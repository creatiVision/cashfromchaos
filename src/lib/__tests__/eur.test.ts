import { eur } from "../money";

// Intl formats use non-breaking spaces between amount and currency.
const norm = (s: string) => s.replace(/\u00A0/g, " ");

describe("eur", () => {
  it("formats zero correctly", () => {
    expect(norm(eur(0))).toBe("0,00 €");
  });

  it("formats negative zero (-0)", () => {
    expect(norm(eur(-0))).toBe("-0,00 €");
  });

  it("formats positive integers correctly", () => {
    expect(norm(eur(10))).toBe("10,00 €");
  });

  it("formats amounts with one decimal place correctly", () => {
    expect(norm(eur(10.5))).toBe("10,50 €");
  });

  it("formats amounts with two decimal places correctly", () => {
    expect(norm(eur(10.99))).toBe("10,99 €");
  });

  it("rounds amounts with more than two decimal places up correctly", () => {
    expect(norm(eur(10.999))).toBe("11,00 €");
  });

  it("rounds amounts down correctly", () => {
    expect(norm(eur(10.994))).toBe("10,99 €");
  });

  it("handles floating-point precision inputs correctly (e.g. 0.1 + 0.2)", () => {
    expect(norm(eur(0.1 + 0.2))).toBe("0,30 €");
  });

  it("formats negative amounts correctly", () => {
    expect(norm(eur(-10))).toBe("-10,00 €");
    expect(norm(eur(-10.5))).toBe("-10,50 €");
    expect(norm(eur(-0.01))).toBe("-0,01 €");
  });

  it("formats large amounts with es-ES separators", () => {
    expect(norm(eur(1234.56))).toBe("1234,56 €");
    expect(norm(eur(1000000))).toBe("1.000.000,00 €");
  });

  it("handles non-finite / special numbers", () => {
    expect(norm(eur(NaN))).toBe("NaN €");
    expect(norm(eur(Infinity))).toBe("∞ €");
    expect(norm(eur(-Infinity))).toBe("-∞ €");
  });

  it("returns string containing non-breaking space before normalization", () => {
    const raw = eur(50);
    expect(raw).toContain("\u00A0");
    expect(raw).toBe("50,00\u00A0€");
  });
});
