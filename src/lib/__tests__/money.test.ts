import { niceRound } from '../money';

describe('niceRound', () => {
  describe('zero and negative numbers (n <= 0)', () => {
    it('returns 0 for zero', () => {
      expect(niceRound(0)).toBe(0);
    });

    it('returns 0 for negative integers and decimals', () => {
      expect(niceRound(-0.01)).toBe(0);
      expect(niceRound(-1)).toBe(0);
      expect(niceRound(-5)).toBe(0);
      expect(niceRound(-18.4)).toBe(0);
      expect(niceRound(-100)).toBe(0);
    });
  });

  describe('low-value items under 30 (0 < n < 30)', () => {
    it('enforces a minimum of 1 for positive numbers close to 0', () => {
      expect(niceRound(0.001)).toBe(1);
      expect(niceRound(0.1)).toBe(1);
      expect(niceRound(0.49)).toBe(1);
      expect(niceRound(0.5)).toBe(1);
    });

    it('rounds to the nearest whole integer for numbers between 1 and 29', () => {
      expect(niceRound(1.2)).toBe(1);
      expect(niceRound(1.5)).toBe(2);
      expect(niceRound(18.4)).toBe(18);
      expect(niceRound(18.5)).toBe(19);
      expect(niceRound(29.4)).toBe(29);
    });

    it('rounds numbers close to 30 correctly', () => {
      expect(niceRound(29.5)).toBe(30);
      expect(niceRound(29.9)).toBe(30);
      expect(niceRound(29.99)).toBe(30);
    });
  });

  describe('mid-to-high value items (n >= 30)', () => {
    it('handles exact boundary at 30', () => {
      expect(niceRound(30)).toBe(30);
    });

    it('snaps down to the nearest multiple of 5 when decimal/fraction is below half step', () => {
      expect(niceRound(30.1)).toBe(30);
      expect(niceRound(32.4)).toBe(30);
      expect(niceRound(32.49)).toBe(30);
      expect(niceRound(72.4)).toBe(70);
      expect(niceRound(112.49)).toBe(110);
    });

    it('snaps up to the nearest multiple of 5 when at or above half step', () => {
      expect(niceRound(32.5)).toBe(35);
      expect(niceRound(37.5)).toBe(40);
      expect(niceRound(73.75)).toBe(75);
      expect(niceRound(110.72)).toBe(110);
      expect(niceRound(112.5)).toBe(115);
    });

    it('handles large numbers accurately', () => {
      expect(niceRound(500)).toBe(500);
      expect(niceRound(999.99)).toBe(1000);
      expect(niceRound(1234.56)).toBe(1235);
    });
  });
});
