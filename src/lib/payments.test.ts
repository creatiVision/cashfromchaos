import { buildLedger } from './payments';
import { Item } from './types';

function mockItem(paymentAmount: number, channelName: string, feePct: number, labelCost?: number, carrier?: string): Item {
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
