import { round2, niceRound, parseOffer } from '../money';

describe('round2', () => {
  it('rounds standard numbers to 2 decimal places', () => {
    expect(round2(10.555)).toBe(10.56);
    expect(round2(10.554)).toBe(10.55);
    expect(round2(10)).toBe(10);
    expect(round2(0)).toBe(0);
  });

  it('handles negative numbers correctly', () => {
    expect(round2(-10.555)).toBe(-10.55); // Math.round(-1055.5) -> -1055 -> -10.55
    expect(round2(-10.556)).toBe(-10.56);
  });

  it('handles floating point addition quirks', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(0.1 + 0.7)).toBe(0.8);
  });
});

describe('niceRound', () => {
  it('returns 0 for zero or negative numbers', () => {
    expect(niceRound(0)).toBe(0);
    expect(niceRound(-5)).toBe(0);
    expect(niceRound(-18.4)).toBe(0);
  });

  it('rounds to nearest whole number (min 1) for values under 30', () => {
    expect(niceRound(0.5)).toBe(1);
    expect(niceRound(0.1)).toBe(1); // Min 1
    expect(niceRound(18.4)).toBe(18);
    expect(niceRound(18.5)).toBe(19);
    expect(niceRound(29.4)).toBe(29);
    expect(niceRound(29.9)).toBe(30);
  });

  it('snaps to nearest 5 for values 30 or greater', () => {
    expect(niceRound(30)).toBe(30);
    expect(niceRound(32.4)).toBe(30);
    expect(niceRound(32.5)).toBe(35);
    expect(niceRound(73.75)).toBe(75);
    expect(niceRound(110.72)).toBe(110);
    expect(niceRound(112.5)).toBe(115);
  });
});

describe('parseOffer', () => {
  it('parses simple integer offer', () => {
    expect(parseOffer('50')).toBe(50);
  });

  it('parses offer with euro sign before or after', () => {
    expect(parseOffer('€50')).toBe(50);
    expect(parseOffer('50€')).toBe(50);
    expect(parseOffer('€ 50')).toBe(50);
    expect(parseOffer('50 €')).toBe(50);
  });

  it('parses offer with word variants (eur, euro, euros)', () => {
    expect(parseOffer('50 eur')).toBe(50);
    expect(parseOffer('50 euro')).toBe(50);
    expect(parseOffer('50 euros')).toBe(50);
  });

  it('parses offer with decimal amounts using dot or comma', () => {
    expect(parseOffer('50.5')).toBe(50.5);
    expect(parseOffer('50,50')).toBe(50.5);
    expect(parseOffer('€75,50')).toBe(75.5);
  });

  it('parses thousands format', () => {
    expect(parseOffer('1.200')).toBe(1200);
    expect(parseOffer('1.200,50')).toBe(1200.5);
  });

  it('extracts first offer from free text', () => {
    expect(parseOffer('I can offer 45 euros for this item')).toBe(45);
    expect(parseOffer('Would you take €35?')).toBe(35);
  });

  it('returns undefined if no offer is found', () => {
    expect(parseOffer('hello there')).toBeUndefined();
    expect(parseOffer('')).toBeUndefined();
  });
});
