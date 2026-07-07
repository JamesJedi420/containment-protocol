// cspell:words cand greentape medkits unassigns unequip
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { caseTemplateMap } from '../../data/caseTemplates'
import { createStartingState } from '../../data/startingState'
import {
  applySuccessfulInvestigation,
  buildInvestigationAskedFlagId,
} from '../../domain/investigationEconomy'
import { readPersistentFlag } from '../../domain/flagSystem'
import { copyInfiltrationProbePlan } from '../../domain/infiltrationProbe'
import { createStarterCase } from '../../domain/templates/startingCases'
import { buildWeeklyReportTutorialChoices } from '../../features/operations/frontDeskChoices'
import type { AgentData, Candidate } from '../../domain/models'
import { advanceWeek as advanceWeekDomain } from '../../domain/sim/advanceWeek'
import { assignTeam, unassignTeam } from '../../domain/sim/assign'
import { getTeamAssignedCaseId } from '../../domain/teamSimulation'
import { hireCandidate as hireCandidateDomain } from '../../domain/sim/hire'
import { scoutCandidate as scoutCandidateDomain } from '../../domain/sim/recruitmentScouting'
import {
  equipAgentItem as equipAgentItemDomain,
  unequipAgentItem as unequipAgentItemDomain,
} from '../../domain/sim/equipment'
import { queueFabrication as queueFabricationDomain } from '../../domain/sim/production'
import { GAME_STORE_VERSION } from './runTransfer'
import { hydrateGame, parseRunExport, serializeRunExport } from './runTransfer'
import { gameStorageFallback, resolveGameStorage, useGameStore } from './gameStore'
import {
  createTeam as createTeamDomain,
  deleteEmptyTeam as deleteEmptyTeamDomain,
  moveAgentBetweenTeams as moveAgentBetweenTeamsDomain,
  renameTeam as renameTeamDomain,
  setTeamLeader as setTeamLeaderDomain,
} from '../../domain/sim/teamManagement'
import { assignTeam as assignTeamDomain } from '../../domain/sim/assign'
import {
  queueTeamTraining as queueTeamTrainingDomain,
  queueTraining as queueTrainingDomain,
} from '../../domain/sim/training'
import { GAME_SAVE_KIND, GAME_SAVE_VERSION, loadGameSave } from './saveSystem'
import { RUN_EXPORT_KIND } from './runTransfer'
import * as supportActions from '../../domain/hub/supportActions'
import {
  applyPreparedSupportProcedure as applyPreparedSupportProcedureDomain,
  buildPreparedSupportProcedureExpendedFlagKey,
  refreshPreparedSupportProcedure as refreshPreparedSupportProcedureDomain,
} from '../../domain/supportLoadout'
import { createSquadMetadata } from '../../domain/squadMetadata'
import { createSquadKitTemplate } from '../../domain/squadKitTemplate'
import { assignSquadKit } from '../../domain/squadKitAssignment'
import { buildReplacementPressureState } from '../../domain/agent/attrition'
import { recomputeMissionRouting } from '../../domain/missionIntakeRouting'
import { COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE } from '../../domain/affiliationPersonStatusRecords'
import {
  HOSTILE_TO_COOPERATIVE_FIXTURE,
  PENDING_TO_APPROVED_FIXTURE,
  validateEntityWelfareReclassificationRecord,
} from '../../domain/entityWelfareReclassificationRegistry'
import { buildAffiliationFileWorkQueueActionRecordId } from '../../domain/affiliationFileWorkQueueActionRecords'
import {
  buildAffiliationFileWorkQueueEvidenceResolutionRecord,
  buildAffiliationFileWorkQueueEvidenceResolutionRecordId,
} from '../../domain/affiliationFileWorkQueueEvidenceResolutionRecords'
import { buildAffiliationFileWorkQueueRepairActionRecordId } from '../../domain/affiliationFileWorkQueueRepairActionRecords'
import { buildAffiliationFileWorkQueueReleaseActionRecordId } from '../../domain/affiliationFileWorkQueueReleaseActionRecords'
import { buildAffiliationFileWorkQueueReleaseOutcomeRecordId } from '../../domain/affiliationFileWorkQueueReleaseOutcomeRecords'
import {
  buildAffiliationFileWorkQueueReleaseFulfillmentRecord,
  buildAffiliationFileWorkQueueReleaseFulfillmentRecordId,
} from '../../domain/affiliationFileWorkQueueReleaseFulfillmentRecords'
import { buildAffiliationFileWorkQueueReleasePackageRecordId } from '../../domain/affiliationFileWorkQueueReleasePackageRecords'
import { buildAffiliationFileWorkQueueFileReleaseDeliveryRecordId } from '../../domain/affiliationFileWorkQueueFileReleaseDeliveryRecords'
import {
  buildAffiliationFileWorkQueueEvidenceRepairWorkflowId,
  buildAffiliationFileWorkQueueEvidenceRepairWorkflow,
} from '../../domain/affiliationFileWorkQueueEvidenceRepairWorkflows'
import { getAffiliationPersonStatusMirrorView } from '../../features/operations/affiliationPersonStatusMirrorView'

const STORE_KEY = 'containment-protocol-game-state'

function makeCooperativeContractorCandidate(): Candidate {
  return {
    id: 'candidate:cooperative-contractor',
    name: 'Cooperative Contractor',
    age: 31,
    category: 'agent',
    hireStatus: 'available',
    weeklyCost: 20,
    weeklyWage: 20,
    revealLevel: 2,
    expiryWeek: 8,
    origin: 'open-call',
    roleInclination: 'field',
    skills: ['recon-sweep', 'pathing'],
    liabilities: ['deadline-pressure'],
    funnelStage: 'hired',
    createdWeek: 1,
    lastUpdatedWeek: 1,
  }
}

function getPersistedState() {
  return useGameStore.persist.getOptions().storage?.getItem(STORE_KEY) as
    | { state: { game: Record<string, unknown> }; version: number }
    | null
    | undefined
}

function makeLiveSupportOperationState() {
  let state = createStartingState()
  state.agency = {
    ...state.agency!,
    supportAvailable: 0,
  }
  state.supportAvailable = 0
  state.externalSupportAssets = {
    'contractor-live': {
      id: 'contractor-live',
      label: 'Agency Contractor',
      assetClass: 'contractor',
      reliability: 80,
      tags: ['support'],
    },
  }

  state.cases['case-001'] = {
    ...state.cases['case-001'],
    status: 'open',
    durationWeeks: 1,
    weeksRemaining: undefined,
    difficulty: { combat: 1, investigation: 1, utility: 1, social: 1 },
    weights: { combat: 1, investigation: 1, utility: 1, social: 1 },
    requiredTags: [],
    preferredTags: [],
  }
  state.cases['case-002'] = {
    ...state.cases['case-002'],
    status: 'open',
    durationWeeks: 1,
    weeksRemaining: undefined,
    difficulty: { combat: 1, investigation: 1, utility: 1, social: 1 },
    weights: { combat: 1, investigation: 1, utility: 1, social: 1 },
    requiredTags: [],
    preferredTags: [],
  }

  state = assignTeamDomain(state, 'case-001', 't_nightwatch')
  state = assignTeamDomain(state, 'case-002', 't_greentape')

  state.cases['case-001'] = {
    ...state.cases['case-001'],
    status: 'in_progress',
    weeksRemaining: 1,
  }
  state.cases['case-002'] = {
    ...state.cases['case-002'],
    status: 'in_progress',
    weeksRemaining: 1,
  }

  return state
}

function expectCanonicalTeams(game: ReturnType<typeof createStartingState>) {
  for (const team of Object.values(game.teams)) {
    expect(team.memberIds).toEqual(team.agentIds)
    expect(team.derivedStats).toBeDefined()
    expect(team.status).toBeDefined()

    if (team.leaderId) {
      expect(team.memberIds).toContain(team.leaderId)
    }
  }
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('gameStore', () => {
  it('asks investigation questions only for in-progress cases with budget', () => {
    let game = createStartingState()
    game.cases['case-investigation-store'] = {
      ...createStarterCase({ id: 'case-investigation-store', templateId: 'ops-003' }),
      status: 'in_progress',
      weeksRemaining: 2,
      assignedTeamIds: [],
      requiredTags: [],
      preferredTags: [],
    }
    game = applySuccessfulInvestigation(game, {
      caseId: 'case-investigation-store',
      forensicBudget: 1,
      tacticalBudget: 0,
    })

    useGameStore.setState({ game })
    const before = useGameStore.getState().game

    useGameStore
      .getState()
      .askInvestigationQuestion(
        'case-investigation-store',
        'forensic',
        'forensic.present-signature'
      )

    expect(
      readPersistentFlag(
        useGameStore.getState().game,
        buildInvestigationAskedFlagId('case-investigation-store', 'forensic.present-signature')
      )
    ).toBe(true)
    expect(useGameStore.getState().game).not.toBe(before)

    const afterFirstAsk = useGameStore.getState().game

    useGameStore
      .getState()
      .askInvestigationQuestion(
        'case-investigation-store',
        'forensic',
        'forensic.present-signature'
      )

    expect(useGameStore.getState().game).toBe(afterFirstAsk)

    useGameStore
      .getState()
      .askInvestigationQuestion('missing-case', 'forensic', 'forensic.present-signature')

    expect(useGameStore.getState().game).toBe(afterFirstAsk)

    useGameStore.setState({
      game: {
        ...afterFirstAsk,
        cases: {
          ...afterFirstAsk.cases,
          'case-investigation-store': {
            ...afterFirstAsk.cases['case-investigation-store']!,
            status: 'resolved',
          },
        },
      },
    })

    const resolvedSnapshot = useGameStore.getState().game

    useGameStore
      .getState()
      .askInvestigationQuestion('case-investigation-store', 'forensic', 'forensic.missing-proof')

    expect(useGameStore.getState().game).toBe(resolvedSnapshot)
    expect(
      readPersistentFlag(
        useGameStore.getState().game,
        buildInvestigationAskedFlagId('case-investigation-store', 'forensic.missing-proof')
      )
    ).toBeUndefined()
  })

  it('sets infiltration weekly probe override only on eligible in-progress cases', () => {
    const game = createStartingState()
    game.cases['case-infiltration-store'] = {
      ...createStarterCase({ id: 'case-infiltration-store', templateId: 'ops-004' }),
      status: 'in_progress',
      hiddenState: 'hidden',
      tags: ['infiltration'],
      infiltrationProbePlan: copyInfiltrationProbePlan(
        caseTemplateMap['ops-004'].infiltrationProbePlan
      ),
      requiredTags: [],
      preferredTags: [],
      assignedTeamIds: [],
    }

    useGameStore.setState({ game })

    useGameStore
      .getState()
      .setInfiltrationWeeklyProbeAction('case-infiltration-store', 'probe_route')

    expect(
      useGameStore.getState().game.cases['case-infiltration-store']
        ?.infiltrationWeeklyProbeActionOverride
    ).toBe('probe_route')

    useGameStore.getState().setInfiltrationWeeklyProbeAction('case-infiltration-store', null)

    expect(
      useGameStore.getState().game.cases['case-infiltration-store']
        ?.infiltrationWeeklyProbeActionOverride
    ).toBeUndefined()

    useGameStore.getState().setInfiltrationWeeklyProbeAction('missing-case', 'cleanup')

    expect(useGameStore.getState().game.cases['missing-case']).toBeUndefined()
  })

  it('assigns and unassigns teams through the store actions', () => {
    useGameStore.getState().assign('case-001', 't_nightwatch')

    expect(useGameStore.getState().game.cases['case-001'].assignedTeamIds).toEqual(['t_nightwatch'])
    expect(getTeamAssignedCaseId(useGameStore.getState().game.teams['t_nightwatch'])).toBe(
      'case-001'
    )

    useGameStore.getState().unassign('case-001', 't_nightwatch')

    expect(useGameStore.getState().game.cases['case-001'].assignedTeamIds).toEqual([])
    expect(getTeamAssignedCaseId(useGameStore.getState().game.teams['t_nightwatch'])).toBeNull()
  })

  it('advances the simulation and appends a report', () => {
    useGameStore.getState().advanceWeek()

    expect(useGameStore.getState().game.week).toBe(2)
    expect(useGameStore.getState().game.reports).toHaveLength(1)
  })

  it('routes rally support through the store and persists contractor reliability into later support-facing simulation', () => {
    const spy = vi.spyOn(supportActions, 'applyRallySupportStaffAction')
    const baselineResult = advanceWeekDomain(makeLiveSupportOperationState())

    useGameStore.setState({ game: makeLiveSupportOperationState() })

    const note = useGameStore.getState().rallySupportStaff(1)

    expect(spy).toHaveBeenCalledTimes(1)
    expect(note?.type).toBe('support.restored')
    expect(note?.content).toContain('Agency Contractor')
    expect(note?.content).toContain('Trust level: high')

    expect(useGameStore.getState().game.externalSupportAssets?.['contractor-live']).toMatchObject({
      reliability: 92,
    })

    const stored = getPersistedState()
    expect(stored?.state.game.externalSupportAssets).toMatchObject({
      'contractor-live': expect.objectContaining({
        reliability: 92,
        lastDriftReason: expect.stringContaining('Agency Contractor reliability improved'),
      }),
    })

    useGameStore.getState().advanceWeek()

    const next = useGameStore.getState().game
    const baselineShortfalls = Object.values(baselineResult.cases).filter(
      (currentCase) => currentCase.supportShortfall
    )
    const nextShortfalls = Object.values(next.cases).filter(
      (currentCase) => currentCase.supportShortfall
    )

    expect(nextShortfalls).toHaveLength(0)
    expect(baselineShortfalls).toHaveLength(2)

    spy.mockRestore()
  })

  it('exposes canonical runtime-state actions without direct mutation', () => {
    useGameStore.getState().setPlayerProfile({ displayName: 'Handler One' })
    useGameStore.getState().setGlobalFlag('story.prologue_complete', true)
    useGameStore.getState().markOneShotEvent('event.prologue', 'opening')
    useGameStore.getState().setCurrentLocation({
      hubId: 'agency',
      locationId: 'operations-desk',
      sceneId: 'briefing-room',
    })
    useGameStore.getState().recordSceneVisit({
      locationId: 'operations-desk',
      sceneId: 'briefing-room',
      outcome: 'accepted-contract',
    })
    useGameStore.getState().setEncounterRuntimeState('case-001', {
      status: 'active',
      flags: { foreshadowed: true },
    })
    useGameStore.getState().advanceProgressClock('story.clock', 2, {
      label: 'Story Clock',
      max: 4,
    })
    useGameStore.getState().setUiDebugState({
      selectedCaseId: 'case-001',
      debug: { enabled: true, flags: { tracing: true } },
    })
    useGameStore.getState().adjustInventoryQuantity('debug_supplies', 2)

    const game = useGameStore.getState().game

    expect(game.runtimeState?.player.displayName).toBe('Handler One')
    expect(game.runtimeState?.globalFlags['story.prologue_complete']).toBe(true)
    expect(game.runtimeState?.oneShotEvents['event.prologue']?.source).toBe('opening')
    expect(game.runtimeState?.currentLocation.sceneId).toBe('briefing-room')
    expect(game.runtimeState?.sceneHistory.at(-1)?.sceneId).toBe('briefing-room')
    expect(game.runtimeState?.encounterState['case-001']?.flags?.foreshadowed).toBe(true)
    expect(game.runtimeState?.progressClocks['story.clock']?.value).toBe(2)
    expect(game.runtimeState?.ui.debug.flags.tracing).toBe(true)
    expect(game.inventory.debug_supplies).toBe(2)
  })

  it('executes authored choices through the store and returns structured results', () => {
    const choice = buildWeeklyReportTutorialChoices()[0]

    const result = useGameStore.getState().applyAuthoredChoice(choice, {
      activeContextId: 'frontdesk.notice.weekly-report-tutorial',
    })

    expect(result).toMatchObject({
      applied: true,
      choiceId: choice.id,
      nextTargetId: 'frontdesk.notice.weekly-report.returning',
      consumedOneShots: ['frontdesk.tutorial.weekly-report'],
    })
    expect(
      useGameStore.getState().game.runtimeState?.globalFlags[
        'frontdesk.tutorial.weekly-report.acknowledged'
      ]
    ).toBe(true)
    expect(useGameStore.getState().game.runtimeState?.ui.debug.eventLog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'choice.executed',
          summary: `Choice executed: ${choice.id}`,
        }),
      ])
    )
  })

  it('logs one-shot consumption only once when repeat-trigger prevention holds', () => {
    expect(
      useGameStore.getState().consumeOneShotContent('frontdesk.warning.weekly-report', 'frontdesk')
    ).toBe(true)
    expect(
      useGameStore.getState().consumeOneShotContent('frontdesk.warning.weekly-report', 'frontdesk')
    ).toBe(false)

    const oneShotLogs = (useGameStore.getState().game.runtimeState?.ui.debug.eventLog ?? []).filter(
      (entry) => entry.type === 'one_shot.consumed'
    )

    expect(oneShotLogs).toHaveLength(1)
    expect(oneShotLogs[0]).toMatchObject({
      summary: 'One-shot consumed: frontdesk.warning.weekly-report',
    })
  })

  it('queues, peeks, dequeues, and clears authored runtime follow-up events deterministically', () => {
    const firstId = useGameStore.getState().enqueueRuntimeEvent({
      type: 'authored.follow_up',
      targetId: 'followup.alpha',
      source: 'choice.alpha',
      week: 1,
    })
    const secondId = useGameStore.getState().enqueueRuntimeEvent({
      type: 'authored.follow_up',
      targetId: 'followup.beta',
      source: 'choice.beta',
      week: 1,
    })

    expect(firstId).toBe('qevt-0001')
    expect(secondId).toBe('qevt-0002')
    expect(useGameStore.getState().peekRuntimeEvent()).toBe('qevt-0001')
    expect(
      useGameStore
        .getState()
        .listRuntimeEventQueue()
        .map((entry) => entry.targetId)
    ).toEqual(['followup.alpha', 'followup.beta'])

    expect(useGameStore.getState().dequeueRuntimeEvent()).toBe('qevt-0001')
    expect(
      useGameStore
        .getState()
        .listRuntimeEventQueue()
        .map((entry) => entry.targetId)
    ).toEqual(['followup.beta'])

    expect(useGameStore.getState().clearRuntimeEventQueue()).toBe(1)
    expect(useGameStore.getState().listRuntimeEventQueue()).toEqual([])

    const logTypes = (useGameStore.getState().game.runtimeState?.ui.debug.eventLog ?? []).map(
      (entry) => entry.type
    )
    expect(logTypes).toContain('event_queue.enqueued')
    expect(logTypes).toContain('event_queue.dequeued')
    expect(logTypes).toContain('event_queue.cleared')
  })

  it('runs bounded debug reset actions without mutating unrelated simulation state', () => {
    useGameStore.getState().setPersistentFlag('reset.test.flag', true)
    useGameStore.getState().markOneShotEvent('reset.test.one-shot', 'debug')
    useGameStore.getState().advanceProgressClock('debug.reset.test.clock', 2, {
      label: 'Reset Test Clock',
      max: 4,
    })
    useGameStore.getState().setEncounterRuntimeState('reset.test.encounter', {
      status: 'active',
      phase: 'debug',
    })
    useGameStore.getState().enqueueRuntimeEvent({
      type: 'authored.follow_up',
      targetId: 'reset.followup.alpha',
      week: 1,
    })
    useGameStore.getState().appendDeveloperLogEvent({
      type: 'choice.executed',
      summary: 'Choice executed: reset.debug',
    })

    const fundingBefore = useGameStore.getState().game.funding
    const weekBefore = useGameStore.getState().game.week

    const summary = useGameStore.getState().debugReset({
      clearDeveloperLog: true,
      clearEventQueue: true,
      clearEncounterRuntime: { clearAll: true },
      resetFlags: { flagIds: ['reset.test.flag'] },
      resetOneShots: { contentIds: ['reset.test.one-shot'] },
      resetProgressClocks: { clockIds: ['debug.reset.test.clock'], resetToDefaults: false },
      resetAuthoredDebugContext: true,
    })

    expect(summary).toMatchObject({
      clearedDeveloperLog: true,
      clearedEventQueue: true,
      resetFlagCount: 1,
      resetOneShotCount: 1,
      resetProgressClockCount: 1,
      clearedEncounterCount: 1,
      resetAuthoredDebugContext: true,
      fullRuntimeDebugReset: false,
    })

    const game = useGameStore.getState().game
    expect(game.runtimeState?.globalFlags['reset.test.flag']).toBeUndefined()
    expect(game.runtimeState?.oneShotEvents['reset.test.one-shot']).toBeUndefined()
    expect(game.runtimeState?.progressClocks['debug.reset.test.clock']).toMatchObject({
      value: 0,
      max: 4,
    })
    expect(game.runtimeState?.encounterState).toEqual({})
    expect(game.runtimeState?.eventQueue.entries).toEqual([])
    expect(game.runtimeState?.ui.authoring).toBeUndefined()

    expect(game.funding).toBe(fundingBefore)
    expect(game.week).toBe(weekBefore)
  })

  it('supports explicit full runtime debug reset while preserving simulation core data', () => {
    useGameStore.getState().setPersistentFlag('reset.full.flag', true)
    useGameStore.getState().markOneShotEvent('reset.full.one-shot', 'debug')
    useGameStore.getState().advanceProgressClock('reset.full.clock', 2, {
      label: 'Reset Full Clock',
      max: 4,
    })

    const before = useGameStore.getState().game
    const summary = useGameStore.getState().debugReset({ fullRuntimeDebugReset: true })
    const after = useGameStore.getState().game

    expect(summary.fullRuntimeDebugReset).toBe(true)
    expect(after.funding).toBe(before.funding)
    expect(after.week).toBe(before.week)
    expect(after.config).toEqual(before.config)
    expect(after.runtimeState?.globalFlags).toEqual({})
    expect(after.runtimeState?.oneShotEvents).toEqual({})
    expect(after.runtimeState?.progressClocks).toEqual({})
    expect(after.runtimeState?.encounterState).toEqual({})
    expect(after.runtimeState?.eventQueue.entries).toEqual([])
  })

  it('resolves hidden encounters deterministically and logs compact outcome details', () => {
    useGameStore.getState().setPersistentFlag('encounter.hidden.bonus', true)

    const result = useGameStore.getState().resolveHiddenEncounter(
      {
        encounterId: 'encounter.hidden.alpha',
        basePower: 48,
        baseDifficulty: 52,
        modifiers: [
          {
            id: 'bonus-flag',
            when: {
              flags: {
                allFlags: ['encounter.hidden.bonus'],
              },
            },
            powerDelta: 6,
          },
        ],
        followUpByOutcome: {
          success: ['frontdesk.encounter.alpha.after-action'],
        },
        flagEffectsByOutcome: {
          success: {
            set: {
              'encounter.hidden.alpha.resolved': true,
            },
            clear: ['encounter.hidden.bonus'],
          },
        },
        progressEffectsByOutcome: {
          success: [
            {
              clockId: 'encounter.hidden.alpha.clock',
              delta: 1,
              defaults: {
                label: 'Hidden Encounter Alpha',
                max: 3,
              },
            },
          ],
        },
      },
      {
        activeContextId: 'frontdesk.notice.encounter.hidden.alpha',
      }
    )

    expect(result.resolution.outcome).toBe('success')
    expect(result.apply.queueEvents).toHaveLength(1)

    const game = useGameStore.getState().game
    expect(game.runtimeState?.encounterState['encounter.hidden.alpha']).toMatchObject({
      status: 'resolved',
      phase: 'hidden-combat:success',
      startedWeek: 1,
      resolvedWeek: 1,
      latestOutcome: 'success',
      lastResolutionId: result.resolution.resolutionId,
      followUpIds: ['frontdesk.encounter.alpha.after-action'],
    })
    expect(game.runtimeState?.globalFlags['encounter.hidden.alpha.resolved']).toBe(true)
    expect(game.runtimeState?.globalFlags['encounter.hidden.bonus']).toBeUndefined()
    expect(game.runtimeState?.progressClocks['encounter.hidden.alpha.clock']).toMatchObject({
      value: 1,
      max: 3,
    })
    expect(
      useGameStore
        .getState()
        .listRuntimeEventQueue()
        .map((entry) => entry.targetId)
    ).toContain('frontdesk.encounter.alpha.after-action')

    const logs = game.runtimeState?.ui.debug.eventLog ?? []
    expect(logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'encounter.patched',
          summary: 'Hidden encounter resolved: encounter.hidden.alpha (success)',
        }),
        expect.objectContaining({
          type: 'event_queue.enqueued',
          summary: 'Hidden encounter queued 1 follow-up event',
        }),
      ])
    )
  })

  it('matches direct domain mutations with store actions and keeps team state canonical', () => {
    let direct = createStartingState()
    direct = createTeamDomain(direct, 'Archive Wardens', 'a_ava')
    const createdTeamId = Object.values(direct.teams).find(
      (team) => team.name === 'Archive Wardens'
    )!.id
    direct = moveAgentBetweenTeamsDomain(direct, 'a_rook', createdTeamId)
    direct = setTeamLeaderDomain(direct, createdTeamId, 'a_rook')
    direct = renameTeamDomain(direct, createdTeamId, 'Archive Wardens Prime')
    direct = assignTeam(direct, 'case-002', 't_greentape')
    direct = queueTrainingDomain(direct, 'a_mina', 'analysis-lab')
    direct = queueTeamTrainingDomain(direct, 't_nightwatch', 'coordination-drill')
    direct = queueFabricationDomain(direct, 'med-kits')
    direct = advanceWeekDomain(direct)

    useGameStore.setState({ game: createStartingState() })
    useGameStore.getState().createTeam('Archive Wardens', 'a_ava')
    const storeCreatedTeamId = Object.values(useGameStore.getState().game.teams).find(
      (team) => team.name === 'Archive Wardens'
    )!.id
    useGameStore.getState().moveAgentBetweenTeams('a_rook', storeCreatedTeamId)
    useGameStore.getState().setTeamLeader(storeCreatedTeamId, 'a_rook')
    useGameStore.getState().renameTeam(storeCreatedTeamId, 'Archive Wardens Prime')
    useGameStore.getState().assign('case-002', 't_greentape')
    useGameStore.getState().queueTraining('a_mina', 'analysis-lab')
    useGameStore.getState().queueTeamTraining('t_nightwatch', 'coordination-drill')
    useGameStore.getState().queueFabrication('med-kits')
    useGameStore.getState().advanceWeek()

    const storeGame = useGameStore.getState().game

    expect(storeGame).toEqual(direct)
    expectCanonicalTeams(storeGame)
  })

  it('unassign: domain mutator result equals store action result', () => {
    const initial = assignTeam(createStartingState(), 'case-001', 't_nightwatch')
    const direct = unassignTeam(initial, 'case-001', 't_nightwatch')

    useGameStore.setState({ game: initial })
    useGameStore.getState().unassign('case-001', 't_nightwatch')

    expect(useGameStore.getState().game).toEqual(direct)
    expectCanonicalTeams(useGameStore.getState().game)
  })

  it('hireCandidate: domain mutator result equals store action result', () => {
    const agentData: AgentData = {
      role: 'combat',
      specialization: 'recon',
      stats: { combat: 60, investigation: 30, utility: 20, social: 20 },
      traits: [],
    }
    const candidate: Candidate = {
      id: 'cand-test',
      name: 'Test Recruit',
      age: 28,
      category: 'agent',
      hireStatus: 'candidate',
      revealLevel: 2,
      expiryWeek: 5,
      agentData,
      evaluation: {
        overallVisible: true,
        potentialVisible: false,
        rumorTags: [],
      },
    }
    const initial = { ...createStartingState(), candidates: [candidate] }

    const direct = hireCandidateDomain(initial, candidate.id)

    useGameStore.setState({ game: initial })
    useGameStore.getState().hireCandidate(candidate.id)

    expect(useGameStore.getState().game).toEqual(direct)
    expectCanonicalTeams(useGameStore.getState().game)
  })

  it('scoutCandidate: domain mutator result equals store action result', () => {
    const candidate: Candidate = {
      id: 'cand-scout',
      name: 'Scout Prospect',
      age: 29,
      category: 'agent',
      hireStatus: 'available',
      revealLevel: 0,
      expiryWeek: 5,
      weeklyCost: 16,
      weeklyWage: 16,
      actualPotentialTier: 'A',
      agentData: {
        role: 'combat',
        specialization: 'recon',
        stats: { combat: 62, investigation: 34, utility: 28, social: 22 },
        traits: [],
      },
      evaluation: {
        overallVisible: false,
        overallValue: 74,
        potentialVisible: false,
        potentialTier: 'mid',
        rumorTags: [],
      },
    }
    const initial = {
      ...createStartingState(),
      rngSeed: 2468,
      rngState: 2468,
      candidates: [candidate],
    }

    const direct = scoutCandidateDomain(initial, candidate.id)

    useGameStore.setState({ game: initial })
    useGameStore.getState().scoutCandidate(candidate.id)

    expect(useGameStore.getState().game).toEqual(direct)
    expectCanonicalTeams(useGameStore.getState().game)
  })

  it('supports explicit recruitment funnel transitions through store actions', () => {
    const initial = createStartingState()
    initial.candidates = [
      {
        id: 'cand-funnel-store',
        name: 'Store Funnel Candidate',
        age: 29,
        category: 'agent',
        hireStatus: 'available',
        weeklyCost: 20,
        weeklyWage: 20,
        revealLevel: 2,
        expiryWeek: 8,
        funnelStage: 'prospect',
        createdWeek: 1,
        lastUpdatedWeek: 1,
        evaluation: {
          overallVisible: true,
          overall: 72,
          overallValue: 72,
          potentialVisible: true,
          potentialTier: 'mid',
          rumorTags: [],
        },
        agentData: {
          role: 'field',
          specialization: 'recon',
          stats: {
            combat: 60,
            investigation: 55,
            utility: 52,
            social: 41,
          },
          traits: ['steady-aim'],
        },
      },
    ] as typeof initial.candidates

    useGameStore.setState({ game: initial })

    expect(useGameStore.getState().contactCandidate('cand-funnel-store', 'initial outreach')).toBe(
      true
    )
    expect(useGameStore.getState().screenCandidate('cand-funnel-store', 'screen packet')).toBe(true)

    expect(useGameStore.getState().game.candidates[0]).toMatchObject({
      funnelStage: 'screening',
      transitionNotes: ['initial outreach', 'screen packet'],
    })
  })

  it('equipment actions: domain mutators equal store actions and keep inventory canonical', () => {
    const initial = createStartingState()
    initial.inventory.signal_jammers = 1
    const equipped = equipAgentItemDomain(initial, 'a_mina', 'utility1', 'signal_jammers')
    const direct = unequipAgentItemDomain(equipped, 'a_mina', 'utility1')

    useGameStore.setState({ game: initial })
    useGameStore.getState().equipAgentItem('a_mina', 'utility1', 'signal_jammers')
    useGameStore.getState().unequipAgentItem('a_mina', 'utility1')

    expect(useGameStore.getState().game).toEqual(direct)
    expect(useGameStore.getState().game.inventory.signal_jammers).toBe(1)
    expect(useGameStore.getState().game.agents.a_mina.equipmentSlots?.utility1).toBeUndefined()
    expectCanonicalTeams(useGameStore.getState().game)
  })

  it('prepared support procedure actions: domain helpers equal store actions and persist encounter-local state', () => {
    const initial = createStartingState()
    initial.inventory.medkits = 2
    initial.cases['case-001'] = {
      ...initial.cases['case-001'],
      tags: ['medical', 'triage'],
      requiredTags: [],
      preferredTags: [],
    }

    const equipped = equipAgentItemDomain(initial, 'a_casey', 'utility1', 'medkits')
    const applied = applyPreparedSupportProcedureDomain(equipped, 'case-001', 'a_casey')
    const direct = refreshPreparedSupportProcedureDomain(applied.state, 'case-001', 'a_casey')

    useGameStore.setState({ game: equipped })

    const storeApplied = useGameStore
      .getState()
      .applyPreparedSupportProcedure('case-001', 'a_casey')
    const storeRefreshed = useGameStore
      .getState()
      .refreshPreparedSupportProcedure('case-001', 'a_casey')

    expect(storeApplied).toMatchObject({
      applied: true,
      outcome: 'supported',
    })
    expect(storeRefreshed).toMatchObject({
      refreshed: true,
      reason: 'refreshed',
    })
    expect(useGameStore.getState().game).toEqual(direct.state)

    const stored = getPersistedState()
    expect(stored?.state.game.runtimeState).toMatchObject({
      encounterState: {
        'case-001': {
          phase: 'support-procedure:medical:refreshed',
          flags: expect.objectContaining({
            [buildPreparedSupportProcedureExpendedFlagKey('a_casey', 'medical')]: false,
          }),
        },
      },
    })
    expect(stored?.state.game.inventory).toMatchObject({
      medkits: 0,
    })
  })

  it('deleteEmptyTeam: domain mutator result equals store action result', () => {
    const base = createStartingState()
    const teamAgentIds = [...(base.teams['t_greentape'].agentIds ?? [])]
    let emptyState = base

    for (const agentId of teamAgentIds) {
      emptyState = moveAgentBetweenTeamsDomain(emptyState, agentId, null)
    }

    const direct = deleteEmptyTeamDomain(emptyState, 't_greentape')

    useGameStore.setState({ game: emptyState })
    useGameStore.getState().deleteEmptyTeam('t_greentape')

    expect(useGameStore.getState().game).toEqual(direct)
    expect(useGameStore.getState().game.teams['t_greentape']).toBeUndefined()
  })

  it('queues fabrication orders through the store and records a production event', () => {
    const startingFunding = useGameStore.getState().game.funding

    useGameStore.getState().queueFabrication('med-kits')

    expect(useGameStore.getState().game.productionQueue).toHaveLength(1)
    expect(useGameStore.getState().game.funding).toBeLessThan(startingFunding)
    expect(useGameStore.getState().game.events.at(-1)).toMatchObject({
      type: 'production.queue_started',
      sourceSystem: 'production',
    })
  })

  it('creates and edits squads through the store actions', () => {
    useGameStore.getState().createTeam('Archive Wardens', 'a_ava')

    const createdTeam = Object.values(useGameStore.getState().game.teams).find(
      (team) => team.name === 'Archive Wardens'
    )

    expect(createdTeam).toBeDefined()
    expect(createdTeam?.agentIds).toEqual(['a_ava'])
    expect(useGameStore.getState().game.teams['t_nightwatch'].agentIds).not.toContain('a_ava')

    useGameStore.getState().moveAgentBetweenTeams('a_rook', createdTeam!.id)
    useGameStore.getState().setTeamLeader(createdTeam!.id, 'a_rook')
    useGameStore.getState().renameTeam(createdTeam!.id, 'Archive Wardens Prime')

    expect(useGameStore.getState().game.teams[createdTeam!.id]).toMatchObject({
      name: 'Archive Wardens Prime',
      leaderId: 'a_rook',
    })
    expect(useGameStore.getState().game.teams[createdTeam!.id].agentIds).toEqual([
      'a_ava',
      'a_rook',
    ])
  })

  it('blocks deployed squad edits and deletes empty squads', () => {
    useGameStore.getState().assign('case-001', 't_nightwatch')

    useGameStore.getState().moveAgentBetweenTeams('a_ava', null)
    expect(useGameStore.getState().game.teams['t_nightwatch'].agentIds).toContain('a_ava')

    useGameStore.getState().createTeam('Reserve Cutout', 'a_casey')
    const createdTeam = Object.values(useGameStore.getState().game.teams).find(
      (team) => team.name === 'Reserve Cutout'
    )

    expect(createdTeam).toBeDefined()

    useGameStore.getState().moveAgentBetweenTeams('a_casey', null)
    expect(useGameStore.getState().game.teams[createdTeam!.id].agentIds).toEqual([])

    useGameStore.getState().deleteEmptyTeam(createdTeam!.id)
    expect(useGameStore.getState().game.teams[createdTeam!.id]).toBeUndefined()
  })

  it('cleans squad metadata + assignment when deleting empty teams to prevent ID reuse leaks', () => {
    useGameStore.getState().createTeam('Scoped Cleanup', 'a_casey')
    const createdTeam = Object.values(useGameStore.getState().game.teams).find(
      (team) => team.name === 'Scoped Cleanup'
    )
    expect(createdTeam).toBeDefined()

    const metadataResult = createSquadMetadata({
      squadId: createdTeam!.id,
      name: 'Scoped Cleanup',
      role: 'rapid_response',
      doctrine: 'containment',
      shift: 'night',
      assignedZone: 'zone-north',
      designatedLeaderId: 'a_casey',
    })
    const templateResult = createSquadKitTemplate({
      id: 'cleanup-kit',
      label: 'Cleanup Kit',
      requiredItemTags: ['breach'],
      minCoveredCount: 1,
    })
    expect(metadataResult.ok).toBe(true)
    expect(templateResult.ok).toBe(true)
    if (!metadataResult.ok || !templateResult.ok) {
      throw new Error('Failed setup fixture for squad cleanup test')
    }
    const assignmentResult = assignSquadKit(metadataResult.metadata, templateResult.template)
    expect(assignmentResult.ok).toBe(true)
    if (!assignmentResult.ok) {
      throw new Error('Failed assignment setup fixture for squad cleanup test')
    }

    useGameStore.getState().setSquadMetadata(metadataResult.metadata)
    useGameStore.getState().setSquadKitTemplate(templateResult.template)
    useGameStore.getState().setSquadKitAssignment(assignmentResult.assignment)

    useGameStore.getState().moveAgentBetweenTeams('a_casey', null)
    useGameStore.getState().deleteEmptyTeam(createdTeam!.id)

    const afterDelete = useGameStore.getState().game
    expect(afterDelete.teams[createdTeam!.id]).toBeUndefined()
    expect(afterDelete.squadMetadata?.[createdTeam!.id]).toBeUndefined()
    expect(afterDelete.squadKitAssignments?.[createdTeam!.id]).toBeUndefined()

    useGameStore.getState().createTeam('Reused Team ID', 'a_ava')
    const reusedTeam = Object.values(useGameStore.getState().game.teams).find(
      (team) => team.name === 'Reused Team ID'
    )
    expect(reusedTeam?.id).toBe(createdTeam!.id)
    expect(useGameStore.getState().game.squadMetadata?.[reusedTeam!.id]).toBeUndefined()
    expect(useGameStore.getState().game.squadKitAssignments?.[reusedTeam!.id]).toBeUndefined()
  })

  it('queues training through the store and writes the started queue entry to storage', () => {
    const fundingBefore = useGameStore.getState().game.funding
    useGameStore.getState().queueTraining('a_mina', 'analysis-lab')

    const stored = getPersistedState()

    expect(stored).toMatchObject({
      version: GAME_STORE_VERSION,
      state: {
        game: {
          funding: fundingBefore - 10,
          trainingQueue: [
            {
              id: expect.stringMatching(/^training-\d+-\d+-\d+$/),
              trainingId: 'analysis-lab',
              trainingName: 'Analysis Lab',
              scope: 'agent',
              agentId: 'a_mina',
              agentName: 'Mina Park',
              targetStat: 'investigation',
              statDelta: 2,
              startedWeek: 1,
              durationWeeks: 2,
              remainingWeeks: 2,
              fundingCost: 10,
              fatigueDelta: 5,
              relationshipDelta: 0,
              trainedRelationshipDelta: 0,
            },
          ],
          agents: expect.objectContaining({
            a_mina: expect.objectContaining({
              assignment: expect.objectContaining({
                state: 'training',
                startedWeek: 1,
                trainingProgramId: 'analysis-lab',
              }),
            }),
          }),
        },
      },
    })
  })

  it('updates the rng seed and active config', () => {
    useGameStore.getState().setSeed(42)
    useGameStore.getState().updateConfig({
      maxActiveCases: 9,
      probabilityK: 3.5,
      challengeModeEnabled: true,
    })

    expect(useGameStore.getState().game.rngSeed).toBe(42)
    expect(useGameStore.getState().game.rngState).toBe(42)
    expect(useGameStore.getState().game.config).toMatchObject({
      maxActiveCases: 9,
      probabilityK: 3.5,
      challengeModeEnabled: true,
    })
  })

  it('normalizes invalid seed input before storing it', () => {
    useGameStore.getState().setSeed(Number.NaN)

    expect(useGameStore.getState().game.rngSeed).toBe(1)
    expect(useGameStore.getState().game.rngState).toBe(1)
  })

  it('sanitizes invalid config patches before writing them into state', () => {
    useGameStore.getState().updateConfig({
      maxActiveCases: 0,
      partialMargin: -4,
      stageScalar: 0,
      attritionPerWeek: -2,
      probabilityK: Number.NaN,
      raidCoordinationPenaltyPerExtraTeam: 5,
      durationModel: 'bogus' as never,
    })

    expect(useGameStore.getState().game.config).toMatchObject({
      maxActiveCases: 1,
      partialMargin: 0,
      stageScalar: 0.05,
      challengeModeEnabled: false,
      attritionPerWeek: 1,
      probabilityK: 2.4,
      raidCoordinationPenaltyPerExtraTeam: 1,
      durationModel: 'capacity',
    })
  })

  it('falls back to capacity when attrition is requested without challenge mode', () => {
    useGameStore.getState().updateConfig({
      challengeModeEnabled: false,
      durationModel: 'attrition',
    })

    expect(useGameStore.getState().game.config).toMatchObject({
      challengeModeEnabled: false,
      durationModel: 'capacity',
    })
  })

  it('allows attrition when challenge mode is enabled in the same patch', () => {
    useGameStore.getState().updateConfig({
      challengeModeEnabled: true,
      durationModel: 'attrition',
    })

    expect(useGameStore.getState().game.config).toMatchObject({
      challengeModeEnabled: true,
      durationModel: 'attrition',
    })
  })

  it('resets to a fresh starting state after mutations', () => {
    const initialGame = useGameStore.getState().game

    useGameStore.getState().assign('case-001', 't_nightwatch')
    useGameStore.getState().advanceWeek()
    useGameStore.getState().setSeed(77)
    useGameStore.getState().updateConfig({ maxActiveCases: 10 })

    useGameStore.getState().reset()

    const resetGame = useGameStore.getState().game

    expect(resetGame).toEqual(createStartingState())
    expect(resetGame).not.toBe(initialGame)
  })

  it('exports a save payload and imports it back through the store actions', () => {
    useGameStore.getState().assign('case-001', 't_nightwatch')
    useGameStore.getState().advanceWeek()
    useGameStore.getState().queueTraining('a_mina', 'analysis-lab')
    useGameStore.getState().setGlobalFlag('frontdesk.notice.breach.unlocked', true)
    useGameStore.getState().markOneShotEvent('frontdesk.notice.weekly-report', 'frontdesk')
    useGameStore.getState().setCurrentLocation({
      hubId: 'agency',
      locationId: 'front-desk',
      sceneId: 'weekly-report',
    })
    useGameStore.getState().advanceProgressClock('story.breach', 1, {
      label: 'Breach',
      max: 4,
    })
    useGameStore.getState().setUiDebugState({
      authoring: {
        activeContextId: 'frontdesk.notice.weekly-report',
        lastChoiceId: 'frontdesk.notice.weekly-report.acknowledge',
        lastNextTargetId: 'frontdesk.notice.weekly-report.returning',
        lastFollowUpIds: ['frontdesk.notice.weekly-report.returning'],
        updatedWeek: 2,
      },
    })
    useGameStore.getState().setSeed(77)
    useGameStore.getState().updateConfig({
      maxActiveCases: 9,
      challengeModeEnabled: true,
      durationModel: 'attrition',
    })

    const exported = useGameStore.getState().exportSave()
    const payload = JSON.parse(exported) as {
      kind: string
      version: number
      savedAt: string
      state: Record<string, unknown>
    }

    expect(payload).toMatchObject({
      kind: GAME_SAVE_KIND,
      version: GAME_SAVE_VERSION,
    })
    expect(payload.savedAt).toBeTypeOf('string')
    expect(new Date(payload.savedAt).toISOString()).toBe(payload.savedAt)
    expect(payload.state).not.toHaveProperty('templates')
    expect(JSON.parse(useGameStore.getState().exportRun())).toMatchObject({
      kind: RUN_EXPORT_KIND,
      version: GAME_STORE_VERSION,
    })

    useGameStore.getState().reset()
    useGameStore.getState().importSave(exported)

    const importedFromPayload = loadGameSave(exported)
    expect(useGameStore.getState().game.week).toBe(importedFromPayload.week)
    expect(useGameStore.getState().game.rngSeed).toBe(importedFromPayload.rngSeed)
    expect(useGameStore.getState().game.config).toEqual(importedFromPayload.config)
    expect(useGameStore.getState().game.runtimeState?.globalFlags).toEqual(
      importedFromPayload.runtimeState?.globalFlags
    )
    expect(useGameStore.getState().game.runtimeState?.oneShotEvents).toEqual(
      importedFromPayload.runtimeState?.oneShotEvents
    )
    expect(useGameStore.getState().game.runtimeState?.ui.authoring).toMatchObject({
      activeContextId: 'frontdesk.notice.weekly-report',
      lastChoiceId: 'frontdesk.notice.weekly-report.acknowledge',
      lastNextTargetId: 'frontdesk.notice.weekly-report.returning',
      lastFollowUpIds: ['frontdesk.notice.weekly-report.returning'],
    })
    const logTypes = (useGameStore.getState().game.runtimeState?.ui.debug.eventLog ?? []).map(
      (entry) => entry.type
    )
    expect(logTypes).toContain('save.exported')
    expect(logTypes).toContain('save.imported')
  })

  it('rejects invalid imports without mutating the current game', () => {
    const beforeImport = JSON.parse(JSON.stringify(useGameStore.getState().game))

    expect(() => useGameStore.getState().importSave('not-json')).toThrow(
      'Save payload is not valid JSON.'
    )

    expect(useGameStore.getState().game).toEqual(beforeImport)
  })

  it('round-trips structured report notes without preserving undefined-only fields', () => {
    const game = createStartingState()
    game.reports = [
      {
        week: 2,
        rngStateBefore: 77,
        rngStateAfter: 78,
        newCases: [],
        progressedCases: [],
        resolvedCases: [],
        failedCases: [],
        partialCases: [],
        unresolvedTriggers: [],
        spawnedCases: [],
        maxStage: 0,
        avgFatigue: 0,
        teamStatus: [],
        notes: [
          {
            id: 'note-1',
            content: 'Structured note',
            timestamp: 1700000000000,
            source: undefined,
          } as never,
        ],
      } as never,
    ]

    const imported = parseRunExport(serializeRunExport(game))
    const note = imported.reports[0]?.notes[0]

    expect(note).toEqual({
      id: 'note-1',
      content: 'Structured note',
      timestamp: 1700000000000,
    })
    expect(note).not.toHaveProperty('source')
  })
})

describe('gameStore persistence', () => {
  it('writes simulation-critical fields to storage on action dispatch', () => {
    useGameStore.getState().assign('case-001', 't_nightwatch')
    useGameStore.getState().advanceWeek()

    const stored = getPersistedState()

    expect(stored).toMatchObject({
      version: GAME_STORE_VERSION,
      state: {
        game: expect.objectContaining({
          week: 2,
          rngSeed: expect.any(Number),
          rngState: expect.any(Number),
          gameOver: expect.any(Boolean),
          agents: expect.any(Object),
          teams: expect.any(Object),
          cases: expect.any(Object),
          config: expect.any(Object),
          reports: expect.any(Array),
          events: expect.any(Array),
          inventory: expect.any(Object),
          productionQueue: expect.any(Array),
          market: expect.any(Object),
        }),
      },
    })
  })

  it('persists inventory, production queue, and market updates after queue and weekly tick actions', () => {
    useGameStore.getState().queueFabrication('med-kits')

    const queuedState = getPersistedState()

    expect(queuedState).toMatchObject({
      version: GAME_STORE_VERSION,
      state: {
        game: {
          inventory: expect.objectContaining({
            medkits: 0,
          }),
          productionQueue: [
            expect.objectContaining({
              recipeId: 'med-kits',
              outputItemId: 'medkits',
              remainingWeeks: 1,
            }),
          ],
          market: expect.objectContaining({
            week: 1,
            featuredRecipeId: 'ward-seals',
            pressure: 'stable',
            costMultiplier: 1,
          }),
        },
      },
    })

    useGameStore.getState().advanceWeek()

    const advancedState = getPersistedState()

    expect(advancedState).toMatchObject({
      version: GAME_STORE_VERSION,
      state: {
        game: {
          week: 2,
          inventory: expect.objectContaining({
            medkits: 1,
          }),
          productionQueue: [],
          market: expect.objectContaining({
            week: 2,
            pressure: expect.any(String),
            costMultiplier: expect.any(Number),
          }),
        },
      },
    })
  })

  it('does not persist templates - they are static and always reloaded from source', () => {
    useGameStore.getState().advanceWeek()

    const stored = getPersistedState()

    expect(stored?.state.game).not.toHaveProperty('templates')
  })

  it('reset() writes week-1 starting state back to storage', () => {
    useGameStore.getState().advanceWeek()
    useGameStore.getState().reset()

    const stored = getPersistedState()

    expect(stored).toMatchObject({ state: { game: { week: 1 } } })
  })

  it('applyRotatingRosterContinuityReconciliation flips hidden-replacement packets and keeps mission routing canonical (SPE-283)', () => {
    let game = createStartingState()
    const caseId = Object.keys(game.cases)[0]!
    game.cases[caseId] = {
      ...game.cases[caseId]!,
      status: 'in_progress',
      assignedTeamIds: ['t_nightwatch'],
      hiddenState: 'hidden',
      detectionConfidence: 0.4,
      displacementTarget: 'site_alpha',
      route: 'r:alpha->bravo',
    }
    for (const agentId of ['a_ava', 'a_kellan', 'a_mina', 'a_rook']) {
      game.agents[agentId] = {
        ...game.agents[agentId]!,
        attritionState: {
          attritionStatus: 'lost',
          lossReasonCodes: ['rotating-roster-store-test'],
          replacementPriority: 1,
          retentionPressure: 0,
        },
      }
    }
    game = { ...game, missionRouting: recomputeMissionRouting(game) }

    useGameStore.setState({ game })
    useGameStore.getState().applyRotatingRosterContinuityReconciliation()

    const next = useGameStore.getState().game
    const reconciled = next.cases[caseId]!
    expect(reconciled.hiddenState).toBe('revealed')
    expect(reconciled.detectionConfidence).toBe(1)
    expect(reconciled.route).toBe('r:alpha->bravo')
    expect(reconciled.displacementTarget).toBe('site_alpha')
    expect(next.missionRouting).toEqual(recomputeMissionRouting(next))
  })

  it('applyChapterBreakAttritionContinuityReset clears attrition and re-derives routing, pressure, and readiness', () => {
    let game = createStartingState()
    game.agents['a_kellan'] = {
      ...game.agents['a_kellan']!,
      attritionState: {
        attritionStatus: 'lost',
        lossReasonCodes: ['chapter-break-store-test'],
        replacementPriority: 1,
        retentionPressure: 0,
      },
    }
    game = {
      ...game,
      missionRouting: recomputeMissionRouting(game),
      deploymentMomentum: {
        stacks: 2,
        lastChangeWeek: 1,
        lastSummary: 'chapter-break-store momentum',
      },
    }

    useGameStore.setState({ game })
    useGameStore.getState().applyChapterBreakAttritionContinuityReset()

    const next = useGameStore.getState().game

    expect(next.agents['a_kellan']!.attritionState).toBeUndefined()
    expect(next.deploymentMomentum?.stacks).toBe(0)
    expect(next.deploymentMomentum?.lastSummary).toContain(
      'Chapter break cleared deployment momentum'
    )
    expect(next.replacementPressureState).toEqual(buildReplacementPressureState(next))
    expect(next.missionRouting).toEqual(recomputeMissionRouting(next))
    expect(next.teams.t_nightwatch?.deploymentReadinessState).toBeDefined()
  })

  it('rehydrated state always carries current app templates, not stale persisted ones', async () => {
    const gameWithoutTemplates = createStartingState()
    delete (gameWithoutTemplates as Partial<typeof gameWithoutTemplates>).templates
    useGameStore.persist.getOptions().storage?.setItem(STORE_KEY, {
      state: { game: gameWithoutTemplates },
      version: 1,
    })

    await useGameStore.persist.rehydrate()

    expect(useGameStore.getState().game.templates).toEqual(caseTemplateMap)
  })

  it('sanitizes persisted seed and config fields during rehydration', async () => {
    const persistedGame = createStartingState()
    delete (persistedGame as Partial<typeof persistedGame>).templates

    useGameStore.persist.getOptions().storage?.setItem(STORE_KEY, {
      state: {
        game: {
          ...persistedGame,
          rngSeed: -99,
          rngState: 0,
          config: {
            ...persistedGame.config,
            maxActiveCases: 0,
            partialMargin: -10,
            stageScalar: 0,
            attritionPerWeek: -1,
            probabilityK: Number.POSITIVE_INFINITY,
            raidCoordinationPenaltyPerExtraTeam: -0.2,
            durationModel: 'bad-input',
          },
        },
      },
      version: 1,
    })

    await useGameStore.persist.rehydrate()

    expect(useGameStore.getState().game.rngSeed).toBe(99)
    expect(useGameStore.getState().game.rngState).toBe(1)
    expect(useGameStore.getState().game.config).toMatchObject({
      maxActiveCases: 1,
      partialMargin: 0,
      stageScalar: 0.05,
      challengeModeEnabled: false,
      attritionPerWeek: persistedGame.config.attritionPerWeek,
      probabilityK: 2.4,
      raidCoordinationPenaltyPerExtraTeam: 0,
      durationModel: 'capacity',
    })
  })

  it('treats string-valued persisted config fields as invalid and falls back to defaults', async () => {
    const persistedGame = createStartingState()
    delete (persistedGame as Partial<typeof persistedGame>).templates

    useGameStore.persist.getOptions().storage?.setItem(STORE_KEY, {
      state: {
        game: {
          ...persistedGame,
          config: {
            maxActiveCases: '11' as never,
            partialMargin: '8' as never,
            stageScalar: '1.5' as never,
            attritionPerWeek: '4' as never,
            probabilityK: '2.7' as never,
            raidCoordinationPenaltyPerExtraTeam: '0.2' as never,
            durationModel: 'capacity',
          },
        },
      },
      version: 1,
    })

    await useGameStore.persist.rehydrate()

    expect(useGameStore.getState().game.config).toEqual(createStartingState().config)
  })

  it('drops persisted attrition mode when challenge mode is absent or false', async () => {
    const persistedGame = createStartingState()
    delete (persistedGame as Partial<typeof persistedGame>).templates

    useGameStore.persist.getOptions().storage?.setItem(STORE_KEY, {
      state: {
        game: {
          ...persistedGame,
          config: {
            ...persistedGame.config,
            challengeModeEnabled: false,
            durationModel: 'attrition',
          },
        },
      },
      version: 1,
    })

    await useGameStore.persist.rehydrate()

    expect(useGameStore.getState().game.config).toMatchObject({
      challengeModeEnabled: false,
      durationModel: 'capacity',
    })
  })

  it('falls back to the current default config when a persisted save omits config', async () => {
    const persistedGame = createStartingState()
    delete (persistedGame as Partial<typeof persistedGame>).templates
    delete (persistedGame as Partial<typeof persistedGame>).config

    useGameStore.persist.getOptions().storage?.setItem(STORE_KEY, {
      state: {
        game: persistedGame,
      },
      version: 1,
    })

    await useGameStore.persist.rehydrate()

    expect(useGameStore.getState().game.config).toEqual(createStartingState().config)
  })

  it('treats malformed persisted config payloads as defaults', async () => {
    const persistedGame = createStartingState()
    delete (persistedGame as Partial<typeof persistedGame>).templates

    useGameStore.persist.getOptions().storage?.setItem(STORE_KEY, {
      state: {
        game: {
          ...persistedGame,
          config: null,
        },
      },
      version: 1,
    })

    await useGameStore.persist.rehydrate()

    expect(useGameStore.getState().game.config).toEqual(createStartingState().config)
  })

  it('ignores malformed persisted state that omits the game payload', async () => {
    useGameStore.getState().setSeed(77)
    const expected = hydrateGame(createStartingState(), createStartingState())

    useGameStore.persist.getOptions().storage?.setItem(STORE_KEY, {
      state: {},
      version: 1,
    })

    await useGameStore.persist.rehydrate()

    expect(useGameStore.getState().game).toEqual(expected)
  })

  it('ignores malformed persisted game payloads that are not objects', async () => {
    useGameStore.getState().setSeed(77)
    const expected = hydrateGame(createStartingState(), createStartingState())

    useGameStore.persist.getOptions().storage?.setItem(STORE_KEY, {
      state: {
        game: 'invalid-game-payload',
      },
      version: 1,
    })

    await useGameStore.persist.rehydrate()

    expect(useGameStore.getState().game).toEqual(expected)
  })

  it('discards pre-versioned saves and rehydrates to a fresh starting state', async () => {
    useGameStore.persist.getOptions().storage?.setItem(STORE_KEY, {
      state: { game: { week: 99 } },
      version: 0,
    })

    await useGameStore.persist.rehydrate()

    expect(useGameStore.getState().game.week).toBe(1)
    expect(useGameStore.getState().game.templates).toEqual(caseTemplateMap)
  })

  it('rehydrates a v1 persisted save into the current v2 store shape', async () => {
    const persistedGame = createStartingState()
    delete (persistedGame as Partial<typeof persistedGame>).templates
    persistedGame.week = 4
    persistedGame.rngSeed = 44
    persistedGame.rngState = 44
    persistedGame.config = {
      ...persistedGame.config,
      challengeModeEnabled: true,
      durationModel: 'attrition',
    }

    useGameStore.persist.getOptions().storage?.setItem(STORE_KEY, {
      state: { game: persistedGame },
      version: 1,
    })

    await useGameStore.persist.rehydrate()

    expect(useGameStore.getState().game.week).toBe(4)
    expect(useGameStore.getState().game.rngSeed).toBe(44)
    expect(useGameStore.getState().game.rngState).toBe(44)
    expect(useGameStore.getState().game.config).toMatchObject({
      challengeModeEnabled: true,
      durationModel: 'attrition',
    })
    expect(useGameStore.getState().game.templates).toEqual(caseTemplateMap)
  })
})

describe('affiliation file work queue action ledger store action (SPE-2529 slice 1)', () => {
  it('records deterministic operator actions for reachable queue recommendation kinds', () => {
    const game = createStartingState()
    game.week = 9
    const blockedWelfareRecord = {
      ...HOSTILE_TO_COOPERATIVE_FIXTURE,
      id: 'reclass:file-blocked',
      label: 'Blocked file custody',
      proposedDisposition: 'hostile',
      reclassificationState: 'denied',
    } as const
    game.entityWelfareReclassificationRecords = {
      [PENDING_TO_APPROVED_FIXTURE.id]: PENDING_TO_APPROVED_FIXTURE,
      [blockedWelfareRecord.id]: blockedWelfareRecord,
    }
    game.affiliationPersonStatusRecords = {
      'person-status:missing-review': {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        id: 'person-status:missing-review',
        subjectId: 'subject:missing-review',
        subjectLabel: 'Missing Review Subject',
        candidateRef: 'candidate:missing',
        entityWelfareReclassificationRef: 'reclass:missing',
      },
      'person-status:file-blocked': {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        id: 'person-status:file-blocked',
        subjectId: 'subject:file-blocked',
        subjectLabel: 'File Blocked Subject',
        candidateRef: undefined,
        entityWelfareReclassificationRef: 'reclass:file-blocked',
        permissionSurface: 'file',
      },
      [COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]: {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        entityWelfareReclassificationRef: PENDING_TO_APPROVED_FIXTURE.id,
      },
    }
    const originalPersonStatusRecords = game.affiliationPersonStatusRecords

    useGameStore.setState({ game })

    useGameStore.getState().recordAffiliationFileWorkQueueAction('person-status:missing-review')
    useGameStore.getState().recordAffiliationFileWorkQueueAction('person-status:file-blocked')
    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueAction(COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id)

    const next = useGameStore.getState().game
    const missingId = buildAffiliationFileWorkQueueActionRecordId({
      workQueueEntryId: 'person-status:missing-review',
      actionKind: 'resolve_missing_review',
    })
    const blockedId = buildAffiliationFileWorkQueueActionRecordId({
      workQueueEntryId: 'person-status:file-blocked',
      actionKind: 'hold_blocked_access',
    })
    const restrictedId = buildAffiliationFileWorkQueueActionRecordId({
      workQueueEntryId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id,
      actionKind: 'route_restricted_review',
    })

    expect(next.affiliationFileWorkQueueActionRecords?.[missingId]).toMatchObject({
      id: missingId,
      workQueueEntryId: 'person-status:missing-review',
      subjectId: 'subject:missing-review',
      subjectLabel: 'Missing Review Subject',
      actionKind: 'resolve_missing_review',
      actionLabel: 'Resolve missing review',
      sourceBucket: 'missing_review',
      recordedWeek: 9,
    })
    expect(next.affiliationFileWorkQueueActionRecords?.[blockedId]).toMatchObject({
      actionKind: 'hold_blocked_access',
      actionLabel: 'Hold access',
      sourceBucket: 'blocked',
      recordedWeek: 9,
    })
    expect(next.affiliationFileWorkQueueActionRecords?.[restrictedId]).toMatchObject({
      actionKind: 'route_restricted_review',
      actionLabel: 'Route restricted review',
      sourceBucket: 'restricted',
      recordedWeek: 9,
    })
    expect(next.affiliationPersonStatusRecords).toBe(originalPersonStatusRecords)
  })

  it('no-ops when the requested work queue entry is absent', () => {
    const before = useGameStore.getState().game

    useGameStore.getState().recordAffiliationFileWorkQueueAction('person-status:missing')

    expect(useGameStore.getState().game).toBe(before)
  })
})

describe('affiliation file work queue release action store action', () => {
  it('records restricted release review routing without mutating source evidence', () => {
    const game = createStartingState()
    game.week = 14
    game.entityWelfareReclassificationRecords = {
      [PENDING_TO_APPROVED_FIXTURE.id]: PENDING_TO_APPROVED_FIXTURE,
    }
    game.affiliationPersonStatusRecords = {
      [COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]: {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        entityWelfareReclassificationRef: PENDING_TO_APPROVED_FIXTURE.id,
      },
    }
    const originalPersonStatusRecords = game.affiliationPersonStatusRecords
    const originalWelfareRecords = game.entityWelfareReclassificationRecords
    const originalEvidenceResolutionRecords = game.affiliationFileWorkQueueEvidenceResolutionRecords
    const originalRepairActionRecords = game.affiliationFileWorkQueueRepairActionRecords
    useGameStore.setState({ game })

    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueReleaseAction(COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id)

    const next = useGameStore.getState().game
    const releaseActionId = buildAffiliationFileWorkQueueReleaseActionRecordId({
      workQueueEntryId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id,
      actionKind: 'restricted_release_review_routed',
    })

    expect(next.affiliationFileWorkQueueReleaseActionRecords?.[releaseActionId]).toEqual({
      id: releaseActionId,
      workQueueEntryId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id,
      subjectId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.subjectId,
      subjectLabel: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.subjectLabel,
      actionKind: 'restricted_release_review_routed',
      actionLabel: 'Restricted release review routed',
      sourceBucket: 'restricted',
      sourceReasonCodes: [
        'approved_cooperative_file_restricted',
        'file_permission_restricted',
        'missing_onboarding_clearance',
        'site_clearance_restricted',
      ],
      recordedWeek: 14,
    })
    expect(next.affiliationPersonStatusRecords).toBe(originalPersonStatusRecords)
    expect(next.entityWelfareReclassificationRecords).toBe(originalWelfareRecords)
    expect(next.affiliationFileWorkQueueEvidenceResolutionRecords).toBe(
      originalEvidenceResolutionRecords
    )
    expect(next.affiliationFileWorkQueueRepairActionRecords).toBe(originalRepairActionRecords)
  })

  it('no-ops for blocked, missing-review, absent, and already-recorded release rows', () => {
    const game = createStartingState()
    game.week = 14
    const blockedWelfareRecord = {
      ...HOSTILE_TO_COOPERATIVE_FIXTURE,
      id: 'reclass:file-blocked',
      label: 'Blocked file custody',
      proposedDisposition: 'hostile',
      reclassificationState: 'denied',
    } as const
    game.entityWelfareReclassificationRecords = {
      [PENDING_TO_APPROVED_FIXTURE.id]: PENDING_TO_APPROVED_FIXTURE,
      [blockedWelfareRecord.id]: blockedWelfareRecord,
    }
    game.affiliationPersonStatusRecords = {
      'person-status:missing-review': {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        id: 'person-status:missing-review',
        subjectId: 'subject:missing-review',
        subjectLabel: 'Missing Review Subject',
        candidateRef: 'candidate:missing',
        entityWelfareReclassificationRef: 'reclass:missing',
      },
      'person-status:file-blocked': {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        id: 'person-status:file-blocked',
        subjectId: 'subject:file-blocked',
        subjectLabel: 'File Blocked Subject',
        candidateRef: undefined,
        entityWelfareReclassificationRef: 'reclass:file-blocked',
        permissionSurface: 'file',
      },
      [COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]: {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        entityWelfareReclassificationRef: PENDING_TO_APPROVED_FIXTURE.id,
      },
    }
    useGameStore.setState({ game })

    const beforeBlocked = useGameStore.getState().game
    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueReleaseAction('person-status:file-blocked')
    expect(useGameStore.getState().game).toBe(beforeBlocked)

    const beforeMissingReview = useGameStore.getState().game
    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueReleaseAction('person-status:missing-review')
    expect(useGameStore.getState().game).toBe(beforeMissingReview)

    const beforeAbsent = useGameStore.getState().game
    useGameStore.getState().recordAffiliationFileWorkQueueReleaseAction('person-status:absent')
    expect(useGameStore.getState().game).toBe(beforeAbsent)

    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueReleaseAction(COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id)
    const afterFirstRecord = useGameStore.getState().game
    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueReleaseAction(COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id)
    expect(useGameStore.getState().game).toBe(afterFirstRecord)
  })
})

describe('affiliation file work queue release outcome store action', () => {
  it('records restricted release review outcomes without mutating source evidence or release actions', () => {
    const game = createStartingState()
    game.week = 15
    game.entityWelfareReclassificationRecords = {
      [PENDING_TO_APPROVED_FIXTURE.id]: PENDING_TO_APPROVED_FIXTURE,
    }
    game.affiliationPersonStatusRecords = {
      [COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]: {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        entityWelfareReclassificationRef: PENDING_TO_APPROVED_FIXTURE.id,
      },
    }
    useGameStore.setState({ game })
    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueReleaseAction(COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id)

    const afterReleaseAction = useGameStore.getState().game
    const originalPersonStatusRecords = afterReleaseAction.affiliationPersonStatusRecords
    const originalWelfareRecords = afterReleaseAction.entityWelfareReclassificationRecords
    const originalEvidenceResolutionRecords =
      afterReleaseAction.affiliationFileWorkQueueEvidenceResolutionRecords
    const originalRepairActionRecords =
      afterReleaseAction.affiliationFileWorkQueueRepairActionRecords
    const originalReleaseActionRecords =
      afterReleaseAction.affiliationFileWorkQueueReleaseActionRecords

    useGameStore.setState({ game: { ...afterReleaseAction, week: 16 } })
    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueReleaseOutcome(COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id)

    const next = useGameStore.getState().game
    const outcomeId = buildAffiliationFileWorkQueueReleaseOutcomeRecordId({
      workQueueEntryId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id,
      sourceActionKind: 'restricted_release_review_routed',
    })

    expect(next.affiliationFileWorkQueueReleaseOutcomeRecords?.[outcomeId]).toEqual({
      id: outcomeId,
      workQueueEntryId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id,
      subjectId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.subjectId,
      subjectLabel: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.subjectLabel,
      sourceActionKind: 'restricted_release_review_routed',
      sourceBucket: 'restricted',
      sourceReasonCodes: [
        'approved_cooperative_file_restricted',
        'file_permission_restricted',
        'missing_onboarding_clearance',
        'site_clearance_restricted',
      ],
      outcomeKind: 'restricted_review_pending',
      outcomeLabel: 'Restricted review pending',
      recordedWeek: 16,
    })
    expect(next.affiliationPersonStatusRecords).toBe(originalPersonStatusRecords)
    expect(next.entityWelfareReclassificationRecords).toBe(originalWelfareRecords)
    expect(next.affiliationFileWorkQueueEvidenceResolutionRecords).toBe(
      originalEvidenceResolutionRecords
    )
    expect(next.affiliationFileWorkQueueRepairActionRecords).toBe(originalRepairActionRecords)
    expect(next.affiliationFileWorkQueueReleaseActionRecords).toBe(originalReleaseActionRecords)
  })

  it('no-ops for missing release action, blocked, missing-review, absent, and already-recorded rows', () => {
    const game = createStartingState()
    game.week = 15
    const blockedWelfareRecord = {
      ...HOSTILE_TO_COOPERATIVE_FIXTURE,
      id: 'reclass:file-blocked',
      label: 'Blocked file custody',
      proposedDisposition: 'hostile',
      reclassificationState: 'denied',
    } as const
    game.entityWelfareReclassificationRecords = {
      [PENDING_TO_APPROVED_FIXTURE.id]: PENDING_TO_APPROVED_FIXTURE,
      [blockedWelfareRecord.id]: blockedWelfareRecord,
    }
    game.affiliationPersonStatusRecords = {
      'person-status:missing-review': {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        id: 'person-status:missing-review',
        subjectId: 'subject:missing-review',
        subjectLabel: 'Missing Review Subject',
        candidateRef: 'candidate:missing',
        entityWelfareReclassificationRef: 'reclass:missing',
      },
      'person-status:file-blocked': {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        id: 'person-status:file-blocked',
        subjectId: 'subject:file-blocked',
        subjectLabel: 'File Blocked Subject',
        candidateRef: undefined,
        entityWelfareReclassificationRef: 'reclass:file-blocked',
        permissionSurface: 'file',
      },
      [COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]: {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        entityWelfareReclassificationRef: PENDING_TO_APPROVED_FIXTURE.id,
      },
    }
    useGameStore.setState({ game })

    const beforeMissingAction = useGameStore.getState().game
    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueReleaseOutcome(COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id)
    expect(useGameStore.getState().game).toBe(beforeMissingAction)

    const beforeBlocked = useGameStore.getState().game
    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueReleaseOutcome('person-status:file-blocked')
    expect(useGameStore.getState().game).toBe(beforeBlocked)

    const beforeMissingReview = useGameStore.getState().game
    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueReleaseOutcome('person-status:missing-review')
    expect(useGameStore.getState().game).toBe(beforeMissingReview)

    const beforeAbsent = useGameStore.getState().game
    useGameStore.getState().recordAffiliationFileWorkQueueReleaseOutcome('person-status:absent')
    expect(useGameStore.getState().game).toBe(beforeAbsent)

    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueReleaseAction(COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id)
    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueReleaseOutcome(COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id)
    const afterFirstOutcome = useGameStore.getState().game
    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueReleaseOutcome(COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id)
    expect(useGameStore.getState().game).toBe(afterFirstOutcome)
  })
})

describe('affiliation file work queue release fulfillment store action', () => {
  it('no-ops for missing outcome, restricted review outcomes, absent rows, and already ineligible rows', () => {
    const game = createStartingState()
    game.week = 15
    game.entityWelfareReclassificationRecords = {
      [PENDING_TO_APPROVED_FIXTURE.id]: PENDING_TO_APPROVED_FIXTURE,
    }
    game.affiliationPersonStatusRecords = {
      [COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]: {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        entityWelfareReclassificationRef: PENDING_TO_APPROVED_FIXTURE.id,
      },
    }
    useGameStore.setState({ game })

    const beforeMissingOutcome = useGameStore.getState().game
    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueReleaseFulfillment(
        COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id
      )
    expect(useGameStore.getState().game).toBe(beforeMissingOutcome)

    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueReleaseAction(COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id)
    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueReleaseOutcome(COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id)

    const beforeRestrictedReview = useGameStore.getState().game
    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueReleaseFulfillment(
        COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id
      )
    expect(useGameStore.getState().game).toBe(beforeRestrictedReview)

    const beforeAbsent = useGameStore.getState().game
    useGameStore.getState().recordAffiliationFileWorkQueueReleaseFulfillment('person-status:absent')
    expect(useGameStore.getState().game).toBe(beforeAbsent)
    expect(useGameStore.getState().game.affiliationFileWorkQueueReleaseFulfillmentRecords).toBe(
      undefined
    )
    expect(
      buildAffiliationFileWorkQueueReleaseFulfillmentRecordId({
        workQueueEntryId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id,
        sourceOutcomeKind: 'file_released',
      })
    ).toBe(
      `affiliation-file-release-fulfillment:${COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id}:file_released`
    )
  })
})

describe('affiliation file work queue release package store action', () => {
  it('records deterministic package handoff records only after allowed release fulfillment', () => {
    const game = createStartingState()
    game.week = 16
    game.candidates = [makeCooperativeContractorCandidate()]
    game.recruitmentPool = [makeCooperativeContractorCandidate()]
    game.entityWelfareReclassificationRecords = {
      [PENDING_TO_APPROVED_FIXTURE.id]: PENDING_TO_APPROVED_FIXTURE,
    }
    game.affiliationPersonStatusRecords = {
      [COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]: {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        entityWelfareReclassificationRef: PENDING_TO_APPROVED_FIXTURE.id,
        permissionSurface: 'file',
      },
    }
    useGameStore.setState({ game })

    const beforeFulfillment = useGameStore.getState().game
    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueReleasePackage(COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id)
    expect(useGameStore.getState().game).toBe(beforeFulfillment)

    const fulfillment = buildAffiliationFileWorkQueueReleaseFulfillmentRecord({
      workQueueEntryId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id,
      subjectId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.subjectId,
      subjectLabel: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.subjectLabel,
      sourceOutcomeKind: 'file_released',
      sourceBucket: 'allowed',
      sourceReasonCodes: ['file_permission_allowed', 'site_clearance_allowed'],
      fulfillmentKind: 'file_release_fulfilled',
      fulfillmentLabel: 'File release fulfilled',
      recordedWeek: 15,
    })
    useGameStore.setState({
      game: {
        ...useGameStore.getState().game,
        affiliationFileWorkQueueReleaseFulfillmentRecords: {
          [fulfillment.id]: fulfillment,
        },
      },
    })
    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueReleasePackage(COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id)

    const packageId = buildAffiliationFileWorkQueueReleasePackageRecordId({
      workQueueEntryId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id,
      sourceFulfillmentKind: 'file_release_fulfilled',
    })
    const next = useGameStore.getState().game

    expect(next.affiliationFileWorkQueueReleasePackageRecords).toEqual({
      [packageId]: expect.objectContaining({
        id: packageId,
        workQueueEntryId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id,
        sourceOutcomeKind: 'file_released',
        sourceFulfillmentKind: 'file_release_fulfilled',
        sourceReasonCodes: ['file_permission_allowed', 'site_clearance_allowed'],
        packageKind: 'safe_file_handoff_package',
        packageLabel: 'Safe file handoff package',
        packageRef: `release-package:${COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id}:file_release_fulfilled`,
        recordedWeek: 16,
      }),
    })
    expect(next.affiliationFileWorkQueueReleaseFulfillmentRecords).toBeDefined()

    const afterFirstPackage = useGameStore.getState().game
    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueReleasePackage(COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id)
    expect(useGameStore.getState().game).toBe(afterFirstPackage)
  })

  it('no-ops for restricted review outcomes and absent rows', () => {
    const game = createStartingState()
    game.week = 16
    game.candidates = [makeCooperativeContractorCandidate()]
    game.recruitmentPool = [makeCooperativeContractorCandidate()]
    game.entityWelfareReclassificationRecords = {
      [PENDING_TO_APPROVED_FIXTURE.id]: PENDING_TO_APPROVED_FIXTURE,
    }
    game.affiliationPersonStatusRecords = {
      [COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]: {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        entityWelfareReclassificationRef: PENDING_TO_APPROVED_FIXTURE.id,
        permissionSurface: 'file',
      },
    }
    useGameStore.setState({ game })

    const beforeMissingFulfillment = useGameStore.getState().game
    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueReleasePackage(COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id)
    expect(useGameStore.getState().game).toBe(beforeMissingFulfillment)

    const beforeAbsent = useGameStore.getState().game
    useGameStore.getState().recordAffiliationFileWorkQueueReleasePackage('person-status:absent')
    expect(useGameStore.getState().game).toBe(beforeAbsent)
    expect(useGameStore.getState().game.affiliationFileWorkQueueReleasePackageRecords).toBe(
      undefined
    )
  })
})

describe('affiliation file work queue file-release delivery store action', () => {
  it('records metadata-only file-release delivery receipts only after package handoff', () => {
    const game = createStartingState()
    game.week = 17
    game.candidates = [makeCooperativeContractorCandidate()]
    game.recruitmentPool = [makeCooperativeContractorCandidate()]
    game.entityWelfareReclassificationRecords = {
      [PENDING_TO_APPROVED_FIXTURE.id]: PENDING_TO_APPROVED_FIXTURE,
    }
    game.affiliationPersonStatusRecords = {
      [COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]: {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        entityWelfareReclassificationRef: PENDING_TO_APPROVED_FIXTURE.id,
        permissionSurface: 'file',
      },
    }
    const fulfillment = buildAffiliationFileWorkQueueReleaseFulfillmentRecord({
      workQueueEntryId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id,
      subjectId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.subjectId,
      subjectLabel: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.subjectLabel,
      sourceOutcomeKind: 'file_released',
      sourceBucket: 'allowed',
      sourceReasonCodes: ['file_permission_allowed', 'site_clearance_allowed'],
      fulfillmentKind: 'file_release_fulfilled',
      fulfillmentLabel: 'File release fulfilled',
      recordedWeek: 15,
    })
    const packageId = buildAffiliationFileWorkQueueReleasePackageRecordId({
      workQueueEntryId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id,
      sourceFulfillmentKind: 'file_release_fulfilled',
    })
    useGameStore.setState({
      game: {
        ...game,
        affiliationFileWorkQueueReleaseFulfillmentRecords: {
          [fulfillment.id]: fulfillment,
        },
        affiliationFileWorkQueueReleasePackageRecords: {
          [packageId]: {
            id: packageId,
            workQueueEntryId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id,
            subjectId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.subjectId,
            subjectLabel: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.subjectLabel,
            sourceOutcomeKind: 'file_released',
            sourceFulfillmentKind: 'file_release_fulfilled',
            sourceReasonCodes: ['file_permission_allowed', 'site_clearance_allowed'],
            packageKind: 'safe_file_handoff_package',
            packageLabel: 'Safe file handoff package',
            packageRef:
              'release-package:person-status:cooperative-contractor-cleared:file_release_fulfilled',
            recordedWeek: 16,
          },
        },
      },
    })

    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueFileReleaseDelivery(
        COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id
      )

    const deliveryId = buildAffiliationFileWorkQueueFileReleaseDeliveryRecordId({
      workQueueEntryId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id,
      sourcePackageKind: 'safe_file_handoff_package',
    })
    const next = useGameStore.getState().game

    expect(next.affiliationFileWorkQueueFileReleaseDeliveryRecords).toEqual({
      [deliveryId]: expect.objectContaining({
        id: deliveryId,
        workQueueEntryId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id,
        sourcePackageKind: 'safe_file_handoff_package',
        sourcePackageRef:
          'release-package:person-status:cooperative-contractor-cleared:file_release_fulfilled',
        deliveryKind: 'metadata_only_file_release_delivered',
        deliveryLabel: 'Metadata-only file release delivered',
        deliveryRef:
          'file-release-delivery:person-status:cooperative-contractor-cleared:safe_file_handoff_package',
        recordedWeek: 17,
      }),
    })
    expect(next.affiliationFileWorkQueueReleasePackageRecords).toBeDefined()
    expect(next.affiliationFileWorkQueueReleaseFulfillmentRecords).toBeDefined()
  })

  it('no-ops when package handoff is missing, the row is absent, or a delivery is already recorded', () => {
    const game = createStartingState()
    game.week = 17
    game.candidates = [makeCooperativeContractorCandidate()]
    game.recruitmentPool = [makeCooperativeContractorCandidate()]
    game.entityWelfareReclassificationRecords = {
      [PENDING_TO_APPROVED_FIXTURE.id]: PENDING_TO_APPROVED_FIXTURE,
    }
    game.affiliationPersonStatusRecords = {
      [COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]: {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        entityWelfareReclassificationRef: PENDING_TO_APPROVED_FIXTURE.id,
        permissionSurface: 'file',
      },
    }
    useGameStore.setState({ game })

    const beforeMissingPackage = useGameStore.getState().game
    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueFileReleaseDelivery(
        COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id
      )
    expect(useGameStore.getState().game).toBe(beforeMissingPackage)

    const beforeAbsent = useGameStore.getState().game
    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueFileReleaseDelivery('person-status:absent')
    expect(useGameStore.getState().game).toBe(beforeAbsent)

    const packageId = buildAffiliationFileWorkQueueReleasePackageRecordId({
      workQueueEntryId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id,
      sourceFulfillmentKind: 'file_release_fulfilled',
    })
    const deliveryId = buildAffiliationFileWorkQueueFileReleaseDeliveryRecordId({
      workQueueEntryId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id,
      sourcePackageKind: 'safe_file_handoff_package',
    })

    useGameStore.setState({
      game: {
        ...useGameStore.getState().game,
        affiliationFileWorkQueueReleaseFulfillmentRecords: {
          'affiliation-file-release-fulfillment:person-status:cooperative-contractor-cleared:file_released':
            {
              id: 'affiliation-file-release-fulfillment:person-status:cooperative-contractor-cleared:file_released',
              workQueueEntryId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id,
              subjectId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.subjectId,
              subjectLabel: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.subjectLabel,
              sourceOutcomeKind: 'file_released',
              sourceBucket: 'allowed',
              sourceReasonCodes: ['file_permission_allowed', 'site_clearance_allowed'],
              fulfillmentKind: 'file_release_fulfilled',
              fulfillmentLabel: 'File release fulfilled',
              recordedWeek: 16,
            },
        },
        affiliationFileWorkQueueReleasePackageRecords: {
          [packageId]: {
            id: packageId,
            workQueueEntryId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id,
            subjectId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.subjectId,
            subjectLabel: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.subjectLabel,
            sourceOutcomeKind: 'file_released',
            sourceFulfillmentKind: 'file_release_fulfilled',
            sourceReasonCodes: ['file_permission_allowed', 'site_clearance_allowed'],
            packageKind: 'safe_file_handoff_package',
            packageLabel: 'Safe file handoff package',
            packageRef:
              'release-package:person-status:cooperative-contractor-cleared:file_release_fulfilled',
            recordedWeek: 16,
          },
        },
      },
    })
    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueFileReleaseDelivery(
        COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id
      )
    const afterFirstDelivery = useGameStore.getState().game

    expect(afterFirstDelivery.affiliationFileWorkQueueFileReleaseDeliveryRecords).toEqual(
      expect.objectContaining({
        [deliveryId]: expect.objectContaining({
          deliveryKind: 'metadata_only_file_release_delivered',
        }),
      })
    )

    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueFileReleaseDelivery(
        COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id
      )
    expect(useGameStore.getState().game).toBe(afterFirstDelivery)
  })
})

describe('affiliation file work queue evidence repair workflow store action', () => {
  it('records deterministic welfare evidence repair workflows for missing_review queue rows', () => {
    const game = createStartingState()
    game.week = 13
    game.affiliationPersonStatusRecords = {
      [COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]: {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        permissionSurface: 'file',
      },
    }
    useGameStore.setState({ game })

    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueEvidenceRepairWorkflow(
        COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id
      )

    const workflowId = buildAffiliationFileWorkQueueEvidenceRepairWorkflowId({
      workQueueEntryId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id,
      evidenceType: 'missing_entity_welfare_reclassification_ref',
    })
    const next = useGameStore.getState().game

    expect(next.affiliationFileWorkQueueEvidenceRepairWorkflows).toEqual({
      [workflowId]: expect.objectContaining({
        id: workflowId,
        workQueueEntryId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id,
        evidenceType: 'missing_entity_welfare_reclassification_ref',
        subjectId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.subjectId,
        subjectLabel: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.subjectLabel,
        repairLabel: 'Restore minimal welfare evidence',
        recordedWeek: 13,
      }),
    })
  })

  it('no-ops when entry is missing, not in missing_review, or lacks welfare evidence gap', () => {
    const game = createStartingState()
    game.week = 14
    game.affiliationPersonStatusRecords = {
      [COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]: {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        permissionSurface: 'file',
      },
    }
    useGameStore.setState({ game })

    const beforeAbsent = useGameStore.getState().game
    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueEvidenceRepairWorkflow('person-status:absent')
    expect(useGameStore.getState().game).toBe(beforeAbsent)

    // Change to not missing_review state
    useGameStore.setState({
      game: {
        ...useGameStore.getState().game,
        affiliationPersonStatusRecords: {
          [COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]: {
            ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
            permissionSurface: 'allowed', // Not missing_review
          },
        },
      },
    })

    const beforeNotMissingReview = useGameStore.getState().game
    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueEvidenceRepairWorkflow(
        COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id
      )
    expect(useGameStore.getState().game).toBe(beforeNotMissingReview)
  })

  it('no-ops when welfare evidence repair workflow is already recorded', () => {
    const game = createStartingState()
    game.week = 15
    game.affiliationPersonStatusRecords = {
      [COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]: {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        permissionSurface: 'file',
      },
    }

    const workflowId = buildAffiliationFileWorkQueueEvidenceRepairWorkflowId({
      workQueueEntryId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id,
      evidenceType: 'missing_entity_welfare_reclassification_ref',
    })
    const existingWorkflow = buildAffiliationFileWorkQueueEvidenceRepairWorkflow({
      workQueueEntryId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id,
      evidenceType: 'missing_entity_welfare_reclassification_ref',
      subjectId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.subjectId,
      subjectLabel: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.subjectLabel,
      repairLabel: 'Restore minimal welfare evidence',
      recordedWeek: 14,
    })

    game.affiliationFileWorkQueueEvidenceRepairWorkflows = {
      [workflowId]: existingWorkflow,
    }
    useGameStore.setState({ game })

    const before = useGameStore.getState().game
    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueEvidenceRepairWorkflow(
        COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id
      )

    expect(useGameStore.getState().game).toBe(before)
    expect(useGameStore.getState().game.affiliationFileWorkQueueEvidenceRepairWorkflows).toEqual({
      [workflowId]: existingWorkflow,
    })
  })

  it('maintains isolation: welfare repair workflows do not affect other ledgers', () => {
    const game = createStartingState()
    game.week = 16
    game.affiliationPersonStatusRecords = {
      [COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]: {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        permissionSurface: 'file',
      },
    }
    useGameStore.setState({ game })

    const beforeReleaseDeliveries =
      useGameStore.getState().game.affiliationFileWorkQueueFileReleaseDeliveryRecords
    const beforeRepairActions =
      useGameStore.getState().game.affiliationFileWorkQueueRepairActionRecords

    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueEvidenceRepairWorkflow(
        COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id
      )

    const after = useGameStore.getState().game
    expect(after.affiliationFileWorkQueueFileReleaseDeliveryRecords).toEqual(
      beforeReleaseDeliveries
    )
    expect(after.affiliationFileWorkQueueRepairActionRecords).toEqual(beforeRepairActions)
  })
})

describe('affiliation file work queue evidence resolution store action', () => {
  it('records deterministic evidence-resolution records for reachable missing-review queue rows', () => {
    const game = createStartingState()
    game.week = 11
    game.affiliationPersonStatusRecords = {
      'person-status:missing-review': {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        id: 'person-status:missing-review',
        subjectId: 'subject:missing-review',
        subjectLabel: 'Missing Review Subject',
        candidateRef: 'candidate:missing',
        entityWelfareReclassificationRef: 'reclass:missing',
      },
    }
    const originalPersonStatusRecords = game.affiliationPersonStatusRecords
    const originalWelfareRecords = game.entityWelfareReclassificationRecords

    useGameStore.setState({ game })

    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueEvidenceResolution('person-status:missing-review')

    const next = useGameStore.getState().game
    const resolutionId = buildAffiliationFileWorkQueueEvidenceResolutionRecordId({
      workQueueEntryId: 'person-status:missing-review',
      missingReasonCodes: [
        'missing_candidate_ref',
        'missing_entity_welfare_reclassification_ref',
        'missing_onboarding_clearance',
      ],
    })

    expect(next.affiliationFileWorkQueueEvidenceResolutionRecords?.[resolutionId]).toMatchObject({
      id: resolutionId,
      workQueueEntryId: 'person-status:missing-review',
      subjectId: 'subject:missing-review',
      subjectLabel: 'Missing Review Subject',
      sourceBucket: 'missing_review',
      missingReasonCodes: [
        'missing_candidate_ref',
        'missing_entity_welfare_reclassification_ref',
        'missing_onboarding_clearance',
      ],
      recordedWeek: 11,
    })
    expect(next.affiliationPersonStatusRecords).toBe(originalPersonStatusRecords)
    expect(next.entityWelfareReclassificationRecords).toBe(originalWelfareRecords)
  })

  it('no-ops for absent and non-missing-review queue entries', () => {
    const game = createStartingState()
    game.entityWelfareReclassificationRecords = {
      [PENDING_TO_APPROVED_FIXTURE.id]: PENDING_TO_APPROVED_FIXTURE,
    }
    game.affiliationPersonStatusRecords = {
      [COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]: {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        entityWelfareReclassificationRef: PENDING_TO_APPROVED_FIXTURE.id,
      },
    }
    useGameStore.setState({ game })

    const beforeRestricted = useGameStore.getState().game
    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueEvidenceResolution(
        COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id
      )

    expect(useGameStore.getState().game).toBe(beforeRestricted)

    const beforeMissing = useGameStore.getState().game
    useGameStore.getState().recordAffiliationFileWorkQueueEvidenceResolution('person-status:absent')

    expect(useGameStore.getState().game).toBe(beforeMissing)
  })
})

describe('affiliation file work queue repair action store action', () => {
  it('records deterministic repair-action records and restores candidate evidence for resolved missing-review candidates', () => {
    const game = createStartingState()
    game.week = 12
    game.affiliationPersonStatusRecords = {
      'person-status:missing-review': {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        id: 'person-status:missing-review',
        subjectId: 'subject:missing-review',
        subjectLabel: 'Missing Review Subject',
        candidateRef: 'candidate:missing',
        entityWelfareReclassificationRef: 'reclass:missing',
      },
    }
    const resolutionRecord = buildAffiliationFileWorkQueueEvidenceResolutionRecord({
      workQueueEntryId: 'person-status:missing-review',
      subjectId: 'subject:missing-review',
      subjectLabel: 'Missing Review Subject',
      sourceBucket: 'missing_review',
      missingReasonCodes: [
        'missing_candidate_ref',
        'missing_entity_welfare_reclassification_ref',
        'missing_onboarding_clearance',
      ],
      recordedWeek: 11,
    })
    game.affiliationFileWorkQueueEvidenceResolutionRecords = {
      [resolutionRecord.id]: resolutionRecord,
    }
    const originalPersonStatusRecords = game.affiliationPersonStatusRecords
    const originalEvidenceResolutionRecords = game.affiliationFileWorkQueueEvidenceResolutionRecords
    useGameStore.setState({ game })

    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueRepairAction(
        'person-status:missing-review',
        'missing_candidate_ref'
      )

    const next = useGameStore.getState().game
    const repairActionId = buildAffiliationFileWorkQueueRepairActionRecordId({
      workQueueEntryId: 'person-status:missing-review',
      reasonCode: 'missing_candidate_ref',
    })

    expect(next.affiliationFileWorkQueueRepairActionRecords?.[repairActionId]).toEqual({
      id: repairActionId,
      workQueueEntryId: 'person-status:missing-review',
      subjectId: 'subject:missing-review',
      subjectLabel: 'Missing Review Subject',
      reasonCode: 'missing_candidate_ref',
      repairLabel: 'Candidate link repair: attach or restore recruitment candidate evidence.',
      recordedWeek: 12,
    })
    expect(next.candidates).toEqual([
      expect.objectContaining({
        id: 'candidate:missing',
        name: 'Missing Review Subject',
        category: 'agent',
        hireStatus: 'available',
        funnelStage: 'hired',
        createdWeek: 12,
        lastUpdatedWeek: 12,
      }),
    ])
    expect(next.recruitmentPool).toEqual([
      expect.objectContaining({
        id: 'candidate:missing',
        name: 'Missing Review Subject',
      }),
    ])
    expect(next.affiliationPersonStatusRecords).toBe(originalPersonStatusRecords)
    expect(next.affiliationFileWorkQueueEvidenceResolutionRecords).toBe(
      originalEvidenceResolutionRecords
    )
    expect(next.affiliationFileWorkQueueRepairActionRecords?.[repairActionId]?.reasonCode).toBe(
      'missing_candidate_ref'
    )
  })

  it('keeps repaired candidate rows in missing-review when other missing evidence still blocks derivation', () => {
    const game = createStartingState()
    game.week = 12
    game.affiliationPersonStatusRecords = {
      'person-status:missing-review': {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        id: 'person-status:missing-review',
        subjectId: 'subject:missing-review',
        subjectLabel: 'Missing Review Subject',
        candidateRef: 'candidate:missing',
        entityWelfareReclassificationRef: 'reclass:missing',
      },
    }
    const resolutionRecord = buildAffiliationFileWorkQueueEvidenceResolutionRecord({
      workQueueEntryId: 'person-status:missing-review',
      subjectId: 'subject:missing-review',
      subjectLabel: 'Missing Review Subject',
      sourceBucket: 'missing_review',
      missingReasonCodes: [
        'missing_candidate_ref',
        'missing_entity_welfare_reclassification_ref',
        'missing_onboarding_clearance',
      ],
      recordedWeek: 11,
    })
    game.affiliationFileWorkQueueEvidenceResolutionRecords = {
      [resolutionRecord.id]: resolutionRecord,
    }
    useGameStore.setState({ game })

    const before = useGameStore.getState().game
    expect(before.candidates).toEqual([])

    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueRepairAction(
        'person-status:missing-review',
        'missing_candidate_ref'
      )

    const next = useGameStore.getState().game
    const view = getAffiliationPersonStatusMirrorView(next)

    expect(view.summary.fileAccessMissingReviewCount).toBe(1)
    expect(view.fileAccessWorkQueue[0]).toMatchObject({
      id: 'person-status:missing-review',
      bucket: 'missing_review',
      fileAccessLabel: 'File access: -',
      facilityFileAccessLabel: 'Facility file access: -',
    })
    expect(view.records[0]?.reasonCodeLabels).not.toContain('missing_candidate_ref')
    expect(view.records[0]?.reasonCodeLabels).toContain(
      'missing_entity_welfare_reclassification_ref'
    )
  })

  it('records repair actions and restores welfare evidence for resolved welfare-link rows', () => {
    const game = createStartingState()
    game.week = 12
    game.candidates = [
      {
        id: 'candidate:present',
        name: 'Welfare Repair Subject',
        age: 30,
        category: 'agent',
        hireStatus: 'available',
        weeklyCost: 0,
        weeklyWage: 0,
        revealLevel: 2,
      },
    ]
    game.recruitmentPool = [...game.candidates]
    game.affiliationPersonStatusRecords = {
      'person-status:welfare-missing': {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        id: 'person-status:welfare-missing',
        subjectId: 'subject:welfare-missing',
        subjectLabel: 'Welfare Repair Subject',
        candidateRef: 'candidate:present',
        entityWelfareReclassificationRef: 'reclass:welfare-missing',
      },
    }
    const resolutionRecord = buildAffiliationFileWorkQueueEvidenceResolutionRecord({
      workQueueEntryId: 'person-status:welfare-missing',
      subjectId: 'subject:welfare-missing',
      subjectLabel: 'Welfare Repair Subject',
      sourceBucket: 'missing_review',
      missingReasonCodes: ['missing_entity_welfare_reclassification_ref'],
      recordedWeek: 11,
    })
    game.affiliationFileWorkQueueEvidenceResolutionRecords = {
      [resolutionRecord.id]: resolutionRecord,
    }
    const originalPersonStatusRecords = game.affiliationPersonStatusRecords
    const originalCandidates = game.candidates
    const originalRecruitmentPool = game.recruitmentPool
    useGameStore.setState({ game })

    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueRepairAction(
        'person-status:welfare-missing',
        'missing_entity_welfare_reclassification_ref'
      )

    const next = useGameStore.getState().game
    const repairActionId = buildAffiliationFileWorkQueueRepairActionRecordId({
      workQueueEntryId: 'person-status:welfare-missing',
      reasonCode: 'missing_entity_welfare_reclassification_ref',
    })
    const restored = next.entityWelfareReclassificationRecords?.['reclass:welfare-missing']
    const view = getAffiliationPersonStatusMirrorView(next)

    expect(next.affiliationFileWorkQueueRepairActionRecords?.[repairActionId]).toEqual({
      id: repairActionId,
      workQueueEntryId: 'person-status:welfare-missing',
      subjectId: 'subject:welfare-missing',
      subjectLabel: 'Welfare Repair Subject',
      reasonCode: 'missing_entity_welfare_reclassification_ref',
      repairLabel:
        'Welfare link repair: attach or restore entity welfare reclassification evidence.',
      recordedWeek: 12,
    })
    expect(restored).toMatchObject({
      id: 'reclass:welfare-missing',
      label: 'Welfare Repair Subject welfare link repair',
      proposedDisposition: 'unknown',
      reclassificationState: 'pending',
    })
    expect(restored ? validateEntityWelfareReclassificationRecord(restored).valid : false).toBe(
      true
    )
    expect(next.affiliationPersonStatusRecords).toBe(originalPersonStatusRecords)
    expect(next.candidates).toBe(originalCandidates)
    expect(next.recruitmentPool).toBe(originalRecruitmentPool)
    expect(view.records[0]?.reasonCodeLabels).not.toContain(
      'missing_entity_welfare_reclassification_ref'
    )
  })

  it('records repair actions and restores onboarding evidence for resolved onboarding-clearance rows', () => {
    const game = createStartingState()
    game.week = 12
    game.affiliationPersonStatusRecords = {
      'person-status:onboarding-missing': {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        id: 'person-status:onboarding-missing',
        subjectId: 'subject:onboarding-missing',
        subjectLabel: 'Onboarding Repair Subject',
        candidateRef: undefined,
        entityWelfareReclassificationRef: 'reclass:onboarding-welfare-missing',
        backgroundCleared: undefined,
        trainingCompleted: undefined,
        oathContractSigned: undefined,
      },
    }
    const resolutionRecord = buildAffiliationFileWorkQueueEvidenceResolutionRecord({
      workQueueEntryId: 'person-status:onboarding-missing',
      subjectId: 'subject:onboarding-missing',
      subjectLabel: 'Onboarding Repair Subject',
      sourceBucket: 'missing_review',
      missingReasonCodes: [
        'missing_entity_welfare_reclassification_ref',
        'missing_onboarding_clearance',
      ],
      recordedWeek: 11,
    })
    game.affiliationFileWorkQueueEvidenceResolutionRecords = {
      [resolutionRecord.id]: resolutionRecord,
    }
    const originalWelfareRecords = game.entityWelfareReclassificationRecords
    useGameStore.setState({ game })

    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueRepairAction(
        'person-status:onboarding-missing',
        'missing_onboarding_clearance'
      )

    const next = useGameStore.getState().game
    const repairActionId = buildAffiliationFileWorkQueueRepairActionRecordId({
      workQueueEntryId: 'person-status:onboarding-missing',
      reasonCode: 'missing_onboarding_clearance',
    })
    const candidateId = 'candidate:subject:onboarding-missing:onboarding-repair'
    const repairedRecord = next.affiliationPersonStatusRecords?.['person-status:onboarding-missing']
    const view = getAffiliationPersonStatusMirrorView(next)

    expect(next.affiliationFileWorkQueueRepairActionRecords?.[repairActionId]).toEqual({
      id: repairActionId,
      workQueueEntryId: 'person-status:onboarding-missing',
      subjectId: 'subject:onboarding-missing',
      subjectLabel: 'Onboarding Repair Subject',
      reasonCode: 'missing_onboarding_clearance',
      repairLabel: 'Onboarding repair: attach or restore clearance readiness evidence.',
      recordedWeek: 12,
    })
    expect(repairedRecord).toMatchObject({
      candidateRef: candidateId,
      backgroundCleared: true,
      trainingCompleted: true,
      oathContractSigned: true,
    })
    expect(next.candidates).toEqual([
      expect.objectContaining({
        id: candidateId,
        name: 'Onboarding Repair Subject',
        funnelStage: 'hired',
      }),
    ])
    expect(next.recruitmentPool).toEqual([
      expect.objectContaining({
        id: candidateId,
        name: 'Onboarding Repair Subject',
      }),
    ])
    expect(next.entityWelfareReclassificationRecords).toBe(originalWelfareRecords)
    expect(view.records[0]?.reasonCodeLabels).not.toContain('missing_onboarding_clearance')
    expect(view.records[0]?.reasonCodeLabels).toContain(
      'missing_entity_welfare_reclassification_ref'
    )
    expect(view.summary.fileAccessMissingReviewCount).toBe(1)
  })

  it('no-ops for absent, unresolved, non-matching, and already-recorded rows', () => {
    const game = createStartingState()
    game.week = 12
    game.affiliationPersonStatusRecords = {
      'person-status:missing-review': {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        id: 'person-status:missing-review',
        subjectId: 'subject:missing-review',
        subjectLabel: 'Missing Review Subject',
        candidateRef: 'candidate:missing',
        entityWelfareReclassificationRef: 'reclass:missing',
      },
    }
    useGameStore.setState({ game })

    const beforeAbsent = useGameStore.getState().game
    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueRepairAction('person-status:absent', 'missing_candidate_ref')
    expect(useGameStore.getState().game).toBe(beforeAbsent)

    const beforeUnresolved = useGameStore.getState().game
    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueRepairAction(
        'person-status:missing-review',
        'missing_candidate_ref'
      )
    expect(useGameStore.getState().game).toBe(beforeUnresolved)

    const resolutionRecord = buildAffiliationFileWorkQueueEvidenceResolutionRecord({
      workQueueEntryId: 'person-status:missing-review',
      subjectId: 'subject:missing-review',
      subjectLabel: 'Missing Review Subject',
      sourceBucket: 'missing_review',
      missingReasonCodes: ['missing_candidate_ref'],
      recordedWeek: 11,
    })
    useGameStore.setState({
      game: {
        ...useGameStore.getState().game,
        affiliationFileWorkQueueEvidenceResolutionRecords: {
          [resolutionRecord.id]: resolutionRecord,
        },
      },
    })

    const beforeMismatched = useGameStore.getState().game
    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueRepairAction(
        'person-status:missing-review',
        'missing_entity_welfare_reclassification_ref'
      )
    expect(useGameStore.getState().game).toBe(beforeMismatched)

    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueRepairAction(
        'person-status:missing-review',
        'missing_candidate_ref'
      )
    const beforeAlreadyRecorded = useGameStore.getState().game
    useGameStore.setState({
      game: {
        ...beforeAlreadyRecorded,
        week: 15,
      },
    })
    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueRepairAction(
        'person-status:missing-review',
        'missing_candidate_ref'
      )
    expect(useGameStore.getState().game.affiliationFileWorkQueueRepairActionRecords).toBe(
      beforeAlreadyRecorded.affiliationFileWorkQueueRepairActionRecords
    )

    const beforeUnsupported = useGameStore.getState().game
    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueRepairAction('person-status:missing-review', 'missing_unknown')
    expect(useGameStore.getState().game.candidates).toBe(beforeUnsupported.candidates)

    const beforeWelfareUnresolved = useGameStore.getState().game
    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueRepairAction(
        'person-status:missing-review',
        'missing_entity_welfare_reclassification_ref'
      )
    expect(useGameStore.getState().game).toBe(beforeWelfareUnresolved)

    const welfareResolutionRecord = buildAffiliationFileWorkQueueEvidenceResolutionRecord({
      workQueueEntryId: 'person-status:missing-review',
      subjectId: 'subject:missing-review',
      subjectLabel: 'Missing Review Subject',
      sourceBucket: 'missing_review',
      missingReasonCodes: ['missing_entity_welfare_reclassification_ref'],
      recordedWeek: 14,
    })
    useGameStore.setState({
      game: {
        ...useGameStore.getState().game,
        affiliationFileWorkQueueEvidenceResolutionRecords: {
          [welfareResolutionRecord.id]: welfareResolutionRecord,
        },
        entityWelfareReclassificationRecords: {
          'reclass:missing': PENDING_TO_APPROVED_FIXTURE,
        },
      },
    })

    const beforeWelfarePresent = useGameStore.getState().game
    useGameStore
      .getState()
      .recordAffiliationFileWorkQueueRepairAction(
        'person-status:missing-review',
        'missing_entity_welfare_reclassification_ref'
      )
    expect(useGameStore.getState().game.affiliationFileWorkQueueRepairActionRecords).toBe(
      beforeWelfarePresent.affiliationFileWorkQueueRepairActionRecords
    )
    expect(useGameStore.getState().game.entityWelfareReclassificationRecords).toBe(
      beforeWelfarePresent.entityWelfareReclassificationRecords
    )
  })
})

describe('resolveGameStorage', () => {
  it('returns window.localStorage when available', () => {
    const storage = resolveGameStorage()

    expect(storage).toMatchObject({
      getItem: expect.any(Function),
      setItem: expect.any(Function),
      removeItem: expect.any(Function),
    })
  })

  it('falls back to in-memory storage when localStorage is unavailable', () => {
    const originalStorage = window.localStorage

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {} as Storage,
    })

    try {
      const storage = resolveGameStorage()

      expect(storage).toBe(gameStorageFallback)

      storage.setItem('test-key', 'test-value')
      expect(storage.getItem('test-key')).toBe('test-value')

      storage.removeItem('test-key')
      expect(storage.getItem('test-key')).toBeNull()
    } finally {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: originalStorage,
      })
    }
  })

  it('falls back to in-memory storage when localStorage access throws', () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('blocked storage')
      },
    })

    try {
      expect(resolveGameStorage()).toBe(gameStorageFallback)
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(window, 'localStorage', originalDescriptor)
      } else {
        Reflect.deleteProperty(window, 'localStorage')
      }
    }
  })
})
