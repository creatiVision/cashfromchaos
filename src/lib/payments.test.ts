import { buildLedger, netPayout, stripeConfigured, paypalConfigured, baseUrl } from './payments';
import { Item, LedgerEntry } from './types';

function mockItem(
  paymentAmount: number,
  channelName: string,
  feePct?: number,
  labelCost?: number,
  carrier?: string
): Item {
  return {
    payment: { amount: paymentAmount },
    plan: {
      primary: {
        name: channelName,
        feePct: feePct,
      },
    },
    fulfillment: labelCost !== undefined ? { labelCost, carrier } : undefined,
  } as unknown as Item;
}

describe('buildLedger', () => {
  it('should create a basic ledger with no fee and no shipping', () => {
    const item = mockItem(100, 'Direct', 0);
    const ledger = buildLedger(item);

    expect(ledger).toEqual([
      { label: 'Buyer payment (Direct)', amount: 100, kind: 'revenue' },
    ]);
  });

  it('should handle undefined feePct by defaulting to 0 fee', () => {
    const item = mockItem(100, 'Direct', undefined);
    const ledger = buildLedger(item);

    expect(ledger).toEqual([
      { label: 'Buyer payment (Direct)', amount: 100, kind: 'revenue' },
    ]);
  });

  it('should include marketplace fee when feePct is greater than 0', () => {
    const item = mockItem(100, 'eBay', 12.5);
    const ledger = buildLedger(item);

    expect(ledger).toEqual([
      { label: 'Buyer payment (eBay)', amount: 100, kind: 'revenue' },
      { label: 'Marketplace fee (12.5%)', amount: -12.5, kind: 'fee' },
    ]);
  });

  it('should include shipping cost when fulfillment has a labelCost', () => {
    const item = mockItem(100, 'Direct', 0, 5.5, 'FedEx');
    const ledger = buildLedger(item);

    expect(ledger).toEqual([
      { label: 'Buyer payment (Direct)', amount: 100, kind: 'revenue' },
      { label: 'Shipping label (FedEx)', amount: -5.5, kind: 'shipping' },
    ]);
  });

  it('should include generic carrier name if carrier is not provided but shipping cost is', () => {
    const item = mockItem(100, 'Direct', 0, 5.5);
    const ledger = buildLedger(item);

    expect(ledger).toEqual([
      { label: 'Buyer payment (Direct)', amount: 100, kind: 'revenue' },
      { label: 'Shipping label (carrier)', amount: -5.5, kind: 'shipping' },
    ]);
  });

  it('should exclude shipping label if labelCost is 0 or negative', () => {
    const item0 = mockItem(100, 'Direct', 0, 0, 'DHL');
    expect(buildLedger(item0)).toEqual([
      { label: 'Buyer payment (Direct)', amount: 100, kind: 'revenue' },
    ]);

    const itemNeg = mockItem(100, 'Direct', 0, -5, 'DHL');
    expect(buildLedger(itemNeg)).toEqual([
      { label: 'Buyer payment (Direct)', amount: 100, kind: 'revenue' },
    ]);
  });

  it('should include both marketplace fee and shipping costs', () => {
    const item = mockItem(200, 'Grailed', 9, 10, 'UPS');
    const ledger = buildLedger(item);

    expect(ledger).toEqual([
      { label: 'Buyer payment (Grailed)', amount: 200, kind: 'revenue' },
      { label: 'Marketplace fee (9%)', amount: -18, kind: 'fee' },
      { label: 'Shipping label (UPS)', amount: -10, kind: 'shipping' },
    ]);
  });

  it('should properly round fee values using round2', () => {
    // 100.55 * 12.345% = 12.4128975 => rounded to 12.41
    const item = mockItem(100.55, 'WeirdChannel', 12.345);
    const ledger = buildLedger(item);

    expect(ledger).toEqual([
      { label: 'Buyer payment (WeirdChannel)', amount: 100.55, kind: 'revenue' },
      { label: 'Marketplace fee (12.345%)', amount: -12.41, kind: 'fee' },
    ]);
  });
});

describe('netPayout', () => {
  it('should correctly sum ledger entry amounts', () => {
    const item = {
      ledger: [
        { label: 'Buyer payment (eBay)', amount: 100, kind: 'revenue' },
        { label: 'Marketplace fee (10%)', amount: -10, kind: 'fee' },
        { label: 'Shipping label (UPS)', amount: -5.5, kind: 'shipping' },
      ] as LedgerEntry[],
    } as Item;

    expect(netPayout(item)).toEqual(84.5);
  });

  it('should round the net payout to 2 decimal places', () => {
    const item = {
      ledger: [
        { label: 'Revenue', amount: 100.001, kind: 'revenue' },
        { label: 'Fee', amount: -12.345, kind: 'fee' },
      ] as LedgerEntry[],
    } as Item;

    expect(netPayout(item)).toEqual(87.66);
  });
});

describe('configuration helpers', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('stripeConfigured returns true only when STRIPE_SECRET_KEY is present', () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(stripeConfigured()).toBe(false);

    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    expect(stripeConfigured()).toBe(true);
  });

  it('paypalConfigured returns true only when both client id and secret are present', () => {
    delete process.env.PAYPAL_CLIENT_ID;
    delete process.env.PAYPAL_CLIENT_SECRET;
    expect(paypalConfigured()).toBe(false);

    process.env.PAYPAL_CLIENT_ID = 'client_123';
    expect(paypalConfigured()).toBe(false);

    process.env.PAYPAL_CLIENT_SECRET = 'secret_123';
    expect(paypalConfigured()).toBe(true);
  });

  it('baseUrl returns env variable or defaults to localhost', () => {
    delete process.env.NEXT_PUBLIC_BASE_URL;
    expect(baseUrl()).toBe('http://localhost:3000');

    process.env.NEXT_PUBLIC_BASE_URL = 'https://example.com';
    expect(baseUrl()).toBe('https://example.com');
  });
});
