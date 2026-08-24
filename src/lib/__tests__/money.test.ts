import { eur, round2, niceRound, parseOffer } from '../money';

describe('eur', () => {
  const norm = (s: string) => s.replace(/\u00A0|\u202F/g, ' ');

  it('formats positive integers correctly', () => {
    expect(norm(eur(10))).toBe('10,00 €');
  });

  it('formats zero correctly', () => {
    expect(norm(eur(0))).toBe('0,00 €');
  });

  it('formats decimal amounts with two decimal places', () => {
    expect(norm(eur(12.5))).toBe('12,50 €');
    expect(norm(eur(12.99))).toBe('12,99 €');
  });

  it('rounds amounts with more than two decimal places', () => {
    expect(norm(eur(10.999))).toBe('11,00 €');
    expect(norm(eur(10.994))).toBe('10,99 €');
  });

  it('formats negative amounts correctly', () => {
    expect(norm(eur(-10))).toBe('-10,00 €');
    expect(norm(eur(-12.5))).toBe('-12,50 €');
  });

  it('formats large numbers correctly', () => {
    expect(norm(eur(1234567.89))).toBe('1.234.567,89 €');
  });
});

describe('round2', () => {
  it('rounds numbers to two decimal places', () => {
    expect(round2(10.555)).toBe(10.56);
    expect(round2(10.554)).toBe(10.55);
    expect(round2(10)).toBe(10);
  });
});

describe('parseOffer', () => {
  it('parses valid offer texts correctly', () => {
    expect(parseOffer('50')).toBe(50);
    expect(parseOffer('50€')).toBe(50);
    expect(parseOffer('€50')).toBe(50);
    expect(parseOffer('50 euros')).toBe(50);
    expect(parseOffer('50.5')).toBe(50.5);
    expect(parseOffer('75,50')).toBe(75.5);
    expect(parseOffer('1.200')).toBe(1200);
  });

  it('returns undefined for invalid text', () => {
    expect(parseOffer('hello')).toBeUndefined();
    expect(parseOffer('')).toBeUndefined();
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
