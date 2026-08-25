import { eur, niceRound, round2, parseOffer } from '../money';

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

describe('niceRound', () => {
  describe('boundary conditions (n <= 0)', () => {
    it('returns 0 for zero', () => {
      expect(niceRound(0)).toBe(0);
      expect(niceRound(-0)).toBe(0);
    });

    it('returns 0 for negative numbers', () => {
      expect(niceRound(-0.01)).toBe(0);
      expect(niceRound(-1)).toBe(0);
      expect(niceRound(-5)).toBe(0);
      expect(niceRound(-18.4)).toBe(0);
      expect(niceRound(-100)).toBe(0);
    });
  });

  describe('low values (0 < n < 30)', () => {
    it('never returns 0 for positive prices very close to 0', () => {
      expect(niceRound(0.0001)).toBe(1);
      expect(niceRound(0.1)).toBe(1);
      expect(niceRound(0.49)).toBe(1);
    });

    it('rounds to nearest whole euro for small amounts', () => {
      expect(niceRound(0.5)).toBe(1);
      expect(niceRound(1.4)).toBe(1);
      expect(niceRound(1.5)).toBe(2);
      expect(niceRound(18.4)).toBe(18);
      expect(niceRound(18.5)).toBe(19);
      expect(niceRound(29.4)).toBe(29);
      expect(niceRound(29.49)).toBe(29);
    });

    it('handles values approaching the 30 boundary', () => {
      expect(niceRound(29.5)).toBe(30);
      expect(niceRound(29.99)).toBe(30);
    });
  });

  describe('snapping to nearest 5 (n >= 30)', () => {
    it('preserves exact multiples of 5 at or above 30', () => {
      expect(niceRound(30)).toBe(30);
      expect(niceRound(35)).toBe(35);
      expect(niceRound(100)).toBe(100);
      expect(niceRound(1000)).toBe(1000);
    });

    it('rounds values down to nearest 5 when below interval midpoint', () => {
      expect(niceRound(30.1)).toBe(30);
      expect(niceRound(32.49)).toBe(30);
      expect(niceRound(37.49)).toBe(35);
      expect(niceRound(110.72)).toBe(110);
    });

    it('rounds values up to nearest 5 when at or above interval midpoint', () => {
      expect(niceRound(32.5)).toBe(35);
      expect(niceRound(34.99)).toBe(35);
      expect(niceRound(37.5)).toBe(40);
      expect(niceRound(73.75)).toBe(75);
      expect(niceRound(112.5)).toBe(115);
      expect(niceRound(999.99)).toBe(1000);
    });
  });
});

describe('round2', () => {
  it('rounds numbers to two decimal places', () => {
    expect(round2(0)).toBe(0);
    expect(round2(10.5)).toBe(10.5);
    expect(round2(10.555)).toBe(10.56);
    expect(round2(10.554)).toBe(10.55);
    expect(round2(-12.4128975)).toBe(-12.41);
  });
});

describe('parseOffer', () => {
  it('parses valid numeric amounts from buyer text', () => {
    expect(parseOffer('50')).toBe(50);
    expect(parseOffer('50€')).toBe(50);
    expect(parseOffer('€50')).toBe(50);
    expect(parseOffer('50 euros')).toBe(50);
    expect(parseOffer('50.5')).toBe(50.5);
    expect(parseOffer('75,50')).toBe(75.5);
    expect(parseOffer('1.200')).toBe(1200);
  });

  it('returns undefined when no valid amount is present', () => {
    expect(parseOffer('')).toBeUndefined();
    expect(parseOffer('hello world')).toBeUndefined();
  });
});
