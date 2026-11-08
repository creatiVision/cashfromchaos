import { parseOffer } from "../money";

describe("parseOffer", () => {
  describe("Plain numbers", () => {
    it.each([
      ["50", 50],
      ["0", 0],
      ["100", 100],
      ["9999", 9999],
    ])("parses plain number %p as %p", (input, expected) => {
      expect(parseOffer(input)).toBe(expected);
    });
  });

  describe("Currency symbols and positions", () => {
    it.each([
      ["50€", 50],
      ["€50", 50],
      ["€ 50", 50],
      ["50 €", 50],
      ["€  120", 120],
      ["120  €", 120],
    ])("parses symbol string %p as %p", (input, expected) => {
      expect(parseOffer(input)).toBe(expected);
    });
  });

  describe("Currency words and case sensitivity", () => {
    it.each([
      ["50 euros", 50],
      ["50 euro", 50],
      ["50 eur", 50],
      ["50 EUROS", 50],
      ["50 Eur", 50],
      ["100 Euros", 100],
    ])("parses currency word string %p as %p", (input, expected) => {
      expect(parseOffer(input)).toBe(expected);
    });
  });

  describe("Decimal amounts", () => {
    it.each([
      ["50.5", 50.5],
      ["50.50", 50.5],
      ["75,50", 75.5],
      ["€75,50", 75.5],
      ["75,50€", 75.5],
      ["0.99", 0.99],
      ["0,99 €", 0.99],
    ])("parses decimal string %p as %p", (input, expected) => {
      expect(parseOffer(input)).toBe(expected);
    });
  });

  describe("Thousands separators", () => {
    it.each([
      ["1.200", 1200],
      ["1.200€", 1200],
      ["1.200,50", 1200.5],
      ["12.345", 12345],
      ["1.000,99 €", 1000.99],
    ])("parses thousands separated string %p as %p", (input, expected) => {
      expect(parseOffer(input)).toBe(expected);
    });
  });

  describe("Natural buyer text / conversational sentences", () => {
    it.each([
      ["I can give you 50€ for this", 50],
      ["Would you take 75,50 euros?", 75.5],
      ["I can offer 45 euros for this item", 45],
      ["Would you take €35?", 35],
      ["Hi! Is 20 € acceptable?", 20],
      ["My budget is 150eur.", 150],
    ])("extracts offer %p from sentence %p", (sentence, expected) => {
      expect(parseOffer(sentence)).toBe(expected);
    });
  });

  describe("Invalid or non-numeric inputs", () => {
    it.each([
      ["hello world"],
      ["no price here"],
      ["is this available?"],
      ["hello there"],
      [""],
      ["   "],
      ["€"],
      ["euros"],
    ])("returns undefined for non-numeric input %p", (input) => {
      expect(parseOffer(input)).toBeUndefined();
    });
  });

  describe("Non-finite numbers", () => {
    it("returns undefined when parsed number exceeds Number.MAX_VALUE (Infinity)", () => {
      const hugeInput = "1" + "0".repeat(309);
      expect(parseOffer(hugeInput)).toBeUndefined();
    });
  });
});
