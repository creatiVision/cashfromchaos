import { FixtureBrain } from '../operator/fixtureBrain';
import type { ItemIntake } from '../types';

describe('FixtureBrain', () => {
  const brain = new FixtureBrain();

  it('correctly analyzes item without answers', async () => {
    const intake: ItemIntake = {
      clue: 'Game Boy Color',
      photos: [],
      notes: 'Good condition',
    };
    const analysis = await brain.analyzeItem(intake);
    expect(analysis.title).toBeDefined();
    expect(analysis.estimatedMarketLow).toBeGreaterThan(0);
    expect(analysis.estimatedMarketHigh).toBeGreaterThan(0);
  });

  it('correctly refines price band with positive condition answers', async () => {
    const baseIntake: ItemIntake = { clue: 'Game Boy Color', photos: [] };
    const baseAnalysis = await brain.analyzeItem(baseIntake);

    const refinedIntake: ItemIntake = {
      clue: 'Game Boy Color',
      photos: [],
      answers: {
        q1: 'Works perfectly',
        q2: 'Box + adapter included',
      },
    };
    const refinedAnalysis = await brain.analyzeItem(refinedIntake);

    expect(refinedAnalysis.estimatedMarketLow).toBeGreaterThan(baseAnalysis.estimatedMarketLow);
    expect(refinedAnalysis.estimatedMarketHigh).toBeGreaterThan(baseAnalysis.estimatedMarketHigh);
    expect(refinedAnalysis.rationale).toContain('Positive condition/accessory signal → band nudged up.');
  });

  it('correctly refines price band with faulty condition answers', async () => {
    const baseIntake: ItemIntake = { clue: 'Game Boy Color', photos: [] };
    const baseAnalysis = await brain.analyzeItem(baseIntake);

    const faultyIntake: ItemIntake = {
      clue: 'Game Boy Color',
      photos: [],
      answers: {
        q1: 'broken for parts',
      },
    };
    const faultyAnalysis = await brain.analyzeItem(faultyIntake);

    expect(faultyAnalysis.estimatedMarketLow).toBeLessThan(baseAnalysis.estimatedMarketLow);
    expect(faultyAnalysis.estimatedMarketHigh).toBeLessThan(baseAnalysis.estimatedMarketHigh);
    expect(faultyAnalysis.rationale).toContain('Seller reports faulty/for-parts → price band cut materially.');
  });

  it('correctly refines price band with minor condition answers', async () => {
    const minorIntake: ItemIntake = {
      clue: 'Game Boy Color',
      photos: [],
      answers: {
        q1: 'minor wear',
      },
    };
    const minorAnalysis = await brain.analyzeItem(minorIntake);
    expect(minorAnalysis.rationale).toContain('Minor wear noted → band held, mention honestly in listing.');
  });
});
