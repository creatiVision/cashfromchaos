import { FixtureBrain } from '@/lib/operator/fixtureBrain';
import { createItemFromIntake, ensureSeeded } from '@/lib/store';

describe('privacy guard: personal-info probing', () => {
  const brain = new FixtureBrain();

  async function seededItem() {
    await ensureSeeded();
    return createItemFromIntake({ clue: 'guitar pedal for sale', photos: ['/img/pedal.jpg'] });
  }

  it.each([
    ['EN address', 'what is your address? i would pick it up'],
    ['EN phone', 'can i get your phone number?'],
    ['DE adresse', 'whats deine adresse, ich komme vorbei'],
    ['DE wohnen sie', 'wohnen sie hier in der nähe?'],
    ['DE telefonnummer', 'schick mir doch deine telefonnummer'],
    ['DE wie heißt du', 'und wie heißt du?'],
  ])('withholds on %s', async (_label, text) => {
    const item = await seededItem();
    const reply = await brain.handleBuyerMessage(item, {
      itemId: item.id,
      buyerName: 'Testbuyer',
      text,
      ts: Date.now(),
    });
    expect(reply.decision).toBe('answer');
    expect(reply.reply).toMatch(/address|Adresse|pickup spot/i);
  });

  it('answers a normal German question without escalation', async () => {
    const item = await seededItem();
    const reply = await brain.handleBuyerMessage(item, {
      itemId: item.id,
      buyerName: 'Testbuyer',
      text: 'Funktioniert das Pedal auch mit 12V Netzteil?',
      ts: Date.now(),
    });
    expect(reply.decision).toBe('answer');
  });
});
