import { createItemFromIntake, getItem, resetDemo } from './store';
import { getOperator } from './operator';
import type {
  ItemIntake,
  ItemAnalysis,
  MarketplacePlan,
  CommercePolicy,
  ListingDraft,
  OperatorBrain,
} from './types';

jest.mock('./operator', () => ({
  getOperator: jest.fn(),
}));

describe('createItemFromIntake', () => {
  const mockIntake: ItemIntake = {
    clue: 'Vintage Synthesizer',
    photos: ['https://example.com/synth.jpg'],
    notes: 'In good working condition',
  };

  const mockAnalysis: ItemAnalysis = {
    title: 'Vintage Synthesizer',
    category: 'Musical Instruments',
    detectedAttributes: { Brand: 'Moog' },
    condition: 'good',
    confidence: 'high',
    rationale: ['Clear photos', 'Known brand'],
    missingInfo: [],
    flags: [],
    estimatedMarketLow: 300,
    estimatedMarketHigh: 500,
    fulfillment: 'shipping',
  };

  const mockPlan: MarketplacePlan = {
    primary: {
      channelId: 'ebay-de',
      name: 'eBay DE',
      fitScore: 0.95,
      reason: 'High demand for vintage synths',
      feePct: 10,
      shippingFriendly: true,
    },
    alternates: [],
    bundleRecommended: false,
    strategy: ['List at high market value'],
  };

  const mockPolicy: CommercePolicy = {
    currency: 'EUR',
    targetPrice: 400,
    floorPrice: 300,
    autoAcceptAtOrAbove: 380,
    autoCounterDownTo: 320,
    requireHumanBelow: 300,
    maxFulfillmentSpend: 20,
    allowedPaymentMethods: ['stripe'],
    allowedChannels: ['ebay-de'],
    shippingAllowed: true,
    pickupAllowed: false,
    suspiciousBuyerEscalation: true,
  };

  const mockListings: ListingDraft[] = [
    {
      channelId: 'ebay-de',
      title: 'Vintage Moog Synthesizer - Excellent Condition',
      body: 'Up for sale is a vintage synthesizer...',
      tags: ['synth', 'moog', 'vintage'],
      price: 400,
      currency: 'EUR',
    },
  ];

  let mockBrain: jest.Mocked<OperatorBrain>;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockBrain = {
      name: 'MockOperatorBrain',
      analyzeItem: jest.fn().mockResolvedValue({ ...mockAnalysis }),
      chooseMarketplace: jest.fn().mockResolvedValue({ ...mockPlan }),
      buildPolicy: jest.fn().mockResolvedValue({ ...mockPolicy }),
      draftListings: jest.fn().mockResolvedValue([...mockListings]),
      handleBuyerMessage: jest.fn(),
      decideFulfillment: jest.fn(),
    };

    (getOperator as jest.Mock).mockReturnValue(mockBrain);
    await resetDemo();
  });

  it('creates an item with default id and timestamp when options are omitted', async () => {
    const item = await createItemFromIntake(mockIntake);

    expect(item).toBeDefined();
    expect(item.id).toMatch(/^item_/);
    expect(typeof item.createdAt).toBe('number');
    expect(item.createdAt).toBeGreaterThan(0);
    expect(item.intake).toEqual(mockIntake);
    expect(item.analysis).toEqual(mockAnalysis);
    expect(item.plan).toEqual(mockPlan);
    expect(item.policy).toEqual(mockPolicy);
    expect(item.listings).toEqual(mockListings);
    expect(item.status).toBe('listed');
    expect(item.messages).toEqual([]);
    expect(item.agentReplies).toEqual([]);
    expect(item.payment).toEqual({ provider: 'simulated', status: 'none', amount: 0 });
    expect(item.ledger).toEqual([]);

    expect(mockBrain.analyzeItem).toHaveBeenCalledWith(mockIntake);
    expect(mockBrain.chooseMarketplace).toHaveBeenCalledWith(mockAnalysis);
    expect(mockBrain.buildPolicy).toHaveBeenCalledWith(mockAnalysis, mockPlan);
    expect(mockBrain.draftListings).toHaveBeenCalledWith(mockAnalysis, mockPlan, mockPolicy);
  });

  it('uses custom options when provided (opts.id and opts.createdAt)', async () => {
    const customId = 'custom_item_123';
    const customCreatedAt = 1600000000000;

    const item = await createItemFromIntake(mockIntake, {
      id: customId,
      createdAt: customCreatedAt,
    });

    expect(item.id).toBe(customId);
    expect(item.createdAt).toBe(customCreatedAt);
  });

  it('persists the created item in the store', async () => {
    const item = await createItemFromIntake(mockIntake, { id: 'test_store_item' });

    const retrievedItem = getItem('test_store_item');
    expect(retrievedItem).toEqual(item);
  });

  it('logs correct trace events when missingInfo is empty', async () => {
    const item = await createItemFromIntake(mockIntake);

    expect(item.trace.length).toBe(5);
    expect(item.trace[0]).toMatchObject({
      actor: 'seller',
      label: 'Item submitted',
      detail: '"Vintage Synthesizer"',
    });
    expect(item.trace[1]).toMatchObject({
      actor: 'operator',
      label: 'Analyzed: Vintage Synthesizer',
      level: 'decision',
    });
    expect(item.trace[2]).toMatchObject({
      actor: 'operator',
      label: 'Routed to eBay DE',
      level: 'decision',
    });
    expect(item.trace[3]).toMatchObject({
      actor: 'operator',
      label: 'Policy set',
      level: 'decision',
    });
    expect(item.trace[4]).toMatchObject({
      actor: 'system',
      label: 'Listing live on eBay DE',
      detail: 'Vintage Moog Synthesizer - Excellent Condition',
    });
  });

  it('logs warning trace event when missingInfo is present in analysis', async () => {
    const analysisWithMissingInfo: ItemAnalysis = {
      ...mockAnalysis,
      missingInfo: [
        {
          id: 'q1',
          reason: 'Price determination',
          question: 'Does it include the power adapter?',
        },
        {
          id: 'q2',
          reason: 'Condition assessment',
          question: 'Are all keys functional?',
        },
      ],
    };

    mockBrain.analyzeItem.mockResolvedValueOnce(analysisWithMissingInfo);

    const item = await createItemFromIntake(mockIntake);

    expect(item.trace.length).toBe(6);
    const warnTrace = item.trace.find((t) => t.level === 'warn');
    expect(warnTrace).toBeDefined();
    expect(warnTrace).toMatchObject({
      actor: 'operator',
      label: 'Needs 2 critical detail(s)',
      detail: 'Does it include the power adapter? | Are all keys functional?',
      level: 'warn',
    });
  });
});
