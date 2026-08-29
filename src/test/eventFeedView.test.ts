// cspell:words cand fieldcraft kellan sato voss
import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import type { GameState, OperationEvent } from '../domain/models'
import {
  buildEventFeedView,
  DEFAULT_EVENT_FEED_FILTERS,
  getAvailableEventCategories,
  getAvailableEventSources,
  getAvailableEventTypes,
  getFilteredEventFeedViews,
  refineEventFeedDrillDownHref,
} from '../features/dashboard/eventFeedView'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent<TType extends OperationEvent['type']>(
  type: TType,
  payload: Extract<OperationEvent, { type: TType }>['payload'],
  overrides: Partial<OperationEvent> = {}
): OperationEvent {
  return {
    id: `evt-${type.replace(/\./g, '-')}`,
    schemaVersion: 1,
    type,
    sourceSystem: (overrides.sourceSystem ?? inferSource(type)) as OperationEvent['sourceSystem'],
    timestamp: '2042-01-08T00:00:00.001Z',
    payload,
    ...overrides,
  } as OperationEvent
}

function inferSource(type: string): string {
  if (type.startsWith('assignment.')) return 'assignment'
  if (type.startsWith('case.')) return 'incident'
  if (type.startsWith('intel.')) return 'intel'
  if (type.startsWith('recruitment.')) return 'intel'
  if (type.startsWith('agent.')) return 'agent'
  if (type.startsWith('staff.')) return 'agent'
  if (type.startsWith('production.') || type.startsWith('market.')) return 'production'
  if (type.startsWith('faction.')) return 'faction'
  return 'system'
}

function gameWithEvents(events: OperationEvent[]): GameState {
  return { ...createStartingState(), events }
}

// ---------------------------------------------------------------------------
// buildEventFeedView — one test per event type verifying title, tone, week
// ---------------------------------------------------------------------------

describe('buildEventFeedView', () => {
  it('recruitment.candidate_departed — states that the candidate is no longer available', () => {
    const event = makeEvent(
      'recruitment.candidate_departed',
      {
        week: 3,
        candidateId: 'cand-departed',
        candidateName: 'Morgan Vale',
        reason: 'unknown_departure',
      },
      { sourceSystem: 'system' }
    )
    const view = buildEventFeedView(event)

    expect(view.title).toBe('Morgan Vale is no longer available')
    expect(view.detail).toContain('departure reason is unknown')
    expect(view.tone).toBe('warning')
    expect(view.href).toBe('/recruitment')
  })

  it('recruitment.candidate_departed — explains the producer-emitted expiry reason', () => {
    const view = buildEventFeedView(
      makeEvent(
        'recruitment.candidate_departed',
        {
          week: 3,
          candidateId: 'cand-expired',
          candidateName: 'Morgan Vale',
          reason: 'expired_from_consideration',
        },
        { sourceSystem: 'system' }
      )
    )

    expect(view.detail).toContain('availability expired')
  })

  it('assignment.team_assigned — neutral tone, team and case in title', () => {
    const event = makeEvent('assignment.team_assigned', {
      week: 2,
      caseId: 'case-001',
      caseTitle: 'Vampire Nest',
      caseKind: 'case',
      teamId: 't_alpha',
      teamName: 'Alpha Team',
      assignedTeamCount: 1,
      maxTeams: 2,
    })
    const view = buildEventFeedView(event)

    expect(view.week).toBe(2)
    expect(view.tone).toBe('neutral')
    expect(view.title).toContain('Alpha Team')
    expect(view.title).toContain('Vampire Nest')
    expect(view.detail).toMatch(/1\/2/)
    expect(view.sourceLabel).toBe('Assignment')
    expect(view.typeLabel).toBe('Team Assigned')
    expect(view.searchText).toContain('alpha team')
    expect(view.searchText).toContain('vampire nest')
  })

  it('assignment.team_unassigned — warning tone, team and case in title', () => {
    const event = makeEvent('assignment.team_unassigned', {
      week: 3,
      caseId: 'case-001',
      caseTitle: 'Vampire Nest',
      teamId: 't_alpha',
      teamName: 'Alpha Team',
      remainingTeamCount: 0,
    })
    const view = buildEventFeedView(event)

    expect(view.week).toBe(3)
    expect(view.tone).toBe('warning')
    expect(view.title).toContain('Alpha Team')
    expect(view.title).toContain('Vampire Nest')
    expect(view.detail).toContain('0')
  })

  it('case.resolved — success tone', () => {
    const event = makeEvent('case.resolved', {
      week: 4,
      caseId: 'case-002',
      caseTitle: 'Ritual Site Delta',
      mode: 'threshold',
      kind: 'case',
      stage: 2,
      teamIds: ['t_alpha', 't_bravo'],
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('success')
    expect(view.title).toContain('Ritual Site Delta')
    expect(view.detail).toContain('Stage 2')
    expect(view.detail).toContain('2 deployed')
  })

  it('case.partially_resolved — warning tone, stage range in detail', () => {
    const event = makeEvent('case.partially_resolved', {
      week: 5,
      caseId: 'case-002',
      caseTitle: 'Ritual Site Delta',
      mode: 'threshold',
      kind: 'case',
      fromStage: 3,
      toStage: 2,
      teamIds: ['t_alpha'],
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('warning')
    expect(view.title).toContain('Ritual Site Delta')
    expect(view.detail).toContain('3')
    expect(view.detail).toContain('2')
  })

  it('case.failed — danger tone', () => {
    const event = makeEvent('case.failed', {
      week: 6,
      caseId: 'case-003',
      caseTitle: 'Outbreak Vector',
      mode: 'probability',
      kind: 'case',
      fromStage: 2,
      toStage: 3,
      teamIds: ['t_alpha'],
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('danger')
    expect(view.title).toContain('Outbreak Vector')
  })

  it('case.escalated deadline — warning tone (no raid conversion)', () => {
    const event = makeEvent('case.escalated', {
      week: 7,
      caseId: 'case-004',
      caseTitle: 'Cold Signal',
      fromStage: 1,
      toStage: 2,
      trigger: 'deadline',
      deadlineRemaining: 0,
      convertedToRaid: false,
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('warning')
    expect(view.detail).toContain('deadline')
  })

  it('case.escalated with raid conversion — danger tone', () => {
    const event = makeEvent('case.escalated', {
      week: 7,
      caseId: 'case-004',
      caseTitle: 'Cold Signal',
      fromStage: 2,
      toStage: 3,
      trigger: 'deadline',
      deadlineRemaining: 0,
      convertedToRaid: true,
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('danger')
  })

  it('case.spawned with parent — warning tone, parent in detail', () => {
    const event = makeEvent('case.spawned', {
      week: 8,
      caseId: 'case-005',
      caseTitle: 'Splinter Cult',
      templateId: 'tpl-cultist',
      kind: 'case',
      stage: 1,
      trigger: 'failure',
      parentCaseId: 'case-003',
      parentCaseTitle: 'Outbreak Vector',
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('warning')
    expect(view.title).toContain('Splinter Cult')
    expect(view.detail).toContain('Outbreak Vector')
  })

  it('case.spawned without parent — detail has no undefined text', () => {
    const event = makeEvent('case.spawned', {
      week: 9,
      caseId: 'case-005',
      caseTitle: 'Splinter Cult',
      templateId: 'tpl-cultist',
      kind: 'case',
      stage: 1,
      trigger: 'unresolved',
    })
    const view = buildEventFeedView(event)

    expect(view.detail).not.toContain('undefined')
    expect(view.detail).not.toContain('null')
  })

  it('case.raid_converted — danger tone, team range in detail', () => {
    const event = makeEvent('case.raid_converted', {
      week: 10,
      caseId: 'case-006',
      caseTitle: 'The Rift Protocol',
      stage: 3,
      trigger: 'deadline',
      minTeams: 2,
      maxTeams: 4,
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('danger')
    expect(view.detail).toContain('2')
    expect(view.detail).toContain('4')
  })

  it('case.aggregate_battle — renders routed and durable-contact details', () => {
    const event = makeEvent('case.aggregate_battle', {
      week: 10,
      caseId: 'case-006',
      caseTitle: 'The Rift Protocol',
      mode: 'threshold',
      kind: 'raid',
      battleId: 'case-006-week-10',
      roundsResolved: 3,
      winnerSideId: 'operators',
      winnerLabel: 'Containment Teams',
      friendlyLabel: 'Containment Teams',
      hostileLabel: 'Hostile Forces',
      movementDeniedCount: 2,
      friendlyRoutedCount: 0,
      hostileRoutedCount: 2,
      friendlyRoutedUnits: [],
      hostileRoutedUnits: ['Hostile Screen', 'Reserve Cell'],
      specialDamageCount: 1,
      specialDamage: ['Reliquary Guardian 2/3'],
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('success')
    expect(view.title).toContain('The Rift Protocol')
    expect(view.detail).toContain('Containment Teams')
    expect(view.detail).toContain('Routed 0 friendly, 2 hostile')
    expect(view.detail).toContain('Durable contacts 1')
    expect(view.detail).toContain('Movement denied 2')
    expect(view.searchText).toContain('reliquary guardian 2/3')
  })

  it('intel.report_generated positive score — success tone', () => {
    const event = makeEvent('intel.report_generated', {
      week: 5,
      resolvedCount: 2,
      failedCount: 0,
      partialCount: 1,
      unresolvedCount: 0,
      spawnedCount: 1,
      noteCount: 4,
      score: 8,
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('success')
    expect(view.detail).toContain('Resolved 2')
    expect(view.detail).toContain('+8')
  })

  it('intel.report_generated negative score — warning tone', () => {
    const event = makeEvent('intel.report_generated', {
      week: 6,
      resolvedCount: 0,
      failedCount: 2,
      partialCount: 0,
      unresolvedCount: 1,
      spawnedCount: 0,
      noteCount: 2,
      score: -5,
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('warning')
    expect(view.detail).toContain('-5')
  })

  it('agent.training_started — neutral tone, agent and program in title', () => {
    const event = makeEvent('agent.training_started', {
      week: 3,
      queueId: 'q-001',
      agentId: 'a-001',
      agentName: 'Ava Cole',
      trainingId: 'ttn-combat',
      trainingName: 'Combat Conditioning',
      etaWeeks: 3,
      fundingCost: 15,
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('neutral')
    expect(view.title).toContain('Ava Cole')
    expect(view.title).toContain('Combat Conditioning')
    expect(view.detail).toContain('3 week')
    expect(view.detail).toContain('15')
  })

  it('agent.training_completed — success tone', () => {
    const event = makeEvent('agent.training_completed', {
      week: 6,
      queueId: 'q-001',
      agentId: 'a-001',
      agentName: 'Ava Cole',
      trainingId: 'ttn-combat',
      trainingName: 'Combat Conditioning',
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('success')
    expect(view.title).toContain('completed')
  })

  it('agent.training_cancelled — warning tone and refund detail', () => {
    const event = makeEvent('agent.training_cancelled', {
      week: 6,
      agentId: 'a-001',
      agentName: 'Ava Cole',
      trainingId: 'ttn-combat',
      trainingName: 'Combat Conditioning',
      refund: 8,
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('warning')
    expect(view.title).toContain('cancelled')
    expect(view.detail).toContain('Refund $8')
  })

  it('agent.instructor_assigned — success tone and specialty detail', () => {
    const event = makeEvent('agent.instructor_assigned', {
      week: 6,
      staffId: 'ins-001',
      instructorName: 'Prof. Chen',
      agentId: 'a-001',
      agentName: 'Ava Cole',
      instructorSpecialty: 'combat',
      bonus: 1,
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('success')
    expect(view.title).toContain('assigned to Ava Cole')
    expect(view.detail).toContain('combat specialty')
    expect(view.detail).toContain('+1')
  })

  it('agent.instructor_unassigned — warning tone and removal detail', () => {
    const event = makeEvent('agent.instructor_unassigned', {
      week: 6,
      staffId: 'ins-001',
      instructorName: 'Prof. Chen',
      agentId: 'a-001',
      agentName: 'Ava Cole',
      instructorSpecialty: 'combat',
      bonus: 1,
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('warning')
    expect(view.title).toContain('removed from Ava Cole')
    expect(view.detail).toContain('bonus removed')
  })

  it('agent.relationship_changed — reflects direction and reason', () => {
    const event = makeEvent('agent.relationship_changed', {
      week: 12,
      agentId: 'a_ava',
      agentName: 'Ava Brooks',
      counterpartId: 'a_sato',
      counterpartName: 'Dr. Sato',
      previousValue: 0.4,
      nextValue: 0.9,
      delta: 0.5,
      reason: 'mission_success',
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('success')
    expect(view.title).toContain('Ava Brooks')
    expect(view.title).toContain('Dr. Sato')
    expect(view.detail).toContain('mission success')
    expect(view.detail).toContain('0.40 -> 0.90')
  })

  it('agent.injured — danger tone, severity in detail', () => {
    const event = makeEvent('agent.injured', {
      week: 4,
      agentId: 'a-002',
      agentName: 'Kellan Frost',
      severity: 'moderate',
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('danger')
    expect(view.title).toContain('Kellan Frost')
    expect(view.detail).toContain('moderate')
  })

  it('agent.betrayed — danger tone with trust damage and consequences', () => {
    const event = makeEvent('agent.betrayed', {
      week: 8,
      betrayerId: 'a_ava',
      betrayerName: 'Ava Brooks',
      betrayedId: 'a_sato',
      betrayedName: 'Dr. Sato',
      trustDamageDelta: 0.35,
      trustDamageTotal: 1.1,
      triggeredConsequences: ['benching', 'performance_penalty'],
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('danger')
    expect(view.title).toContain('Ava Brooks')
    expect(view.title).toContain('Dr. Sato')
    expect(view.detail).toContain('trust damage +0.35')
    expect(view.detail).toContain('benching')
  })

  it('agent.resigned — danger tone with resignation reason', () => {
    const event = makeEvent('agent.resigned', {
      week: 11,
      agentId: 'a_ava',
      agentName: 'Ava Brooks',
      reason: 'trust_failure_cumulative',
      counterpartId: 'a_sato',
      counterpartName: 'Dr. Sato',
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('danger')
    expect(view.title).toContain('Ava Brooks')
    expect(view.detail).toContain('trust failure cumulative')
    expect(view.detail).toContain('Dr. Sato')
  })

  it('agent.promoted — success tone, new role in detail', () => {
    const event = makeEvent('agent.promoted', {
      week: 7,
      agentId: 'a-003',
      agentName: 'Mina Voss',
      newRole: 'medic',
      previousLevel: 1,
      newLevel: 2,
      levelsGained: 1,
      skillPointsGranted: 1,
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('success')
    expect(view.detail).toContain('medic')
  })

  it('agent.hired — success tone, category in detail', () => {
    const event = makeEvent('agent.hired', {
      week: 2,
      candidateId: 'cand-001',
      agentId: 'a-004',
      agentName: 'Rook Jensen',
      recruitCategory: 'fieldTech',
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('success')
    expect(view.title).toContain('Rook Jensen')
    expect(view.detail).toContain('fieldTech')
  })

  it('recruitment.scouting_initiated shows projected tier and cost', () => {
    const event = makeEvent('recruitment.scouting_initiated', {
      week: 2,
      candidateId: 'cand-001',
      candidateName: 'Scout Target',
      fundingCost: 12,
      stage: 1,
      projectedTier: 'B',
      confidence: 'low',
      revealLevel: 1,
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('neutral')
    expect(view.title).toContain('Scout Target')
    expect(view.detail).toContain('Projected B tier')
    expect(view.detail).toContain('$12')
  })

  it('recruitment.scouting_refined shows refinement history', () => {
    const event = makeEvent('recruitment.scouting_refined', {
      week: 3,
      candidateId: 'cand-001',
      candidateName: 'Scout Target',
      fundingCost: 9,
      stage: 2,
      projectedTier: 'A',
      confidence: 'high',
      previousProjectedTier: 'B',
      previousConfidence: 'low',
      revealLevel: 2,
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('success')
    expect(view.title).toContain('scouting refined')
    expect(view.detail).toContain('B -> A tier')
    expect(view.detail).toContain('low -> high confidence')
  })

  it('recruitment.intel_confirmed shows the confirmed tier', () => {
    const event = makeEvent('recruitment.intel_confirmed', {
      week: 4,
      candidateId: 'cand-001',
      candidateName: 'Scout Target',
      fundingCost: 7,
      stage: 3,
      projectedTier: 'A',
      confirmedTier: 'A',
      confidence: 'confirmed',
      previousProjectedTier: 'A',
      previousConfidence: 'high',
      revealLevel: 2,
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('success')
    expect(view.title).toContain('intel confirmed')
    expect(view.detail).toContain('Confirmed A tier')
  })

  it('production.queue_started — neutral tone, cost in detail', () => {
    const event = makeEvent('production.queue_started', {
      week: 3,
      queueId: 'q-prod-001',
      queueName: 'Tactical Vest Batch',
      recipeId: 'recipe-vest',
      outputId: 'item-vest',
      outputName: 'Tactical Vest',
      outputQuantity: 1,
      etaWeeks: 4,
      fundingCost: 40,
      inputMaterials: [],
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('neutral')
    expect(view.title).toContain('Tactical Vest Batch')
    expect(view.detail).toContain('40')
  })

  it('production.queue_completed — success tone', () => {
    const event = makeEvent('production.queue_completed', {
      week: 7,
      queueId: 'q-prod-001',
      queueName: 'Tactical Vest Batch',
      recipeId: 'recipe-vest',
      outputId: 'item-vest',
      outputName: 'Tactical Vest',
      outputQuantity: 1,
      fundingCost: 40,
      inputMaterials: [],
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('success')
    expect(view.title).toContain('completed')
  })

  it('equipment.instance_destroyed — names the exact identity and condition', () => {
    const event = makeEvent(
      'equipment.instance_destroyed',
      {
        week: 7,
        instanceId: 'equipment-instance-7-1',
        definitionId: 'signal_jammers',
        definitionName: 'Signal Jammers',
        condition: 'damaged',
        reason: 'manual_disposal',
      },
      { sourceSystem: 'agent' }
    )
    const view = buildEventFeedView(event)

    expect(view.title).toBe('Signal Jammers instance destroyed')
    expect(view.detail).toContain('equipment-instance-7-1')
    expect(view.detail).toContain('damaged')
    expect(view.tone).toBe('warning')
  })

  it('equipment.combat_stim_disposed — names the exact identity and dose snapshot', () => {
    const event = makeEvent(
      'equipment.combat_stim_disposed',
      {
        week: 7,
        instanceId: 'equipment-instance-7-3',
        definitionId: 'combat_stims',
        definitionName: 'Combat Stims',
        condition: 'operational',
        resourceId: 'combat_stim_dose',
        capacity: 2,
        remaining: 1,
        reason: 'manual_disposal',
      },
      { sourceSystem: 'agent' }
    )
    const view = buildEventFeedView(event)

    expect(view.title).toBe('Combat Stims instance disposed')
    expect(view.detail).toContain('equipment-instance-7-3')
    expect(view.detail).toContain('1/2 doses')
    expect(view.tone).toBe('warning')
  })

  it('equipment.combat_stim_reaggregated — names the exact identity and stock return', () => {
    const event = makeEvent(
      'equipment.combat_stim_reaggregated',
      {
        week: 7,
        instanceId: 'equipment-instance-7-4',
        definitionId: 'combat_stims',
        definitionName: 'Combat Stims',
        condition: 'operational',
        resourceId: 'combat_stim_dose',
        capacity: 2,
        remaining: 2,
        reason: 'manual_untracking',
      },
      { sourceSystem: 'agent' }
    )
    const view = buildEventFeedView(event)

    expect(view.title).toBe('Combat Stims instance returned to aggregate stock')
    expect(view.detail).toContain('equipment-instance-7-4')
    expect(view.detail).toContain('2/2 doses')
    expect(view.detail).toContain('Manual untracking')
    expect(view.tone).toBe('neutral')
  })

  it('equipment.instance_reaggregated — names the exact identity and stock return', () => {
    const event = makeEvent(
      'equipment.instance_reaggregated',
      {
        week: 7,
        instanceId: 'equipment-instance-7-2',
        definitionId: 'signal_jammers',
        definitionName: 'Signal Jammers',
        condition: 'operational',
        reason: 'manual_untracking',
      },
      { sourceSystem: 'agent' }
    )
    const view = buildEventFeedView(event)

    expect(view.title).toBe('Signal Jammers instance returned to aggregate stock')
    expect(view.detail).toContain('equipment-instance-7-2')
    expect(view.detail).toContain('Manual untracking')
    expect(view.tone).toBe('neutral')
  })

  it('equipment.instance_reaggregated fabricated lot return — names batch provenance', () => {
    const event = makeEvent(
      'equipment.instance_reaggregated',
      {
        week: 7,
        instanceId: 'equipment-instance-7-5',
        definitionId: 'signal_jammers',
        definitionName: 'Signal Jammers',
        condition: 'operational',
        reason: 'fabricated_lot_return',
        fabricationQueueId: 'batch',
        fabricationRecipeId: 'signal-jammers',
        fabricationGradeId: 'grade_2',
        fabricationCompletedWeek: 3,
      },
      { sourceSystem: 'agent' }
    )
    const view = buildEventFeedView(event)

    expect(view.title).toBe('Signal Jammers instance returned to fabricated lot')
    expect(view.detail).toContain('equipment-instance-7-5')
    expect(view.detail).toContain('Fabricated lot return')
    expect(view.detail).toContain('batch')
    expect(view.detail).toContain('week 3')
    expect(view.tone).toBe('neutral')
  })

  it('market.shifted tight pressure — warning tone', () => {
    const event = makeEvent('market.shifted', {
      week: 5,
      featuredRecipeId: 'recipe-vest',
      featuredRecipeName: 'Tactical Vest',
      pressure: 'tight',
      costMultiplier: 1.5,
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('warning')
    expect(view.detail).toContain('1.50x')
  })

  it('market.shifted stable pressure — neutral tone', () => {
    const event = makeEvent('market.shifted', {
      week: 6,
      featuredRecipeId: 'recipe-vest',
      featuredRecipeName: 'Tactical Vest',
      pressure: 'stable',
      costMultiplier: 1.0,
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('neutral')
  })

  it('market.transaction_recorded buy — neutral tone with deterministic detail', () => {
    const event = makeEvent('market.transaction_recorded', {
      week: 6,
      marketWeek: 6,
      transactionId: 'market-6-1',
      action: 'buy',
      listingId: 'material:medical_supplies',
      itemId: 'medical_supplies',
      itemName: 'Medical Supplies',
      category: 'material',
      quantity: 2,
      bundleCount: 2,
      unitPrice: 6,
      totalPrice: 12,
      remainingAvailability: 3,
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('neutral')
    expect(view.title).toContain('Purchased 2x Medical Supplies')
    expect(view.detail).toContain('$12')
    expect(view.detail).toContain('3 units remaining')
  })

  it('market.emergency_gray_market_waiver_granted — warning tone with waiver detail', () => {
    const event = makeEvent('market.emergency_gray_market_waiver_granted', {
      week: 8,
      marketWeek: 7,
      crisisPressureScore: 130,
      sanctionLevel: 'sanctioned',
      packetId: 'gray_market_broker',
      falloutRiskApplied: 'risk',
      waiverPrecedentCount: 2,
      institutionKey: 'containment_protocol',
      authorityRoute: 'crisis_director_self',
      authorityBasis:
        'Director institutional self-authorization under crisis procurement rules (baseline institution).',
      regulatoryArbitrageSignal: 'none',
      ruleConflictSignal: 'sanctioned_procurement_vs_crisis_waiver',
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('warning')
    expect(view.title).toContain('Emergency gray-market procurement waiver recorded')
    expect(view.detail).toContain('Campaign week 8')
    expect(view.detail).toContain('Crisis pressure 130')
    expect(view.detail).toContain('Fallout risk')
    expect(view.detail).toContain('Waiver precedent 2')
    expect(view.detail).toContain('Institution containment_protocol')
    expect(view.detail).toContain('Authority crisis_director_self')
    expect(view.detail).toContain('Reg. arbitrage none')
    expect(view.detail).toContain('Rule conflict sanctioned_procurement_vs_crisis_waiver')
    expect(view.searchText).toContain('130')
    expect(view.searchText).toContain('sanctioned')
    expect(view.searchText).toContain('containment_protocol')
    expect(view.searchText).toContain('crisis_director_self')
    expect(view.searchText).toContain('precedent 2')
  })

  it('market.emergency_gray_market_waiver_granted — regulatory arbitrage signal when clearance ratification route', () => {
    const event = makeEvent('market.emergency_gray_market_waiver_granted', {
      week: 9,
      marketWeek: 8,
      crisisPressureScore: 125,
      sanctionLevel: 'sanctioned',
      packetId: 'gray_market_broker',
      falloutRiskApplied: 'risk',
      waiverPrecedentCount: 1,
      institutionKey: 'joint_oversight_concordat',
      authorityRoute: 'joint_oversight_clearance_ratification',
      authorityBasis:
        'Joint Oversight Concordat emergency authorization ratified at clearanceLevel 3.',
      regulatoryArbitrageSignal: 'cross_institution_clearance_route',
      ruleConflictSignal: 'sanctioned_procurement_vs_crisis_waiver',
    })
    const view = buildEventFeedView(event)

    expect(view.detail).toContain('Reg. arbitrage cross_institution_clearance_route')
    expect(view.searchText).toContain('cross_institution_clearance_route')
    expect(view.detail).toContain('Rule conflict sanctioned_procurement_vs_crisis_waiver')
  })

  it('market.emergency_gray_market_waiver_accountability_closed — neutral accountability marker', () => {
    const event = makeEvent('market.emergency_gray_market_waiver_accountability_closed', {
      week: 9,
      waiverGrantWeek: 8,
      institutionKey: 'containment_protocol',
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('neutral')
    expect(view.title).toContain('accountability posted')
    expect(view.detail).toContain('Posted campaign week 9')
    expect(view.detail).toContain('Waiver grant week 8')
    expect(view.searchText).toContain('containment_protocol')
  })

  it('market.emergency_gray_market_fallout_tick — danger while pending oversight', () => {
    const event = makeEvent('market.emergency_gray_market_fallout_tick', {
      week: 4,
      outcome: 'escalated_pending_oversight',
      falloutRiskBefore: 'risk',
      falloutRiskAfter: 'costly',
      fundingBefore: 110,
      fundingAfter: 105,
      containmentRatingBefore: 72,
      containmentRatingAfter: 69,
      waiverPrecedentCount: 1,
      precedentPenaltyMultiplier: 1,
      rankingScore: 50,
      standingFalloutPenaltyScale: 1,
      institutionKey: 'containment_protocol',
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('danger')
    expect(view.title).toContain('escalated')
    expect(view.detail).toContain('110→105')
    expect(view.detail).toContain('Precedent 1 ×1')
    expect(view.detail).toContain('Standing scale 1× (rank 50)')
  })

  it('market.emergency_gray_market_fallout_tick — warning when resolved closed', () => {
    const event = makeEvent('market.emergency_gray_market_fallout_tick', {
      week: 5,
      outcome: 'resolved_closed',
      falloutRiskBefore: 'costly',
      falloutRiskAfter: 'none',
      fundingBefore: 105,
      fundingAfter: 96,
      containmentRatingBefore: 69,
      containmentRatingAfter: 65,
      waiverPrecedentCount: 2,
      precedentPenaltyMultiplier: 1.06,
      rankingScore: 20,
      standingFalloutPenaltyScale: 1.12,
      institutionKey: 'containment_protocol',
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('warning')
    expect(view.title).toContain('closed')
    expect(view.detail).toContain('resolved closed')
    expect(view.detail).toContain('Precedent 2 ×1.06')
    expect(view.detail).toContain('Standing scale 1.12× (rank 20)')
  })

  it('faction.standing_changed — posture tone and standing range in detail', () => {
    const event = makeEvent('faction.standing_changed', {
      week: 6,
      factionId: 'occult_networks',
      factionName: 'Occult Networks',
      delta: -3,
      standingBefore: 2,
      standingAfter: -1,
      reason: 'case.failed',
      caseId: 'case-ritual',
      caseTitle: 'Ritual Pressure',
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('warning')
    expect(view.title).toContain('Occult Networks')
    expect(view.detail).toContain('+2')
    expect(view.detail).toContain('-1')
    expect(view.searchText).toContain('occult_networks')
  })

  it('agency.containment_updated positive delta — success tone', () => {
    const event = makeEvent('agency.containment_updated', {
      week: 5,
      containmentRatingBefore: 60,
      containmentRatingAfter: 65,
      containmentDelta: 5,
      clearanceLevelBefore: 2,
      clearanceLevelAfter: 2,
      fundingBefore: 200,
      fundingAfter: 220,
      fundingDelta: 20,
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('success')
    expect(view.detail).toContain('60%')
    expect(view.detail).toContain('65%')
  })

  it('agency.containment_updated negative delta — warning tone', () => {
    const event = makeEvent('agency.containment_updated', {
      week: 6,
      containmentRatingBefore: 65,
      containmentRatingAfter: 55,
      containmentDelta: -10,
      clearanceLevelBefore: 2,
      clearanceLevelAfter: 1,
      fundingBefore: 220,
      fundingAfter: 200,
      fundingDelta: -20,
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('warning')
  })

  it('agency.containment_updated zero delta — neutral tone', () => {
    const event = makeEvent('agency.containment_updated', {
      week: 7,
      containmentRatingBefore: 60,
      containmentRatingAfter: 60,
      containmentDelta: 0,
      clearanceLevelBefore: 2,
      clearanceLevelAfter: 2,
      fundingBefore: 200,
      fundingAfter: 200,
      fundingDelta: 0,
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('neutral')
  })

  it('system.academy_upgraded — success tone and tier progression detail', () => {
    const event = makeEvent('system.academy_upgraded', {
      week: 8,
      tierBefore: 1,
      tierAfter: 2,
      fundingBefore: 500,
      fundingAfter: 0,
      cost: 500,
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('success')
    expect(view.title).toContain('Academy upgraded')
    expect(view.detail).toContain('Tier 1 -> 2')
    expect(view.detail).toContain('Cost $500')
    expect(view.href).toBe('/training-division')
  })

  it('agency.front_business.opened — neutral tone, startup and funding in detail', () => {
    const event = makeEvent('agency.front_business.opened', {
      week: 3,
      kind: 'courierShell',
      startupCost: 750,
      fundingBefore: 9000,
      fundingAfter: 8250,
    })
    const view = buildEventFeedView(event)

    expect(view.week).toBe(3)
    expect(view.tone).toBe('neutral')
    expect(view.title).toContain('Courier shell')
    expect(view.detail).toContain('$750')
    expect(view.sourceLabel).toBe('System')
  })

  it('agency.front_business.resolved — tone follows shell status', () => {
    const event = makeEvent('agency.front_business.resolved', {
      week: 4,
      kind: 'courierShell',
      statusBefore: 'active',
      statusAfter: 'strained',
      fundingDelta: -50,
      riskScore: 5,
      lockoutCount: 1,
      residueCount: 0,
      budgetPressure: 3,
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('warning')
    expect(view.detail).toContain('strained')
  })

  it('includes courier shell front-business events in getFilteredEventFeedViews', () => {
    const opened = makeEvent(
      'agency.front_business.opened',
      {
        week: 2,
        kind: 'courierShell',
        startupCost: 750,
        fundingBefore: 9000,
        fundingAfter: 8250,
      },
      { timestamp: '2042-01-08T00:00:00.001Z' }
    )
    const resolved = makeEvent(
      'agency.front_business.resolved',
      {
        week: 3,
        kind: 'courierShell',
        statusBefore: 'active',
        statusAfter: 'active',
        fundingDelta: 150,
        riskScore: 2,
        lockoutCount: 0,
        residueCount: 0,
        budgetPressure: 1,
      },
      { timestamp: '2042-01-08T00:00:01.000Z' }
    )
    const game = gameWithEvents([resolved, opened])
    const views = getFilteredEventFeedViews(game)
    expect(views).toHaveLength(2)
    expect(views.some((v) => v.event.type === 'agency.front_business.opened')).toBe(true)
    expect(views.some((v) => v.event.type === 'agency.front_business.resolved')).toBe(true)
  })

  it('every event exposes a non-empty timestampLabel derived from timestamp', () => {
    const event = makeEvent('case.resolved', {
      week: 1,
      caseId: 'x',
      caseTitle: 'X',
      mode: 'threshold',
      kind: 'case',
      stage: 1,
      teamIds: [],
    })
    const view = buildEventFeedView(event)

    // Format should be "2042-01-08 00:00:00Z"
    expect(view.timestampLabel).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}Z$/)
  })
})

// ---------------------------------------------------------------------------
// buildEventFeedView — href routing
// ---------------------------------------------------------------------------

describe('buildEventFeedView href', () => {
  it('assignment events link to the case detail page', () => {
    const assigned = makeEvent('assignment.team_assigned', {
      week: 1,
      caseId: 'case-001',
      caseTitle: 'X',
      caseKind: 'case',
      teamId: 't_alpha',
      teamName: 'Alpha',
      assignedTeamCount: 1,
      maxTeams: 1,
    })
    expect(buildEventFeedView(assigned).href).toBe('/cases/case-001')

    const unassigned = makeEvent('assignment.team_unassigned', {
      week: 1,
      caseId: 'case-001',
      caseTitle: 'X',
      teamId: 't_alpha',
      teamName: 'Alpha',
      remainingTeamCount: 0,
    })
    expect(buildEventFeedView(unassigned).href).toBe('/cases/case-001')
  })

  it('case events link to the case detail page', () => {
    const types = [
      'case.resolved',
      'case.partially_resolved',
      'case.failed',
      'case.escalated',
      'case.spawned',
      'case.raid_converted',
    ] as const
    const payloads = {
      'case.resolved': {
        week: 1,
        caseId: 'case-X',
        caseTitle: 'X',
        mode: 'threshold',
        kind: 'case',
        stage: 1,
        teamIds: [],
      },
      'case.partially_resolved': {
        week: 1,
        caseId: 'case-X',
        caseTitle: 'X',
        mode: 'threshold',
        kind: 'case',
        fromStage: 1,
        toStage: 2,
        teamIds: [],
      },
      'case.failed': {
        week: 1,
        caseId: 'case-X',
        caseTitle: 'X',
        mode: 'threshold',
        kind: 'case',
        fromStage: 1,
        toStage: 2,
        teamIds: [],
      },
      'case.escalated': {
        week: 1,
        caseId: 'case-X',
        caseTitle: 'X',
        fromStage: 1,
        toStage: 2,
        trigger: 'deadline',
        deadlineRemaining: 0,
        convertedToRaid: false,
      },
      'case.spawned': {
        week: 1,
        caseId: 'case-X',
        caseTitle: 'X',
        templateId: 'tpl-1',
        kind: 'case',
        stage: 1,
        trigger: 'failure',
      },
      'case.raid_converted': {
        week: 1,
        caseId: 'case-X',
        caseTitle: 'X',
        stage: 1,
        trigger: 'deadline',
        minTeams: 2,
        maxTeams: 4,
      },
    }
    for (const type of types) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const view = buildEventFeedView(makeEvent(type, payloads[type] as any))
      expect(view.href).toBe('/cases/case-X')
    }
  })

  it('intel.report_generated links to the report detail page for that week', () => {
    const event = makeEvent('intel.report_generated', {
      week: 7,
      resolvedCount: 0,
      failedCount: 0,
      partialCount: 0,
      unresolvedCount: 0,
      spawnedCount: 0,
      noteCount: 0,
      score: 0,
    })
    expect(buildEventFeedView(event).href).toBe('/report/7')
  })

  it('agent events link to the agent detail page', () => {
    const trainingStarted = makeEvent('agent.training_started', {
      week: 1,
      queueId: 'q-1',
      agentId: 'a-007',
      agentName: 'Bond',
      trainingId: 'ttn-1',
      trainingName: 'Fieldcraft',
      etaWeeks: 2,
      fundingCost: 10,
    })
    expect(buildEventFeedView(trainingStarted).href).toBe('/agents/a-007')

    const injured = makeEvent('agent.injured', {
      week: 1,
      agentId: 'a-007',
      agentName: 'Bond',
      severity: 'minor',
    })
    expect(buildEventFeedView(injured).href).toBe('/agents/a-007')

    const hired = makeEvent('agent.hired', {
      week: 1,
      candidateId: 'cand-1',
      agentId: 'a-007',
      agentName: 'Bond',
      recruitCategory: 'agent',
    })
    expect(buildEventFeedView(hired).href).toBe('/agents/a-007')
  })

  it('recruitment scouting events link to the recruitment page', () => {
    const initiated = makeEvent('recruitment.scouting_initiated', {
      week: 1,
      candidateId: 'cand-1',
      candidateName: 'Scout Target',
      fundingCost: 12,
      stage: 1,
      projectedTier: 'B',
      confidence: 'low',
      revealLevel: 1,
    })
    expect(buildEventFeedView(initiated).href).toBe('/recruitment')

    const confirmed = makeEvent('recruitment.intel_confirmed', {
      week: 1,
      candidateId: 'cand-1',
      candidateName: 'Scout Target',
      fundingCost: 7,
      stage: 3,
      projectedTier: 'A',
      confirmedTier: 'A',
      confidence: 'confirmed',
      previousProjectedTier: 'B',
      previousConfidence: 'high',
      revealLevel: 2,
    })
    expect(buildEventFeedView(confirmed).href).toBe('/recruitment')
  })

  it('production, faction, market, and agency events have no href', () => {
    const noHrefEvents: OperationEvent[] = [
      makeEvent('production.queue_started', {
        week: 1,
        queueId: 'q-1',
        queueName: 'Q',
        recipeId: 'r-1',
        outputId: 'o-1',
        outputName: 'O',
        outputQuantity: 1,
        etaWeeks: 1,
        fundingCost: 5,
        inputMaterials: [],
      }),
      makeEvent('production.queue_completed', {
        week: 1,
        queueId: 'q-1',
        queueName: 'Q',
        recipeId: 'r-1',
        outputId: 'o-1',
        outputName: 'O',
        outputQuantity: 1,
        fundingCost: 5,
        inputMaterials: [],
      }),
      makeEvent('market.shifted', {
        week: 1,
        featuredRecipeId: 'r-1',
        featuredRecipeName: 'R',
        pressure: 'stable',
        costMultiplier: 1,
      }),
      makeEvent('market.transaction_recorded', {
        week: 1,
        marketWeek: 1,
        transactionId: 'market-1-1',
        action: 'buy',
        listingId: 'gear:field_pistol',
        itemId: 'field_pistol',
        itemName: 'Field Pistol',
        category: 'equipment',
        quantity: 1,
        bundleCount: 1,
        unitPrice: 36,
        totalPrice: 36,
        remainingAvailability: 1,
      }),
      makeEvent('faction.standing_changed', {
        week: 1,
        factionId: 'oversight',
        factionName: 'Oversight Bureau',
        delta: 2,
        standingBefore: 0,
        standingAfter: 2,
        reason: 'case.resolved',
      }),
      makeEvent('agency.containment_updated', {
        week: 1,
        containmentRatingBefore: 50,
        containmentRatingAfter: 50,
        containmentDelta: 0,
        clearanceLevelBefore: 1,
        clearanceLevelAfter: 1,
        fundingBefore: 100,
        fundingAfter: 100,
        fundingDelta: 0,
      }),
    ]
    for (const event of noHrefEvents) {
      expect(buildEventFeedView(event).href).toBeUndefined()
    }
  })

  it('faction.standing_changed links to case detail when caseId is present', () => {
    const event = makeEvent('faction.standing_changed', {
      week: 2,
      factionId: 'oversight',
      factionName: 'Oversight Bureau',
      delta: 2,
      standingBefore: 0,
      standingAfter: 2,
      reason: 'case.resolved',
      caseId: 'case-001',
      caseTitle: 'Case 1',
    })

    expect(buildEventFeedView(event).href).toBe('/cases/case-001')
  })

  it('concealment and infiltration events link to the weekly report', () => {
    const concealment = makeEvent('concealment.activated', {
      week: 4,
      caseId: 'case-a',
      caseTitle: 'Hidden op',
      mode: 'hidden',
      reason: 'authored',
      summary: 'Cover engaged',
    })
    expect(buildEventFeedView(concealment).href).toBe('/report/4')

    const infiltration = makeEvent('infiltration.cover_strain', {
      week: 5,
      caseId: 'case-a',
      caseTitle: 'Hidden op',
      summary: 'Strain rising',
      infiltrationAwareness: 0.4,
      infiltrationStage: 'probing',
    })
    expect(buildEventFeedView(infiltration).href).toBe('/report/5')

    const weeklyEncounter = makeEvent('infiltration.weekly_encounter', {
      week: 6,
      caseId: 'case-a',
      caseTitle: 'Hidden op',
      summary: 'Weekly prep ran access probe this week.',
      probeAction: 'probe_access',
      probeActionSource: 'authored',
    })
    expect(buildEventFeedView(weeklyEncounter).tone).toBe('neutral')

    const leaveBehind = makeEvent('infiltration.leave_behind_tradeoff', {
      week: 7,
      caseId: 'case-a',
      caseTitle: 'Hidden op',
      summary: 'Stealth leave-behind applied — witness exposure.',
      leaveBehindLabel: 'witness exposure',
    })
    expect(buildEventFeedView(leaveBehind).href).toBe('/report/7')
    expect(buildEventFeedView(leaveBehind).tone).toBe('warning')
  })

  it('refineEventFeedDrillDownHref falls back to case when report week is missing', () => {
    const concealment = makeEvent('concealment.activated', {
      week: 9,
      caseId: 'case-a',
      caseTitle: 'Hidden op',
      mode: 'hidden',
      reason: 'authored',
      summary: 'Cover engaged',
    })
    const view = buildEventFeedView(concealment)

    expect(refineEventFeedDrillDownHref(view, []).href).toBe('/cases/case-a')
    expect(refineEventFeedDrillDownHref(view, [{ week: 9 } as never]).href).toBe('/report/9')
  })
})

// ---------------------------------------------------------------------------
// getAvailableEventSources / getAvailableEventTypes
// ---------------------------------------------------------------------------

describe('getAvailableEventSources', () => {
  it('returns deduplicated sources sorted by label', () => {
    const events: OperationEvent[] = [
      makeEvent('case.resolved', {
        week: 1,
        caseId: 'x',
        caseTitle: 'X',
        mode: 'threshold',
        kind: 'case',
        stage: 1,
        teamIds: [],
      }),
      makeEvent('case.failed', {
        week: 2,
        caseId: 'y',
        caseTitle: 'Y',
        mode: 'threshold',
        kind: 'case',
        fromStage: 1,
        toStage: 2,
        teamIds: [],
      }),
      makeEvent('agent.injured', {
        week: 2,
        agentId: 'a-1',
        agentName: 'Agent X',
        severity: 'minor',
      }),
    ]

    const sources = getAvailableEventSources(events)

    // 'incident' and 'agent' are present; labels are "Agent" and "Incident"
    expect(sources).toEqual(['agent', 'incident'])
    expect(new Set(sources).size).toBe(sources.length)
  })

  it('returns empty array for empty events', () => {
    expect(getAvailableEventSources([])).toEqual([])
  })
})

describe('getAvailableEventTypes', () => {
  it('returns deduplicated types sorted by label', () => {
    const events: OperationEvent[] = [
      makeEvent('case.resolved', {
        week: 1,
        caseId: 'x',
        caseTitle: 'X',
        mode: 'threshold',
        kind: 'case',
        stage: 1,
        teamIds: [],
      }),
      makeEvent('case.resolved', {
        week: 2,
        caseId: 'y',
        caseTitle: 'Y',
        mode: 'threshold',
        kind: 'case',
        stage: 1,
        teamIds: [],
      }),
      makeEvent('agent.injured', {
        week: 2,
        agentId: 'a-1',
        agentName: 'Agent X',
        severity: 'minor',
      }),
    ]

    const types = getAvailableEventTypes(events)

    // Sorted by label: "Agent Injury" < "Case Resolved"
    expect(types).toEqual(['agent.injured', 'case.resolved'])
    expect(new Set(types).size).toBe(types.length)
  })
})

describe('getAvailableEventCategories', () => {
  it('returns deduplicated categories sorted by label', () => {
    const events: OperationEvent[] = [
      makeEvent('case.resolved', {
        week: 1,
        caseId: 'x',
        caseTitle: 'X',
        mode: 'threshold',
        kind: 'case',
        stage: 1,
        teamIds: [],
      }),
      makeEvent('agent.injured', {
        week: 2,
        agentId: 'a-1',
        agentName: 'Agent X',
        severity: 'minor',
      }),
    ]

    expect(getAvailableEventCategories(events)).toEqual(['incident_response', 'personnel'])
  })
})

// ---------------------------------------------------------------------------
// getFilteredEventFeedViews
// ---------------------------------------------------------------------------

describe('getFilteredEventFeedViews', () => {
  const assignEvent = makeEvent('assignment.team_assigned', {
    week: 1,
    caseId: 'case-001',
    caseTitle: 'Vampire Nest',
    caseKind: 'case',
    teamId: 't_alpha',
    teamName: 'Alpha Team',
    assignedTeamCount: 1,
    maxTeams: 1,
  })

  const intelEvent = makeEvent('intel.report_generated', {
    week: 2,
    resolvedCount: 1,
    failedCount: 0,
    partialCount: 0,
    unresolvedCount: 0,
    spawnedCount: 0,
    noteCount: 2,
    score: 5,
  })

  const caseFailed = makeEvent('case.failed', {
    week: 3,
    caseId: 'case-002',
    caseTitle: 'Outbreak Vector',
    mode: 'threshold',
    kind: 'case',
    fromStage: 1,
    toStage: 2,
    teamIds: [],
  })

  it('returns all events in reverse timestamp order with default filters', () => {
    const game = gameWithEvents([assignEvent, intelEvent, caseFailed])
    const views = getFilteredEventFeedViews(game, DEFAULT_EVENT_FEED_FILTERS)

    expect(views).toHaveLength(3)
    // Sorted by timestamp descending — all same timestamp here but order is stable
  })

  it('filters by sourceSystem', () => {
    const game = gameWithEvents([assignEvent, intelEvent, caseFailed])
    const views = getFilteredEventFeedViews(game, {
      ...DEFAULT_EVENT_FEED_FILTERS,
      sourceSystem: 'intel',
    })

    expect(views).toHaveLength(1)
    expect(views[0].event.type).toBe('intel.report_generated')
  })

  it('filters by event type', () => {
    const game = gameWithEvents([assignEvent, intelEvent, caseFailed])
    const views = getFilteredEventFeedViews(game, {
      ...DEFAULT_EVENT_FEED_FILTERS,
      type: 'case.failed',
    })

    expect(views).toHaveLength(1)
    expect(views[0].event.type).toBe('case.failed')
  })

  it('filters by query text — matches title fields', () => {
    const game = gameWithEvents([assignEvent, intelEvent, caseFailed])
    const views = getFilteredEventFeedViews(game, {
      ...DEFAULT_EVENT_FEED_FILTERS,
      query: 'vampire',
    })

    expect(views).toHaveLength(1)
    expect(views[0].event.type).toBe('assignment.team_assigned')
  })

  it('query filter is case-insensitive', () => {
    const game = gameWithEvents([assignEvent, intelEvent, caseFailed])
    const views = getFilteredEventFeedViews(game, {
      ...DEFAULT_EVENT_FEED_FILTERS,
      query: 'OUTBREAK',
    })

    expect(views).toHaveLength(1)
    expect(views[0].event.type).toBe('case.failed')
  })

  it('returns empty array when no events match combined filters', () => {
    const game = gameWithEvents([assignEvent, intelEvent])
    const views = getFilteredEventFeedViews(game, {
      category: 'all',
      sourceSystem: 'agent',
      type: 'all',
      relationshipVerbosity: 'summary',
      query: '',
    })

    expect(views).toHaveLength(0)
  })

  it('returns empty array when game has no events', () => {
    const game = gameWithEvents([])
    const views = getFilteredEventFeedViews(game, DEFAULT_EVENT_FEED_FILTERS)

    expect(views).toHaveLength(0)
  })

  it('sorts events newest-first by timestamp', () => {
    const earlier = makeEvent(
      'case.resolved',
      {
        week: 1,
        caseId: 'c1',
        caseTitle: 'Case A',
        mode: 'threshold',
        kind: 'case',
        stage: 1,
        teamIds: [],
      },
      { id: 'evt-early', timestamp: '2042-01-01T00:00:00.001Z' }
    )
    const later = makeEvent(
      'case.resolved',
      {
        week: 5,
        caseId: 'c2',
        caseTitle: 'Case B',
        mode: 'threshold',
        kind: 'case',
        stage: 1,
        teamIds: [],
      },
      { id: 'evt-late', timestamp: '2042-02-01T00:00:00.001Z' }
    )

    const game = gameWithEvents([earlier, later])
    const views = getFilteredEventFeedViews(game, DEFAULT_EVENT_FEED_FILTERS)

    expect(views[0].event.id).toBe('evt-late')
    expect(views[1].event.id).toBe('evt-early')
  })

  it('whitespace-only query is treated as empty — returns all events', () => {
    const game = gameWithEvents([assignEvent, intelEvent])
    const views = getFilteredEventFeedViews(game, {
      ...DEFAULT_EVENT_FEED_FILTERS,
      query: '   ',
    })

    expect(views).toHaveLength(2)
  })

  it('summarizes reciprocal relationship events when relationship verbosity is summary', () => {
    const relationshipA = makeEvent('agent.relationship_changed', {
      week: 8,
      agentId: 'a_ava',
      agentName: 'Ava Brooks',
      counterpartId: 'a_sato',
      counterpartName: 'Dr. Sato',
      previousValue: 0.2,
      nextValue: 0.6,
      delta: 0.4,
      reason: 'mission_success',
    })
    const relationshipB = makeEvent('agent.relationship_changed', {
      week: 8,
      agentId: 'a_sato',
      agentName: 'Dr. Sato',
      counterpartId: 'a_ava',
      counterpartName: 'Ava Brooks',
      previousValue: 0.1,
      nextValue: 0.7,
      delta: 0.6,
      reason: 'mission_success',
    })
    const game = gameWithEvents([relationshipA, relationshipB])

    const summaryViews = getFilteredEventFeedViews(game, {
      ...DEFAULT_EVENT_FEED_FILTERS,
      relationshipVerbosity: 'summary',
    })
    const detailedViews = getFilteredEventFeedViews(game, {
      ...DEFAULT_EVENT_FEED_FILTERS,
      relationshipVerbosity: 'all',
    })

    expect(summaryViews).toHaveLength(1)
    expect(summaryViews[0].title).toMatch(/relationship shift/i)
    expect(summaryViews[0].detail).toMatch(/2 updates/i)
    expect(detailedViews).toHaveLength(2)
  })

  it('filters by category without using text matching', () => {
    const game = gameWithEvents([assignEvent, intelEvent, caseFailed])
    const views = getFilteredEventFeedViews(game, {
      ...DEFAULT_EVENT_FEED_FILTERS,
      category: 'intel_briefing',
      query: '',
    })

    expect(views).toHaveLength(1)
    expect(views[0].event.type).toBe('intel.report_generated')
  })

  it('filters by minimum and maximum week range', () => {
    const week1 = makeEvent(
      'case.resolved',
      {
        week: 1,
        caseId: 'case-010',
        caseTitle: 'Week One Incident',
        mode: 'threshold',
        kind: 'case',
        stage: 1,
        teamIds: [],
      },
      { id: 'evt-w1', timestamp: '2042-01-01T00:00:00.001Z' }
    )
    const week3 = makeEvent(
      'case.failed',
      {
        week: 3,
        caseId: 'case-011',
        caseTitle: 'Week Three Incident',
        mode: 'threshold',
        kind: 'case',
        fromStage: 1,
        toStage: 2,
        teamIds: [],
      },
      { id: 'evt-w3', timestamp: '2042-01-15T00:00:00.001Z' }
    )
    const week5 = makeEvent(
      'case.resolved',
      {
        week: 5,
        caseId: 'case-012',
        caseTitle: 'Week Five Incident',
        mode: 'threshold',
        kind: 'case',
        stage: 1,
        teamIds: [],
      },
      { id: 'evt-w5', timestamp: '2042-01-29T00:00:00.001Z' }
    )

    const game = gameWithEvents([week1, week3, week5])
    const views = getFilteredEventFeedViews(game, {
      ...DEFAULT_EVENT_FEED_FILTERS,
      weekMin: 2,
      weekMax: 4,
    })

    expect(views).toHaveLength(1)
    expect(views[0].event.id).toBe('evt-w3')
  })

  it('filters by entity id extracted from event payload', () => {
    const game = gameWithEvents([assignEvent, intelEvent, caseFailed])

    const byCase = getFilteredEventFeedViews(game, {
      ...DEFAULT_EVENT_FEED_FILTERS,
      entityId: 'case-001',
    })

    expect(byCase).toHaveLength(1)
    expect(byCase[0].event.type).toBe('assignment.team_assigned')

    const byTeam = getFilteredEventFeedViews(game, {
      ...DEFAULT_EVENT_FEED_FILTERS,
      entityId: 't_alpha',
    })

    expect(byTeam).toHaveLength(1)
    expect(byTeam[0].event.type).toBe('assignment.team_assigned')

    const noMatch = getFilteredEventFeedViews(game, {
      ...DEFAULT_EVENT_FEED_FILTERS,
      entityId: 'non-existent-id',
    })

    expect(noMatch).toHaveLength(0)
  })
})

describe('buildEventFeedView faction additions', () => {
  it('shows cooperative faction offers in case spawn feed entries', () => {
    const event = makeEvent('case.spawned', {
      week: 9,
      caseId: 'case-faction-offer',
      caseTitle: 'Archive Recovery Window',
      templateId: 'tpl-archive-window',
      kind: 'case',
      stage: 1,
      trigger: 'faction_offer',
      factionId: 'institutions',
      factionLabel: 'Academic Institutions',
      sourceReason:
        'Academic Institutions opened a cooperative mission window around archive work.',
    })
    const view = buildEventFeedView(event)

    expect(view.detail).toContain('cooperative mission window')
    expect(view.searchText).toContain('faction_offer')
  })

  it('shows faction unlock events in the feed', () => {
    const event = makeEvent('faction.unlock_available', {
      week: 6,
      factionId: 'black_budget',
      factionName: 'Black Budget Programs',
      contactId: 'blackbudget-ossian',
      contactName: 'Lena Ossian',
      label: 'Intercept operative referral',
      summary: 'Unlocks a covert technical recruit.',
      disposition: 'supportive',
    })
    const view = buildEventFeedView(event)

    expect(view.tone).toBe('success')
    expect(view.title).toContain('opened Intercept operative referral')
    expect(view.detail).toContain('Lena Ossian')
    expect(view.searchText).toContain('intercept operative referral')
  })
})
