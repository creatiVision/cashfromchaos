import {
  buildLedger,
  netPayout,
  stripeConfigured,
  paypalConfigured,
  baseUrl,
  createCheckout,
} from './payments';
import { Item, LedgerEntry } from './types';

function mockItem(
  paymentAmount: number,
  channelName: string,
  feePct?: number,
  labelCost?: number,
  carrier?: string
): Item {
  return {
    id: 'item-123',
    payment: { amount: paymentAmount, provider: 'simulated', status: 'pending' },
    plan: {
      primary: {
        name: channelName,
        feePct: feePct,
      },
    },
    fulfillment: labelCost !== undefined ? { labelCost, carrier } : undefined,
    analysis: { title: 'Test Product' },
    ledger: [],
  } as unknown as Item;
}

describe('payments module', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('stripeConfigured', () => {
    it('returns true when STRIPE_SECRET_KEY is set', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      expect(stripeConfigured()).toBe(true);
    });

    it('returns false when STRIPE_SECRET_KEY is missing', () => {
      delete process.env.STRIPE_SECRET_KEY;
      expect(stripeConfigured()).toBe(false);
    });
  });

  describe('paypalConfigured', () => {
    it('returns true when both PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are set', () => {
      process.env.PAYPAL_CLIENT_ID = 'client_id';
      process.env.PAYPAL_CLIENT_SECRET = 'client_secret';
      expect(paypalConfigured()).toBe(true);
    });

    it('returns false when PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET is missing', () => {
      delete process.env.PAYPAL_CLIENT_ID;
      process.env.PAYPAL_CLIENT_SECRET = 'client_secret';
      expect(paypalConfigured()).toBe(false);

      process.env.PAYPAL_CLIENT_ID = 'client_id';
      delete process.env.PAYPAL_CLIENT_SECRET;
      expect(paypalConfigured()).toBe(false);
    });
  });

  describe('baseUrl', () => {
    it('returns NEXT_PUBLIC_BASE_URL if configured', () => {
      process.env.NEXT_PUBLIC_BASE_URL = 'https://demo.example.com';
      expect(baseUrl()).toBe('https://demo.example.com');
    });

    it('returns fallback localhost URL if NEXT_PUBLIC_BASE_URL is not set', () => {
      delete process.env.NEXT_PUBLIC_BASE_URL;
      expect(baseUrl()).toBe('http://localhost:3000');
    });
  });

  describe('buildLedger', () => {
    it('should create a basic ledger with no fee and no shipping', () => {
      const item = mockItem(100, 'Direct', 0);
      const ledger = buildLedger(item);

      expect(ledger).toEqual([
        { label: 'Buyer payment (Direct)', amount: 100, kind: 'revenue' },
      ]);
    });

    it('should default feePct to 0 if feePct is undefined or null', () => {
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

    it('should ignore shipping entry if labelCost is 0 or negative', () => {
      const item0 = mockItem(100, 'Direct', 0, 0, 'FedEx');
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
    it('returns 0 for an item with an empty ledger', () => {
      const item = mockItem(100, 'Direct');
      item.ledger = [];
      expect(netPayout(item)).toBe(0);
    });

    it('sums positive and negative ledger amounts correctly', () => {
      const item = mockItem(100, 'eBay');
      item.ledger = [
        { label: 'Buyer payment (eBay)', amount: 100, kind: 'revenue' },
        { label: 'Marketplace fee (10%)', amount: -10, kind: 'fee' },
        { label: 'Shipping label (DHL)', amount: -4.99, kind: 'shipping' },
      ];
      expect(netPayout(item)).toBe(85.01);
    });

    it('should correctly sum custom ledger entry amounts', () => {
      const item = {
        ledger: [
          { label: 'Buyer payment (eBay)', amount: 100, kind: 'revenue' },
          { label: 'Marketplace fee (10%)', amount: -10, kind: 'fee' },
          { label: 'Shipping label (UPS)', amount: -5.5, kind: 'shipping' },
        ] as LedgerEntry[],
      } as Item;

      expect(netPayout(item)).toEqual(84.5);
    });

    it('rounds calculation result using round2', () => {
      const item = mockItem(100, 'eBay');
      item.ledger = [
        { label: 'Payment', amount: 10.001, kind: 'revenue' },
        { label: 'Fee', amount: -0.0004, kind: 'fee' },
      ];
      expect(netPayout(item)).toBe(10);
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

  describe('createCheckout', () => {
    it('uses simulated provider when requested provider is unconfigured', async () => {
      delete process.env.STRIPE_SECRET_KEY;
      delete process.env.PAYPAL_CLIENT_ID;
      delete process.env.PAYPAL_CLIENT_SECRET;
      process.env.PAYMENT_PROVIDER = 'stripe';

      const item = mockItem(150, 'eBay');
      const checkout = await createCheckout(item);

      expect(checkout.provider).toBe('simulated');
      expect(checkout.sessionId).toBe('sim_item-123');
      expect(checkout.url).toBe(
        'http://localhost:3000/api/checkout/confirm?item=item-123&session=sim_item-123&sim=1'
      );
    });

    it('respects custom origin parameter', async () => {
      delete process.env.STRIPE_SECRET_KEY;
      const item = mockItem(150, 'eBay');
      const checkout = await createCheckout(item, 'https://custom-origin.com');

      expect(checkout.url).toBe(
        'https://custom-origin.com/api/checkout/confirm?item=item-123&session=sim_item-123&sim=1'
      );
    });

    it('uses paypal provider when paypal is configured and requested', async () => {
      process.env.PAYMENT_PROVIDER = 'paypal';
      process.env.PAYPAL_CLIENT_ID = 'id';
      process.env.PAYPAL_CLIENT_SECRET = 'secret';

      const item = mockItem(200, 'Direct');
      const checkout = await createCheckout(item, 'http://localhost:3000');

      expect(checkout.provider).toBe('paypal');
      expect(checkout.sessionId).toBe('pp_item-123');
      expect(checkout.url).toBe(
        'http://localhost:3000/api/checkout/confirm?item=item-123&session=pp_item-123&provider=paypal'
      );
    });
  });
});
