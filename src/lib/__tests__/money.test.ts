import { niceRound } from '../money';

describe('niceRound', () => {
  describe('non-positive values (n <= 0)', () => {
    it('returns 0 for zero', () => {
      expect(niceRound(0)).toBe(0);
    });

    it('returns 0 for negative numbers', () => {
      expect(niceRound(-1)).toBe(0);
      expect(niceRound(-10.5)).toBe(0);
      expect(niceRound(-100)).toBe(0);
    });
  });

  describe('values between 0 and 30 (0 < n < 30)', () => {
    it('enforces a minimum result of 1 for small fractional numbers', () => {
      expect(niceRound(0.1)).toBe(1);
      expect(niceRound(0.4)).toBe(1);
    });

    it('rounds standard values to the nearest integer', () => {
      expect(niceRound(0.5)).toBe(1);
      expect(niceRound(1.4)).toBe(1);
      expect(niceRound(1.6)).toBe(2);
      expect(niceRound(14.8)).toBe(15);
      expect(niceRound(24.2)).toBe(24);
    });

    it('handles boundary conditions approaching 30', () => {
      expect(niceRound(29.4)).toBe(29);
      expect(niceRound(29.5)).toBe(30);
      expect(niceRound(29.99)).toBe(30);
    });
  });

  describe('values greater than or equal to 30 (n >= 30)', () => {
    it('rounds 30 exactly to 30', () => {
      expect(niceRound(30)).toBe(30);
    });

    it('rounds values to the nearest multiple of 5', () => {
      expect(niceRound(31)).toBe(30);
      expect(niceRound(32)).toBe(30);
      expect(niceRound(32.5)).toBe(35);
      expect(niceRound(33)).toBe(35);
      expect(niceRound(37.4)).toBe(35);
      expect(niceRound(37.5)).toBe(40);
      expect(niceRound(99)).toBe(100);
      expect(niceRound(102.4)).toBe(100);
    });
  });
});
