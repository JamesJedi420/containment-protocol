import { describe, it, expect } from 'vitest';
import { createDeadlineEscalationTransition } from '../domain/sim/escalation';
import { buildEscalationConsequenceNote } from '../domain/reportNotes';


const BASE_CASE = {
  id: 'case-esc-1',
  kind: 'incident',
  stage: 4, // Start at 4 so escalation brings to 5
  deadlineRemaining: 2,
  deadlineWeeks: 2,
  onUnresolved: { stageDelta: 1, deadlineResetWeeks: 2, convertToRaidAtStage: 5 },
  tags: ['containment-specialist'],
  threatFamily: 'containment',
};

describe('escalation consequence integration', () => {
  it('routes severe-hit outcomes for max escalation without countermeasures', () => {
    // Escalate to max stage without countermeasures
    const caseNoCounter = { ...BASE_CASE, tags: [] };
    const { nextCase } = createDeadlineEscalationTransition(caseNoCounter);
    expect(nextCase.stage).toBe(5);
    expect(nextCase.consequences).toContain('contained'); // Success band at stage 5
    expect(nextCase.severeHit).toContain('breach'); // Severe hit triggered
    const note = buildEscalationConsequenceNote(nextCase, 1);
    expect(note).not.toBeNull();
    expect(note?.content).toContain('Escalation Consequences');
    expect(note?.content).toContain('No effective countermeasures present.');
    expect(note?.metadata.severeHit).toContain('breach');
  });

  it('applies only consequence ladder if countermeasures present', () => {
    // Escalate with countermeasures
    const caseWithCounter = { ...BASE_CASE, tags: ['containment-specialist'] };
    const { nextCase } = createDeadlineEscalationTransition(caseWithCounter);
    expect(nextCase.consequences).toContain('contained');
    expect(nextCase.severeHit).toHaveLength(0);
    const note = buildEscalationConsequenceNote(nextCase, 1);
    expect(note).not.toBeNull();
    expect(note?.content).toContain('Effective countermeasures: containment-specialist');
    expect(note?.metadata.severeHit).toHaveLength(0);
  });

  it('routes catastrophic band consequences for low stage', () => {
    // Escalate from stage -1 to 0 (simulate catastrophic outcome)
    const catastrophicCase = { ...BASE_CASE, stage: -1, tags: [] };
    const { nextCase } = createDeadlineEscalationTransition(catastrophicCase);
    expect(nextCase.stage).toBe(0);
    expect(nextCase.consequences).toContain('breach'); // Catastrophic band
    expect(nextCase.severeHit).toHaveLength(0); // Not max stage, so no severe hit
  });
});
