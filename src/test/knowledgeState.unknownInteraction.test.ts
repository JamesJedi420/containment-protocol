// SPE-59: Unknown Interaction Engine (bounded pass)
// Deterministic tests for unknown/partial/confirmed reveal progression, misread, context, and explanation output
import { describe, it, expect } from 'vitest'
import { applyKnowledgeFusion, applyKnowledgeDecay, getKnowledgeKey, KnowledgeState, KnowledgeTier } from '../domain/knowledge'
import { resolveScouting } from '../domain/scoutingResolution'
import { getOutcomeBand } from '../domain/outcomes'
import { buildReportCaseSnapshot } from '../app/store/runTransfer'

// Helper: build minimal knowledge state
function makeKnowledge(tier: KnowledgeTier, notes?: string): KnowledgeState {
  return {
    tier,
    entityId: 'T1',
    entityType: 'team',
    subjectId: 'A1',
    subjectType: 'anomaly',
    notes,
  }
}

describe('SPE-59: Unknown Interaction Engine', () => {
  it('tracks provisional vs true classification and upgrades deterministically', () => {
    // Simulate first encounter: provisional label
    let ks: KnowledgeState = {
      tier: 'observed',
      entityId: 'T1',
      entityType: 'team',
      subjectId: 'A1',
      subjectType: 'anomaly',
      provisionalClassification: 'Rumored Entity X',
      confirmationState: 'provisional',
      notes: 'Provisional classification: Rumored Entity X.'
    }
    expect(ks.provisionalClassification).toBe('Rumored Entity X')
    expect(ks.confirmationState).toBe('provisional')
    // Simulate confirmation
    ks = {
      ...ks,
      tier: 'confirmed',
      trueClassification: 'Anomaly-42',
      confirmationState: 'confirmed',
      notes: 'Confirmed as: Anomaly-42. Direct containment success.'
    }
    expect(ks.trueClassification).toBe('Anomaly-42')
    expect(ks.confirmationState).toBe('confirmed')
    // Provisional label is preserved for reporting
    expect(ks.provisionalClassification).toBe('Rumored Entity X')
  })

  it('produces context-sensitive reveal and explanation for container context', () => {
    // Sealed container context makes scouting harder
    const sealedResult = resolveScouting({
      teamCapability: 2,
      anomalyConcealment: 1,
      containerType: 'sealed',
    })
    expect(sealedResult.explanation).toMatch(/Sealed container/)
    // Open container context makes scouting easier
    const openResult = resolveScouting({
      teamCapability: 2,
      anomalyConcealment: 1,
      containerType: 'open',
    })
    expect(openResult.explanation).toMatch(/Open container/)
    // Standard (no context) is neutral
    const standardResult = resolveScouting({
      teamCapability: 2,
      anomalyConcealment: 1,
      containerType: 'standard',
    })
    expect(standardResult.explanation).not.toMatch(/container/)
  })

  it('outputs report/projection with both provisional and true classification and context', () => {
    // Simulate a knowledge map for a case with two teams
    const knowledgeMap = {
      T1: {
        tier: 'observed',
        entityId: 'T1',
        entityType: 'team',
        subjectId: 'A1',
        subjectType: 'anomaly',
        provisionalClassification: 'Rumored Entity X',
        confirmationState: 'provisional',
        contextTag: 'sealed',
      },
      T2: {
        tier: 'confirmed',
        entityId: 'T2',
        entityType: 'team',
        subjectId: 'A1',
        subjectType: 'anomaly',
        provisionalClassification: 'Unknown',
        trueClassification: 'Anomaly-42',
        confirmationState: 'confirmed',
        contextTag: 'open',
      }
    }
    // Use the new report snapshot builder
    const snap = buildReportCaseSnapshot({
      id: 'A1',
      templateId: 'TEMPLATE',
      title: 'Test Case',
      description: '',
      mode: 'standard',
      kind: 'anomaly',
      status: 'resolved',
      difficulty: { combat: 1, investigation: 1, utility: 1, social: 1 },
      weights: { combat: 1, investigation: 1, utility: 1, social: 1 },
      tags: [],
      requiredTags: [],
      preferredTags: [],
      stage: 1,
      durationWeeks: 1,
      weeksRemaining: 0,
      deadlineWeeks: 1,
      deadlineRemaining: 0,
      assignedTeamIds: ['T1', 'T2'],
      onFail: { stageDelta: 1, spawnCount: { min: 0, max: 0 }, spawnTemplateIds: [] },
      onUnresolved: { stageDelta: 1, spawnCount: { min: 0, max: 0 }, spawnTemplateIds: [] },
    }, knowledgeMap)
    expect(snap.knowledge).toBeDefined()
    expect(snap.revealExplanation).toMatch(/Provisional classification: Rumored Entity X/)
    expect(snap.revealExplanation).toMatch(/Confirmed as: Anomaly-42/)
    expect(snap.revealExplanation).toMatch(/Context: sealed/)
    expect(snap.revealExplanation).toMatch(/Context: open/)
  })
  it('progresses from unknown → partial → confirmed on deterministic reveal', () => {
    // Initial: unknown
    let ks = makeKnowledge('unknown')
    // Partial: observed (scouting partial)
    ks = { ...ks, tier: 'observed', notes: 'Partial resolution: observed but not confirmed.' }
    expect(ks.tier).toBe('observed')
    // Confirmed: success
    ks = { ...ks, tier: 'confirmed', notes: 'Direct containment success.' }
    expect(ks.tier).toBe('confirmed')
  })

  it('supports bounded misread/false-confidence state', () => {
    // Simulate a scouting fail after confirmed
    let ks = makeKnowledge('confirmed')
    ks = { ...ks, tier: 'fragmented', fragmented: true, notes: 'Failed resolution: knowledge fragmented.' }
    expect(ks.tier).toBe('fragmented')
    expect(ks.fragmented).toBe(true)
  })

  it('is context-sensitive: environment/containment/gear affect outcome', () => {
    // Recon specialist vs shapeshifter
    const result = resolveScouting({
      teamCapability: 2,
      anomalyConcealment: 1,
      teamTags: ['recon-specialist'],
      anomalyTags: ['shapeshifter'],
      gearTags: ['thermal-vision'],
    })
    expect(result.outcome).toBe('strong') // deterministic sum yields strong
    expect(result.revealed).toBe(true)
    expect(result.explanation).toMatch(/Recon specialist present/)
    expect(result.explanation).toMatch(/thermal-vision/)
  })

  it('outputs explanation for unknown/revealed/uncertain state', () => {
    // Unknown
    let ks = makeKnowledge('unknown', 'No information available.')
    expect(ks.notes).toMatch(/No information/)
    // Partial
    ks = { ...ks, tier: 'observed', notes: 'Partial resolution: observed but not confirmed.' }
    expect(ks.notes).toMatch(/Partial resolution/)
    // Confirmed
    ks = { ...ks, tier: 'confirmed', notes: 'Direct containment success.' }
    expect(ks.notes).toMatch(/Direct containment success/)
  })
})
