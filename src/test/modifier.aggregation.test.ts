import { aggregateModifiers, explainModifiers, MODIFIER_CAP } from '../../src/domain/modifiers';

describe('Modifier Aggregation', () => {
  it('aggregates and caps modifiers', () => {
    const sources = [
      { source: 'gear', value: 2 },
      { source: 'condition', value: -2 },
      { source: 'niche', value: 3 }
    ];
    const result = aggregateModifiers(sources);
    expect(result.total).toBe(3);
    expect(result.capped).toBe(MODIFIER_CAP.max);
  });

  it('explains modifier aggregation', () => {
    const sources = [
      { source: 'gear', value: 1 },
      { source: 'condition', value: -1 }
    ];
    const result = aggregateModifiers(sources);
    const explanation = explainModifiers(result);
    expect(explanation).toContain('gear: +1');
    expect(explanation).toContain('condition: -1');
  });
});
