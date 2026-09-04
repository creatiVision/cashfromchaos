import { niceRound } from '../money';

describe('niceRound', () => {
  describe('Branch 1: zero and negative values (n <= 0)', () => {
    it.each([
      [0, 0],
      [-0.0001, 0],
      [-0.5, 0],
      [-1, 0],
      [-5, 0],
      [-18.4, 0],
      [-100, 0],
      [-Number.MAX_VALUE, 0],
    ])('returns 0 for %p', (input, expected) => {
      expect(niceRound(input)).toBe(expected);
    });
  });

  describe('Branch 2: values strictly between 0 and 30 (0 < n < 30)', () => {
    it.each([
      [0.0001, 1], // Minimum positive price ensures at least 1
      [0.1, 1],
      [0.4, 1], // Math.round(0.4) is 0 -> Math.max(1, 0) is 1
      [0.49, 1],
      [0.5, 1], // Math.round(0.5) is 1
      [0.99, 1],
      [1, 1],
      [1.4, 1],
      [1.5, 2],
      [18.4, 18],
      [18.5, 19],
      [29, 29],
      [29.4, 29],
      [29.49, 29],
      [29.5, 30],
      [29.9, 30],
      [29.999, 30],
    ])('rounds %p to %p (whole numbers, min 1)', (input, expected) => {
      expect(niceRound(input)).toBe(expected);
    });
  });

  describe('Branch 3: values equal to or greater than 30 (n >= 30)', () => {
    it.each([
      [30, 30],
      [30.0, 30],
      [32.4, 30],
      [32.49, 30],
      [32.5, 35],
      [33, 35],
      [37.49, 35],
      [37.5, 40],
      [38, 40],
      [73.75, 75],
      [100, 100],
      [110.72, 110],
      [112.5, 115],
      [999.9, 1000],
    ])('snaps %p to nearest 5: %p', (input, expected) => {
      expect(niceRound(input)).toBe(expected);
    });
  });
});
