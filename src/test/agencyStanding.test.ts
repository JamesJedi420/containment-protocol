import { buildAgencySummary } from '../domain/agency';
import { buildAgencyRanking } from '../domain/rankings';
import type { GameState } from '../domain/models';

describe('Agency Standing & Ranking', () => {
  it('computes ranking tier and score deterministically from campaign state', () => {
    const game: GameState = {
      // Minimal stub for deterministic test
      agency: { containmentRating: 80, clearanceLevel: 3, funding: 120 },
      containmentRating: 80,
      clearanceLevel: 3,
      funding: 120,
      teams: {},
      cases: {},
      events: [],
      reports: [],
      market: { pressure: 'stable', featuredRecipeId: '', costMultiplier: 1 },
      config: { maxActiveCases: 3 },
      agents: {},
      productionQueue: [],
      inventory: {},
    } as any;
    const summary = buildAgencySummary(game);
    const ranking = buildAgencyRanking(game);
    expect(summary.ranking.score).toBe(ranking.score);
    expect(['S', 'A', 'B', 'C', 'D']).toContain(summary.ranking.tier);
  });

  it('ranking penalizes unresolved and failed cases', () => {
    const game: GameState = {
      ...({} as any),
      agency: { containmentRating: 60, clearanceLevel: 2, funding: 80 },
      containmentRating: 60,
      clearanceLevel: 2,
      funding: 80,
      teams: {},
      cases: {},
      events: [],
      reports: [
        {
          week: 1,
          resolvedCases: [],
          partialCases: [],
          failedCases: [1, 2],
          unresolvedTriggers: [3],
          notes: [],
        },
      ],
      market: { pressure: 'tight', featuredRecipeId: '', costMultiplier: 1 },
      config: { maxActiveCases: 3 },
      agents: {},
      productionQueue: [],
      inventory: {},
    } as any;
    const summary = buildAgencySummary(game);
    expect(summary.ranking.score).toBeLessThan(50);
    expect(['C', 'D']).toContain(summary.ranking.tier);
  });
});
