import { niceRound } from '../money';

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
