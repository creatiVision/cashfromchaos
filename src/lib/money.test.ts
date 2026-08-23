import { describe, it, expect } from 'vitest';
import { eur } from './money';

describe('eur', () => {
  it('formats zero correctly', () => {
    // some systems use non-breaking space (char code 160) between amount and currency
    const result = eur(0).replace(/\u00A0/g, ' ');
    expect(result).toBe('0,00 €');
  });

  it('formats positive integers correctly', () => {
    const result = eur(10).replace(/\u00A0/g, ' ');
    expect(result).toBe('10,00 €');
  });

  it('formats amounts with one decimal place correctly', () => {
    const result = eur(10.5).replace(/\u00A0/g, ' ');
    expect(result).toBe('10,50 €');
  });

  it('formats amounts with two decimal places correctly', () => {
    const result = eur(10.99).replace(/\u00A0/g, ' ');
    expect(result).toBe('10,99 €');
  });

  it('rounds amounts with more than two decimal places up correctly', () => {
    const result = eur(10.999).replace(/\u00A0/g, ' ');
    expect(result).toBe('11,00 €');
  });

  it('rounds amounts with more than two decimal places down correctly', () => {
    const result = eur(10.994).replace(/\u00A0/g, ' ');
    expect(result).toBe('10,99 €');
  });

  it('formats negative amounts correctly', () => {
    const result = eur(-10).replace(/\u00A0/g, ' ');
    expect(result).toBe('-10,00 €');
  });

  it('formats large amounts with thousands separators', () => {
    // 1234.56 -> 1234,56 € in es-ES format
    const result = eur(1234.56).replace(/\u00A0/g, ' ');
    expect(result).toBe('1234,56 €');
  });
});
