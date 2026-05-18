import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type {
  AutomationActionRecord,
  AutomationConflictClaim,
  InstitutionalAutomationEntry,
} from '../domain/institutionalAutomationRegistry'
import {
  collectInstitutionalAutomationTokens,
  institutionalAutomationTokensContainFranchiseReferences,
  projectAutomationFeedForOperator,
  resolveAutomationConflict,
  validateAutomationEntry,
} from '../domain/institutionalAutomationRegistry'

function baseAction(
  overrides: Partial<AutomationActionRecord> = {}
): AutomationActionRecord {
  return {
    actionId: 'act-base',
    automationId: 'auto:perimeter-scan-1',
    week: 4,
    triggerRuleId: 'rule:corridor-threshold',
    operatorId: 'operator:shift-lead',
    confidence: 'medium',
    sensorInputs: [{ sensorId: 'sensor:thermal-1', readingCode: 'heat_spike', strength: 0.72 }],
    actionTaken: 'Issued corridor hold advisory',
    reviewed: true,
    provenanceTag: 'dispatch_log',
    ...overrides,
  }
}

function baseEntry(
  overrides: Partial<InstitutionalAutomationEntry> = {}
): InstitutionalAutomationEntry {
  return {
    id: 'auto:perimeter-scan-1',
    label: 'Perimeter Scan Agent',
    roleClass: 'observe',
    authorityTier: 'task_execution',
    personhoodStatus: 'tool',
    sensorSuite: [{ sensorId: 'sensor:thermal-1', channel: 'thermal', reliability: 0.85 }],
    overridePath: {
      requiresHumanAck: true,
      escalationNodeIds: ['node:perimeter-ops'],
    },
    ownerNodeId: 'node:perimeter-ops',
    trustScore: 72,
    compromiseStatus: 'none',
    failureMode: 'false_negative',
    auditState: 'active',
    actionLog: [baseAction()],
    ...overrides,
  }
}

describe('institutionalAutomationRegistry slice 1 (SPE-2101)', () => {
  it('1. two bots with different roleClass + authorityTier validate independently', () => {
    const patrolBot = baseEntry({
      id: 'auto:patrol-relay-1',
      label: 'Corridor Patrol Relay',
      roleClass: 'patrol',
      authorityTier: 'field_autonomy',
      dueProcessHookIds: ['hook:patrol-oversight'],
      actionLog: [
        baseAction({
          actionId: 'act-patrol-1',
          automationId: 'auto:patrol-relay-1',
        }),
      ],
    })
    const archiveBot = baseEntry({
      id: 'auto:records-index-1',
      label: 'Records Index Automaton',
      roleClass: 'archive',
      authorityTier: 'records_alteration',
      dueProcessHookIds: ['hook:records-review'],
      actionLog: [
        baseAction({
          actionId: 'act-records-1',
          automationId: 'auto:records-index-1',
          actionTaken: 'Reindexed corridor incident packet',
        }),
      ],
    })

    expect(validateAutomationEntry(patrolBot).valid).toBe(true)
    expect(validateAutomationEntry(archiveBot).valid).toBe(true)
  })

  it('2. seed entry may lack action audit trail when explicitly marked seed/provisional', () => {
    const seedEntry = baseEntry({
      auditState: 'seed',
      seedRecord: true,
      actionLog: [],
    })
    const provisionalEntry = baseEntry({
      id: 'auto:provisional-1',
      auditState: 'provisional',
      actionLog: [],
    })

    expect(validateAutomationEntry(seedEntry).valid).toBe(true)
    expect(validateAutomationEntry(provisionalEntry).valid).toBe(true)
  })

  it('3. non-seed entry without audit trail errors', () => {
    const result = validateAutomationEntry(
      baseEntry({
        auditState: 'active',
        actionLog: [],
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'non_seed_missing_audit_trail')).toBe(true)
  })

  it('4. franchise/source-like bot name pattern errors', () => {
    const result = validateAutomationEntry(
      baseEntry({
        id: 'auto:mobile-task-force-scanner',
        label: 'Mobile Task Force Scanner',
      })
    )

    expect(result.valid).toBe(false)
    expect(
      result.issues.some(
        (issue) =>
          issue.code === 'franchise_token_in_id' || issue.code === 'franchise_token_in_label'
      )
    ).toBe(true)
  })

  it('rejects sensor reliability below 0 before normalization', () => {
    const result = validateAutomationEntry(
      baseEntry({
        sensorSuite: [{ sensorId: 'sensor:thermal-1', channel: 'thermal', reliability: -0.2 }],
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'invalid_sensor_reliability')).toBe(true)
  })

  it('rejects sensor reliability above 1 before normalization', () => {
    for (const reliability of [1.5, 1.8]) {
      const result = validateAutomationEntry(
        baseEntry({
          sensorSuite: [{ sensorId: 'sensor:thermal-1', channel: 'thermal', reliability }],
        })
      )

      expect(result.valid).toBe(false)
      expect(result.issues.some((issue) => issue.code === 'invalid_sensor_reliability')).toBe(true)
    }
  })

  it('accepts sensor reliability at 0 and 1', () => {
    for (const reliability of [0, 1]) {
      const result = validateAutomationEntry(
        baseEntry({
          sensorSuite: [{ sensorId: 'sensor:thermal-1', channel: 'thermal', reliability }],
        })
      )

      expect(result.issues.some((issue) => issue.code === 'invalid_sensor_reliability')).toBe(false)
    }
  })

  it('rejects malformed non-number sensor reliability without throwing', () => {
    const entry = baseEntry({
      sensorSuite: [{ sensorId: 'sensor:thermal-1', channel: 'thermal', reliability: 0.5 }],
    })
    ;(entry.sensorSuite[0] as { reliability: unknown }).reliability = 'bad'

    expect(() => validateAutomationEntry(entry)).not.toThrow()
    const result = validateAutomationEntry(entry)
    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'invalid_sensor_reliability')).toBe(true)
  })

  it('5. objective-truth output without confidence errors', () => {
    const validObjective = validateAutomationEntry(
      baseEntry({
        actionLog: [
          baseAction({
            actionId: 'act-objective-valid',
            assertsObjectiveTruth: true,
            confidence: 'verified',
          }),
        ],
      })
    )

    expect(validObjective.valid).toBe(true)
    expect(
      validObjective.issues.some((issue) => issue.code === 'objective_truth_without_confidence')
    ).toBe(false)

    const invalidAction = baseAction({
      actionId: 'act-invalid-confidence',
      assertsObjectiveTruth: true,
      confidence: 'verified',
    })
    ;(invalidAction as { confidence: string }).confidence = 'invalid-confidence'

    const badResult = validateAutomationEntry(
      baseEntry({
        actionLog: [invalidAction],
      })
    )

    expect(badResult.valid).toBe(false)
    expect(badResult.issues.some((issue) => issue.code === 'objective_truth_without_confidence')).toBe(
      true
    )
  })

  it('6. surveillance/emergency tier without due-process hook IDs warns', () => {
    const surveillanceWarning = validateAutomationEntry(
      baseEntry({
        roleClass: 'observe',
        authorityTier: 'field_autonomy',
        dueProcessHookIds: [],
      })
    )

    expect(surveillanceWarning.valid).toBe(true)
    expect(
      surveillanceWarning.issues.some((issue) => issue.code === 'surveillance_tier_missing_due_process')
    ).toBe(true)

    const emergencyWarning = validateAutomationEntry(
      baseEntry({
        roleClass: 'archive',
        authorityTier: 'emergency_override',
        dueProcessHookIds: undefined,
      })
    )

    expect(
      emergencyWarning.issues.some((issue) => issue.code === 'emergency_tier_missing_due_process')
    ).toBe(true)
  })

  it('7. audit action record includes trigger, operator, confidence, sensor inputs, action taken, and reviewed flag', () => {
    const entry = baseEntry()
    const action = entry.actionLog[0]

    expect(action?.triggerRuleId).toBe('rule:corridor-threshold')
    expect(action?.operatorId).toBe('operator:shift-lead')
    expect(action?.confidence).toBe('medium')
    expect(action?.sensorInputs.length).toBeGreaterThan(0)
    expect(action?.actionTaken.length).toBeGreaterThan(0)
    expect(action?.reviewed).toBe(true)
    expect(validateAutomationEntry(entry).valid).toBe(true)
  })

  it('8. conflict resolver returns deterministic winner metadata', () => {
    const recordsBot = baseEntry({
      id: 'auto:records-bot',
      roleClass: 'archive',
      authorityTier: 'records_alteration',
      trustScore: 60,
    })
    const sensorBot = baseEntry({
      id: 'auto:sensor-bot',
      roleClass: 'observe',
      authorityTier: 'task_execution',
      trustScore: 90,
    })
    const claims: AutomationConflictClaim[] = [
      {
        claimId: 'claim-b',
        subjectRef: 'corridor-7',
        source: 'sensors',
        assertedSummary: 'Heat anomaly detected',
        confidence: 'high',
      },
      {
        claimId: 'claim-a',
        subjectRef: 'corridor-7',
        source: 'records',
        assertedSummary: 'Corridor already cleared in records',
        confidence: 'medium',
      },
    ]

    const first = resolveAutomationConflict(recordsBot, sensorBot, claims)
    const second = resolveAutomationConflict(recordsBot, sensorBot, claims)

    expect(first).toEqual(second)
    expect(first.winnerBotId).toBe('auto:records-bot')
    expect(first.reasonCode).toBe('higher_authority_tier')
  })

  it('9. conflict resolver preserves both claims in output', () => {
    const botA = baseEntry({ id: 'auto:a', roleClass: 'archive', authorityTier: 'advisory' })
    const botB = baseEntry({
      id: 'auto:b',
      roleClass: 'observe',
      authorityTier: 'advisory',
      trustScore: 50,
    })
    const claims: AutomationConflictClaim[] = [
      {
        claimId: 'c-2',
        subjectRef: 'wing-3',
        source: 'sensors',
        assertedSummary: 'Motion trace',
        confidence: 'low',
      },
      {
        claimId: 'c-1',
        subjectRef: 'wing-3',
        source: 'records',
        assertedSummary: 'Wing sealed',
        confidence: 'low',
      },
    ]

    const resolution = resolveAutomationConflict(botA, botB, claims)

    expect(resolution.claims).toHaveLength(2)
    expect(resolution.claimOutcomes).toHaveLength(2)
    expect(resolution.claims.map((claim) => claim.claimId)).toEqual(['c-1', 'c-2'])
  })

  it('10. operator projection redacts per policy', () => {
    const projected = projectAutomationFeedForOperator(
      [
        baseAction({ actionId: 'act-1', confidence: 'low', reviewed: false }),
        baseAction({ actionId: 'act-2', confidence: 'high', reviewed: true }),
      ],
      {
        minimumConfidence: 'medium',
        redactUnreviewed: true,
        redactOperatorIds: true,
        redactSensorInputs: true,
      }
    )

    const low = projected.find((item) => item.actionId === 'act-1')
    const high = projected.find((item) => item.actionId === 'act-2')

    expect(low?.redacted).toBe(true)
    expect(low?.confidence).toBeUndefined()
    expect(low?.operatorId).toBeUndefined()
    expect(low?.sensorInputs).toBeUndefined()
    expect(low?.actionTaken).toBeNull()

    expect(high?.confidence).toBe('high')
    expect(high?.operatorId).toBeUndefined()
    expect(high?.sensorInputs).toBeUndefined()
  })

  it('11. operator projection can include reason codes for redaction', () => {
    const projected = projectAutomationFeedForOperator(
      [baseAction({ confidence: 'low', reviewed: false })],
      {
        redactActionDetailBelowConfidence: 'medium',
        redactUnreviewed: true,
      }
    )[0]

    expect(projected?.redactionReasons).toContain('policy_withhold_action_detail')
    expect(projected?.redactionReasons).toContain('policy_unreviewed_action')
    expect(projected?.redacted).toBe(true)
  })

  it('12. byte-stable repeated validation', () => {
    const entry = baseEntry()
    const first = JSON.stringify(validateAutomationEntry(entry))
    const second = JSON.stringify(validateAutomationEntry(entry))

    expect(first).toBe(second)
  })

  it('13. inputs are not mutated', () => {
    const entry = structuredClone(baseEntry())
    const claims: AutomationConflictClaim[] = [
      {
        claimId: 'claim-1',
        subjectRef: 'zone-a',
        source: 'records',
        assertedSummary: 'Seal intact',
        confidence: 'medium',
      },
    ]
    const actions = structuredClone([baseAction()])
    const botB = structuredClone(
      baseEntry({ id: 'auto:sensor-bot', roleClass: 'observe', authorityTier: 'advisory' })
    )

    const entryBefore = structuredClone(entry)
    const claimsBefore = structuredClone(claims)
    const actionsBefore = structuredClone(actions)

    validateAutomationEntry(entry)
    resolveAutomationConflict(entry, botB, claims)
    projectAutomationFeedForOperator(actions, { redactOperatorIds: true })

    expect(entry).toEqual(entryBefore)
    expect(claims).toEqual(claimsBefore)
    expect(actions).toEqual(actionsBefore)
  })

  it('14. module does not import GameState, React/UI, or live registry modules', () => {
    const source = readFileSync(resolve('src/domain/institutionalAutomationRegistry.ts'), 'utf8')

    expect(source).not.toMatch(/^import\b/m)
    expect(source).not.toMatch(/from ['"]react/)
    expect(source).not.toMatch(/liveRegistry/)
    expect(source).not.toMatch(/authorityGraph/)
    expect(source).not.toMatch(/specialistUnits/)
  })

  it('15. fixture labels and ids contain no source/franchise tokens', () => {
    const entries = [
      baseEntry(),
      baseEntry({
        id: 'auto:records-index-1',
        label: 'Records Index Automaton',
        roleClass: 'archive',
      }),
    ]

    for (const entry of entries) {
      const tokens = collectInstitutionalAutomationTokens(entry)
      expect(institutionalAutomationTokensContainFranchiseReferences(tokens)).toBe(false)
    }
  })
})
