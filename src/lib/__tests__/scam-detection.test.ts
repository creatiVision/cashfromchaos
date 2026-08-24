import { FixtureBrain } from '@/lib/operator/fixtureBrain';
import { createItemFromIntake, ensureSeeded } from '@/lib/store';

describe('negotiation scam detection', () => {
  const brain = new FixtureBrain();

  async function itemWithDeal() {
    await ensureSeeded();
    const item = await createItemFromIntake({
      clue: 'guitar pedal for sale',
      photos: ['/img/pedal.jpg'],
    });
    // Establish an agreed deal so offers flow into the price path.
    return { item, brain };
  }

  const cases: [string, string][] = [
    ['EN paypal friends', 'lets do this via paypal friends and family'],
    ['DE paypal freunde', 'zahlung per PayPal Freunde, dann sparen wir die Gebühren'],
    ['DE freundschaftszahlung', 'ich mache eine Freundschaftszahlung'],
    ['DE geschenkkarte', 'ich zahle mit einer Geschenkkarte'],
    ['DE überweisung', 'zahlen wir per überweisung ab'],
    ['EN overpay', 'i pay you more than asking if you ship today'],
  ];

  it.each(cases)('escalates on %s', async (_label, text) => {
    const { item } = await itemWithDeal();
    const reply = await brain.handleBuyerMessage(item, {
      itemId: item.id,
      buyerName: 'Testbuyer',
      text,
      ts: Date.now(),
    });
    expect(reply.decision).toBe('escalate-human');
  });

  it('does not escalate a normal on-platform offer', async () => {
    const { item } = await itemWithDeal();
    const reply = await brain.handleBuyerMessage(item, {
      itemId: item.id,
      buyerName: 'Testbuyer',
      text: 'Würde dir 90€ geben, bezahle direkt hier über den Link.',
      ts: Date.now(),
    });
    expect(reply.decision).not.toBe('escalate-human');
  });
});

describe('negotiation scam detection (extra DE overpay)', () => {
  const brain = new FixtureBrain();

  it('escalates on "ich zahle dir mehr"', async () => {
    await ensureSeeded();
    const item = await createItemFromIntake({ clue: 'guitar pedal for sale', photos: ['/img/pedal.jpg'] });
    const reply = await brain.handleBuyerMessage(item, {
      itemId: item.id,
      buyerName: 'Testbuyer',
      text: 'Ich zahle dir mehr wenn du heute versendest',
      ts: Date.now(),
    });
    expect(reply.decision).toBe('escalate-human');
  });
});
