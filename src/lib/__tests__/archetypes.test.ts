import { ARCHETYPES, GENERIC_ARCHETYPE, findArchetype, matchArchetype } from '@/lib/operator/archetypes';
import { ADAPTERS } from '@/lib/marketplace/registry';

describe('matchArchetype', () => {
  it('routes English clues', () => {
    expect(matchArchetype('guitar pedal for sale').id).toBe('guitar-pedal');
    expect(matchArchetype('pokemon card binder').id).toBe('pokemon-cards');
  });

  it('routes German clues via the German keywords', () => {
    expect(matchArchetype('kinderwagen zu verkaufen').id).toBe('stroller');
    expect(matchArchetype('gitarren pedal abzugeben').id).toBe('guitar-pedal');
    expect(matchArchetype('16gb ddr4 ram rammspeicher').id).toBe('pc-components');
    expect(matchArchetype('alter sessel, nur abholung').id).toBe('furniture');
    expect(matchArchetype('gaming pc zu verkaufen').id).toBe('desktop-pc');
  });

  it('falls back to the generic archetype for unknown items', () => {
    expect(matchArchetype('irgendwas ganz anderes').id).toBe(GENERIC_ARCHETYPE.id);
  });
});

describe('findArchetype', () => {
  it('resolves stored archetype ids (used instead of title re-matching)', () => {
    expect(findArchetype('pc-components')?.channels[0]).toBe('ebay-de-mock');
    expect(findArchetype('does-not-exist')).toBeUndefined();
  });
});

describe('channel integrity', () => {
  it('every archetype channel id exists in the marketplace registry', () => {
    for (const a of [...ARCHETYPES, GENERIC_ARCHETYPE]) {
      for (const ch of a.channels) {
        expect(ADAPTERS[ch]).toBeDefined();
      }
    }
  });
});
