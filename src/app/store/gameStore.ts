// cspell:words partialize unequip
import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import {
  appendOperationEventDrafts,
  createAgentInstructorAssignedDraft,
  createAgentInstructorUnassignedDraft,
  createSystemAcademyUpgradedDraft,
} from '../../domain/events'
import {
  adjustInventoryQuantity,
  clearEncounterRuntimeState,
  readGameStateManager,
  recordSceneVisit,
  setCurrentLocation as setManagedCurrentLocation,
  setDebugFlag,
  setEncounterRuntimeState,
  setInventoryQuantity,
  setPlayerProfile,
  setUiDebugState,
  type EncounterRuntimePatch,
  type ProgressClockPatch,
  type SceneVisitInput,
} from '../../domain/gameStateManager'
import {
  clearPersistentFlag as clearPersistentFlagState,
  consumeOneShotContent as consumeOneShotContentState,
  setPersistentFlag as setPersistentFlagState,
} from '../../domain/flagSystem'
import {
  applyAuthoredChoice as applyAuthoredChoiceState,
  type AuthoredChoiceDefinition,
  type AuthoredChoiceExecutionResult,
} from '../../domain/choiceSystem'
import {
  appendDeveloperLogEvent as appendDeveloperLogEventState,
  clearDeveloperLog as clearDeveloperLogState,
  type DeveloperLogEventInput,
} from '../../domain/developerLog'
import {
  applyDebugReset,
  applyEncounterDebugReset,
  applyFrontDeskRuntimeBaselineReset,
  applyQueueAndLogReset,
  type DebugResetRequest,
} from '../../domain/debugResetTools'
import {
  advanceDefinedProgressClock,
  setDefinedProgressClock,
} from '../../domain/progressClocks'
import {
  clearRuntimeEventQueue as clearRuntimeEventQueueState,
  dequeueRuntimeEvent as dequeueRuntimeEventState,
  enqueueRuntimeEvent as enqueueRuntimeEventState,
  listQueuedRuntimeEvents,
  peekQueuedRuntimeEvent,
  type RuntimeQueueEventInput,
} from '../../domain/eventQueue'
import {
  resolveAndApplyHiddenCombat,
  type HiddenCombatExecutionResult,
  type HiddenCombatResolutionInput,
} from '../../domain/hiddenCombatResolver'
import type { ScreenRouteContext } from '../../domain/screenRouting'
import {
  type DeveloperLogEvent,
  type GameConfig,
  type GameFlagValue,
  type GameLocationState,
  type GameState,
  type GameUiDebugState,
  type Id,
  type CertificationState,
  type MajorIncidentProvisionType,
  type MajorIncidentStrategy,
  type PlayerProfileState,
  type ProgressClockState,
  type RecruitmentFunnelStage,
  type StatKey,
  type WeeklyDirectiveId,
} from '../../domain/models'
import { createSeededRng, normalizeSeed } from '../../domain/math'
import type { EquipmentSlotKind } from '../../domain/equipment'
import { discardPartyCard, drawPartyCards, playPartyCard } from '../../domain/partyCards/engine'
import { createStartingState } from '../../data/startingState'
import { advanceWeek } from '../../domain/sim/advanceWeek'
import { assignTeam, launchMajorIncident, unassignTeam } from '../../domain/sim/assign'
import { queueFabrication } from '../../domain/sim/production'
import { purchaseMarketInventory, sellMarketInventory } from '../../domain/sim/market'
import { hireCandidate } from '../../domain/sim/hire'
import { scoutCandidate } from '../../domain/sim/recruitmentScouting'
import { transitionRecruitmentCandidate } from '../../domain/recruitment'
import { equipAgentItem, unequipAgentItem } from '../../domain/sim/equipment'
import {
  createTeam,
  deleteEmptyTeam,
  moveAgentBetweenTeams,
  renameTeam,
  setTeamLeader,
} from '../../domain/sim/teamManagement'
import {
  cancelTraining,
  reviewCertification,
  queueTeamTraining,
  queueTraining,
  spendSkillPoint,
  transitionCertification,
} from '../../domain/sim/training'
import { upgradeAcademy } from '../../domain/sim/academyUpgrade'
import {
  assignInstructor,
  getInstructorBonus,
  unassignInstructor,
} from '../../domain/sim/instructorAssignment'
import { recomputeMissionRouting, routeMissionToTeam } from '../../domain/missionIntakeRouting'
import { evaluateDeploymentEligibility } from '../../domain/deploymentReadiness'
import { reconcileAgents } from '../../domain/sim/reconciliation'
import { launchContract as launchContractDomain, refreshContractBoard } from '../../domain/contracts'
import {
  createRunFromCurrentConfig,
  GAME_STORE_VERSION,
  hydrateGame,
  migratePersistedStore,
  sanitizeGameConfig,
  stripGameTemplates,
  type PersistedStore,
} from './runTransfer'
import { GAME_SAVE_KIND, GAME_SAVE_VERSION, loadGameSave, serializeGameSave } from './saveSystem'

interface GameStore {
  game: GameState
  appendDeveloperLogEvent: (event: DeveloperLogEventInput) => void
  clearDeveloperLog: () => void
  debugReset: (request: DebugResetRequest) => ReturnType<typeof applyDebugReset>['summary']
  debugResetFrontDeskBaseline: () => ReturnType<typeof applyFrontDeskRuntimeBaselineReset>['summary']
  debugResetQueueAndLog: () => ReturnType<typeof applyQueueAndLogReset>['summary']
  debugResetEncounterState: () => ReturnType<typeof applyEncounterDebugReset>['summary']
  setPersistentFlag: (flagId: string, value?: GameFlagValue) => void
  clearPersistentFlag: (flagId: string) => void
  consumeOneShotContent: (contentId: string, source?: string) => boolean
  enqueueRuntimeEvent: (event: RuntimeQueueEventInput) => string | null
  dequeueRuntimeEvent: () => string | null
  peekRuntimeEvent: () => string | null
  listRuntimeEventQueue: () => ReturnType<typeof listQueuedRuntimeEvents>
  clearRuntimeEventQueue: () => number
  applyAuthoredChoice: (
    choice: AuthoredChoiceDefinition,
    context?: ScreenRouteContext
  ) => AuthoredChoiceExecutionResult
  resolveHiddenEncounter: (
    input: HiddenCombatResolutionInput,
    context?: ScreenRouteContext
  ) => HiddenCombatExecutionResult
  setPlayerProfile: (patch: Partial<PlayerProfileState>) => void
  setGlobalFlag: (flagId: string, value: GameFlagValue) => void
  clearGlobalFlag: (flagId: string) => void
  markOneShotEvent: (eventId: string, source?: string) => void
  setCurrentLocation: (
    nextLocation: Pick<GameLocationState, 'hubId'> & Partial<Omit<GameLocationState, 'hubId'>>
  ) => void
  recordSceneVisit: (entry: SceneVisitInput) => void
  setEncounterRuntimeState: (encounterId: string, patch: EncounterRuntimePatch) => void
  clearEncounterRuntimeState: (encounterId: string) => void
  setProgressClock: (clockId: string, patch: ProgressClockPatch) => void
  advanceProgressClock: (
    clockId: string,
    delta: number,
    defaults?: Pick<ProgressClockState, 'label' | 'max' | 'hidden'>
  ) => void
  setUiDebugState: (patch: Partial<GameUiDebugState>) => void
  setDebugFlag: (flagId: string, enabled: boolean) => void
  setInventoryQuantity: (itemId: string, quantity: number) => void
  adjustInventoryQuantity: (itemId: string, delta: number) => void
  launchContract: (contractId: Id, teamId: Id) => void
  launchMajorIncident: (
    caseId: Id,
    teamIds: Id[],
    strategy?: MajorIncidentStrategy,
    provisions?: MajorIncidentProvisionType[]
  ) => void
  assign: (caseId: Id, teamId: Id) => void
  unassign: (caseId: Id, teamId?: Id) => void
  hireCandidate: (candidateId: Id) => void
  scoutCandidate: (candidateId: Id) => void
  transitionCandidateFunnel: (
    candidateId: Id,
    toStage: RecruitmentFunnelStage,
    options?: { note?: string; lossReason?: string }
  ) => boolean
  contactCandidate: (candidateId: Id, note?: string) => boolean
  screenCandidate: (candidateId: Id, note?: string) => boolean
  loseCandidate: (candidateId: Id, lossReason?: string) => boolean
  createTeam: (name: string, seedAgentId: Id) => void
  renameTeam: (teamId: Id, name: string) => void
  setTeamLeader: (teamId: Id, leaderId: Id | null) => void
  moveAgentBetweenTeams: (agentId: Id, targetTeamId?: Id | null) => void
  deleteEmptyTeam: (teamId: Id) => void
  queueTraining: (agentId: Id, trainingId: string) => void
  queueTeamTraining: (teamId: Id, trainingId: string) => void
  cancelTraining: (agentId: Id) => void
  transitionCertification: (
    agentId: Id,
    certificationId: string,
    toState: CertificationState,
    options?: { administrative?: boolean; notes?: string }
  ) => void
  reviewCertification: (
    agentId: Id,
    certificationId: string,
    approve: boolean,
    options?: { administrative?: boolean; notes?: string }
  ) => void
  spendSkillPoint: (agentId: Id, stat: StatKey) => void
  upgradeAcademy: () => void
  assignInstructor: (staffId: Id, agentId: Id) => void
  unassignInstructor: (staffId: Id) => void
  reconcileAgents: (leftId: Id, rightId: Id) => void
  equipAgentItem: (agentId: Id, slot: EquipmentSlotKind, itemId: string) => void
  unequipAgentItem: (agentId: Id, slot: EquipmentSlotKind) => void
  queueFabrication: (recipeId: string) => void
  purchaseMarketInventory: (listingId: string, bundles?: number) => void
  sellMarketInventory: (listingId: string, bundles?: number) => void
  drawPartyCards: (count?: number) => void
  playPartyCard: (cardId: Id, targetCaseId?: Id, targetTeamId?: Id) => void
  discardPartyCard: (cardId: Id) => void
  setWeeklyDirective: (directiveId: WeeklyDirectiveId | null) => void
  refreshMissionRouting: () => void
  evaluateMissionDeployment: (missionId: Id, teamId: Id) => ReturnType<typeof evaluateDeploymentEligibility> | null
  assignMissionTeam: (missionId: Id, teamId: Id) => boolean
  advanceWeek: () => void
  setSeed: (seed: number) => void
  updateConfig: (patch: Partial<GameConfig>) => void
  exportSave: () => string
  importSave: (raw: string) => void
  exportRun: () => string
  importRun: (raw: string) => void
  newRunFromCurrentConfig: () => void
  reset: () => void
}

function areStringListsEqual(left: readonly string[] | undefined, right: readonly string[] | undefined) {
  const normalizedLeft = left ?? []
  const normalizedRight = right ?? []

  if (normalizedLeft.length !== normalizedRight.length) {
    return false
  }

  return normalizedLeft.every((entry, index) => entry === normalizedRight[index])
}

function areLocationStatesEqual(left: GameLocationState, right: GameLocationState) {
  return (
    left.hubId === right.hubId &&
    left.locationId === right.locationId &&
    left.sceneId === right.sceneId &&
    left.updatedWeek === right.updatedWeek
  )
}

function areProgressClocksEqual(
  left: ReturnType<typeof readGameStateManager>['progressClocks'][string] | undefined,
  right: ReturnType<typeof readGameStateManager>['progressClocks'][string] | undefined
) {
  return (
    left?.id === right?.id &&
    left?.label === right?.label &&
    left?.value === right?.value &&
    left?.max === right?.max &&
    left?.hidden === right?.hidden &&
    left?.completedAtWeek === right?.completedAtWeek
  )
}

function areEncounterStatesEqual(
  left: ReturnType<typeof readGameStateManager>['encounterState'][string] | undefined,
  right: ReturnType<typeof readGameStateManager>['encounterState'][string] | undefined
) {
  if (!left && !right) {
    return true
  }

  if (!left || !right) {
    return false
  }

  const leftFlags = Object.entries(left.flags).sort(([leftId], [rightId]) => leftId.localeCompare(rightId))
  const rightFlags = Object.entries(right.flags).sort(([leftId], [rightId]) => leftId.localeCompare(rightId))

  return (
    left.encounterId === right.encounterId &&
    left.status === right.status &&
    left.phase === right.phase &&
    left.startedWeek === right.startedWeek &&
    left.resolvedWeek === right.resolvedWeek &&
    left.latestOutcome === right.latestOutcome &&
    left.lastResolutionId === right.lastResolutionId &&
    areStringListsEqual(left.followUpIds, right.followUpIds) &&
    left.lastUpdatedWeek === right.lastUpdatedWeek &&
    areStringListsEqual(left.hiddenModifierIds, right.hiddenModifierIds) &&
    areStringListsEqual(left.revealedModifierIds, right.revealedModifierIds) &&
    JSON.stringify(leftFlags) === JSON.stringify(rightFlags)
  )
}

function areAuthoringDebugStatesEqual(
  left: GameUiDebugState['authoring'] | undefined,
  right: GameUiDebugState['authoring'] | undefined
) {
  return (
    left?.activeContextId === right?.activeContextId &&
    left?.lastChoiceId === right?.lastChoiceId &&
    left?.lastNextTargetId === right?.lastNextTargetId &&
    left?.updatedWeek === right?.updatedWeek &&
    areStringListsEqual(left?.lastFollowUpIds, right?.lastFollowUpIds)
  )
}

function formatLocationSummary(location: GameLocationState) {
  return [location.hubId, location.locationId, location.sceneId].filter(Boolean).join(' / ')
}

function serializeDeveloperLogDetails(details: DeveloperLogEvent['details']) {
  if (!details) {
    return ''
  }

  return JSON.stringify(
    Object.fromEntries(
      Object.entries(details)
        .sort(([leftId], [rightId]) => leftId.localeCompare(rightId))
        .map(([detailId, detailValue]) => [detailId, Array.isArray(detailValue) ? [...detailValue] : detailValue])
    )
  )
}

function getLastDeveloperLogEvent(game: GameState): DeveloperLogEvent | undefined {
  const entries = readGameStateManager(game).ui.debug.eventLog ?? []
  return entries.length > 0 ? entries[entries.length - 1] : undefined
}

function appendAuthoringContextLogIfChanged(
  previousGame: GameState,
  nextGame: GameState,
  fallbackContextId?: string
) {
  const previousAuthoring = readGameStateManager(previousGame).ui.authoring
  const nextAuthoring = readGameStateManager(nextGame).ui.authoring

  if (areAuthoringDebugStatesEqual(previousAuthoring, nextAuthoring)) {
    return nextGame
  }

  return appendDeveloperLogEventState(nextGame, {
    type: 'authoring.context_changed',
    summary: 'Authored context updated',
    contextId: nextAuthoring?.activeContextId ?? fallbackContextId,
    details: {
      activeContextId: nextAuthoring?.activeContextId ?? 'n/a',
      ...(nextAuthoring?.lastChoiceId ? { lastChoiceId: nextAuthoring.lastChoiceId } : {}),
      ...(nextAuthoring?.lastNextTargetId ? { nextTargetId: nextAuthoring.lastNextTargetId } : {}),
      ...(nextAuthoring?.lastFollowUpIds?.length ? { followUpIds: nextAuthoring.lastFollowUpIds } : {}),
      ...(typeof nextAuthoring?.updatedWeek === 'number' ? { updatedWeek: nextAuthoring.updatedWeek } : {}),
    },
  })
}

// ----- Storage resolution (mirrors incidentStore.ts safety pattern) -----

const _gameMemoryStorage = new Map<string, string>()

export const gameStorageFallback: StateStorage = {
  getItem: (name) => _gameMemoryStorage.get(name) ?? null,
  setItem: (name, value) => {
    _gameMemoryStorage.set(name, value)
  },
  removeItem: (name) => {
    _gameMemoryStorage.delete(name)
  },
}

export function resolveGameStorage(): StateStorage {
  if (typeof window !== 'undefined') {
    try {
      const candidate = window.localStorage

      if (
        candidate &&
        typeof candidate.getItem === 'function' &&
        typeof candidate.setItem === 'function' &&
        typeof candidate.removeItem === 'function'
      ) {
        return candidate
      }
    } catch {
      return gameStorageFallback
    }
  }

  return gameStorageFallback
}

// ----- Store -----

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      game: createStartingState(),

      appendDeveloperLogEvent: (event) =>
        set((s) => {
          const lastEvent = getLastDeveloperLogEvent(s.game)
          const contextId = event.contextId ?? readGameStateManager(s.game).ui.authoring?.activeContextId
          const isDuplicate =
            lastEvent?.type === event.type &&
            lastEvent.summary === event.summary &&
            lastEvent.week === (typeof event.week === 'number' ? Math.max(1, Math.trunc(event.week)) : s.game.week) &&
            lastEvent.contextId === contextId &&
            serializeDeveloperLogDetails(lastEvent.details) === serializeDeveloperLogDetails(event.details)

          return {
            game: isDuplicate ? s.game : appendDeveloperLogEventState(s.game, event),
          }
        }),

      clearDeveloperLog: () =>
        set((s) => ({ game: clearDeveloperLogState(s.game) })),

      debugReset: (request) => {
        let resetSummary: ReturnType<typeof applyDebugReset>['summary'] = {
          clearedDeveloperLog: false,
          clearedEventQueue: false,
          resetFlagCount: 0,
          resetOneShotCount: 0,
          resetProgressClockCount: 0,
          clearedEncounterCount: 0,
          resetAuthoredDebugContext: false,
          fullRuntimeDebugReset: false,
        }

        set((s) => {
          const reset = applyDebugReset(s.game, request)
          resetSummary = reset.summary

          const changedSummary = [
            reset.summary.clearedDeveloperLog ? 'developer-log' : null,
            reset.summary.clearedEventQueue ? 'event-queue' : null,
            reset.summary.resetFlagCount > 0 ? `flags:${reset.summary.resetFlagCount}` : null,
            reset.summary.resetOneShotCount > 0
              ? `one-shots:${reset.summary.resetOneShotCount}`
              : null,
            reset.summary.resetProgressClockCount > 0
              ? `clocks:${reset.summary.resetProgressClockCount}`
              : null,
            reset.summary.clearedEncounterCount > 0
              ? `encounters:${reset.summary.clearedEncounterCount}`
              : null,
            reset.summary.resetAuthoredDebugContext ? 'authored-context' : null,
            reset.summary.fullRuntimeDebugReset ? 'runtime-full' : null,
          ].filter((entry): entry is string => Boolean(entry))

          const game = appendDeveloperLogEventState(reset.state, {
            type: 'authoring.context_changed',
            summary:
              changedSummary.length > 0
                ? `Debug reset applied (${changedSummary.join(', ')})`
                : 'Debug reset invoked (no-op)',
            details: {
              clearedDeveloperLog: reset.summary.clearedDeveloperLog,
              clearedEventQueue: reset.summary.clearedEventQueue,
              resetFlagCount: reset.summary.resetFlagCount,
              resetOneShotCount: reset.summary.resetOneShotCount,
              resetProgressClockCount: reset.summary.resetProgressClockCount,
              clearedEncounterCount: reset.summary.clearedEncounterCount,
              resetAuthoredDebugContext: reset.summary.resetAuthoredDebugContext,
              fullRuntimeDebugReset: reset.summary.fullRuntimeDebugReset,
            },
          })

          return { game }
        })

        return resetSummary
      },

      debugResetFrontDeskBaseline: () => {
        let resetSummary = applyFrontDeskRuntimeBaselineReset(get().game).summary

        set((s) => {
          const reset = applyFrontDeskRuntimeBaselineReset(s.game)
          resetSummary = reset.summary

          return {
            game: appendDeveloperLogEventState(reset.state, {
              type: 'authoring.context_changed',
              summary: 'Debug reset applied (front-desk baseline)',
              details: {
                clearedDeveloperLog: reset.summary.clearedDeveloperLog,
                clearedEventQueue: reset.summary.clearedEventQueue,
                clearedEncounterCount: reset.summary.clearedEncounterCount,
                resetAuthoredDebugContext: reset.summary.resetAuthoredDebugContext,
              },
            }),
          }
        })

        return resetSummary
      },

      debugResetQueueAndLog: () => {
        let resetSummary = applyQueueAndLogReset(get().game).summary

        set((s) => {
          const reset = applyQueueAndLogReset(s.game)
          resetSummary = reset.summary

          return {
            game: appendDeveloperLogEventState(reset.state, {
              type: 'authoring.context_changed',
              summary: 'Debug reset applied (queue + log)',
              details: {
                clearedDeveloperLog: reset.summary.clearedDeveloperLog,
                clearedEventQueue: reset.summary.clearedEventQueue,
              },
            }),
          }
        })

        return resetSummary
      },

      debugResetEncounterState: () => {
        let resetSummary = applyEncounterDebugReset(get().game).summary

        set((s) => {
          const reset = applyEncounterDebugReset(s.game)
          resetSummary = reset.summary

          return {
            game: appendDeveloperLogEventState(reset.state, {
              type: 'authoring.context_changed',
              summary: 'Debug reset applied (encounter state)',
              details: {
                clearedEventQueue: reset.summary.clearedEventQueue,
                clearedEncounterCount: reset.summary.clearedEncounterCount,
              },
            }),
          }
        })

        return resetSummary
      },

      setPersistentFlag: (flagId, value = true) =>
        set((s) => {
          const beforeValue = readGameStateManager(s.game).globalFlags[flagId]
          let game = setPersistentFlagState(s.game, flagId, value)
          const afterValue = readGameStateManager(game).globalFlags[flagId]

          game = appendDeveloperLogEventState(game, {
            type: 'flag.set',
            summary: `Flag set: ${flagId}`,
            details: {
              flagId,
              value: typeof afterValue === 'boolean' || typeof afterValue === 'number' || typeof afterValue === 'string' ? afterValue : String(value),
            },
          })

          return {
            game: beforeValue !== afterValue ? game : s.game,
          }
        }),

      clearPersistentFlag: (flagId) =>
        set((s) => {
          const beforeValue = readGameStateManager(s.game).globalFlags[flagId]
          let game = clearPersistentFlagState(s.game, flagId)
          const afterValue = readGameStateManager(game).globalFlags[flagId]

          game = appendDeveloperLogEventState(game, {
            type: 'flag.cleared',
            summary: `Flag cleared: ${flagId}`,
            details: {
              flagId,
            },
          })

          return {
            game: beforeValue !== afterValue ? game : s.game,
          }
        }),

      consumeOneShotContent: (contentId, source) => {
        let consumed = false
        set((s) => {
          const result = consumeOneShotContentState(s.game, contentId, source)
          consumed = result.consumed
          const game = result.consumed
            ? appendDeveloperLogEventState(result.state, {
                type: 'one_shot.consumed',
                summary: `One-shot consumed: ${contentId}`,
                details: {
                  contentId,
                  ...(source ? { source } : {}),
                },
              })
            : result.state
          return { game }
        })
        return consumed
      },

      enqueueRuntimeEvent: (event) => {
        let enqueuedId: string | null = null
        set((s) => {
          const result = enqueueRuntimeEventState(s.game, event)
          if (!result.event) {
            return { game: s.game }
          }

          enqueuedId = result.event.id
          const game = appendDeveloperLogEventState(result.state, {
            type: 'event_queue.enqueued',
            summary: `Runtime event queued: ${result.event.type}`,
            contextId: result.event.contextId,
            details: {
              queueEventId: result.event.id,
              type: result.event.type,
              targetId: result.event.targetId,
              ...(result.event.source ? { source: result.event.source } : {}),
            },
          })

          return { game }
        })

        return enqueuedId
      },

      dequeueRuntimeEvent: () => {
        let dequeuedId: string | null = null
        set((s) => {
          const result = dequeueRuntimeEventState(s.game)

          if (!result.event) {
            return { game: s.game }
          }

          dequeuedId = result.event.id
          const game = appendDeveloperLogEventState(result.state, {
            type: 'event_queue.dequeued',
            summary: `Runtime event dequeued: ${result.event.type}`,
            contextId: result.event.contextId,
            details: {
              queueEventId: result.event.id,
              type: result.event.type,
              targetId: result.event.targetId,
              ...(result.event.source ? { source: result.event.source } : {}),
            },
          })

          return { game }
        })

        return dequeuedId
      },

      peekRuntimeEvent: () => {
        return peekQueuedRuntimeEvent(get().game)?.id ?? null
      },

      listRuntimeEventQueue: () => listQueuedRuntimeEvents(get().game),

      clearRuntimeEventQueue: () => {
        let removed = 0
        set((s) => {
          const queueBefore = listQueuedRuntimeEvents(s.game)
          removed = queueBefore.length

          if (removed === 0) {
            return { game: s.game }
          }

          const game = appendDeveloperLogEventState(clearRuntimeEventQueueState(s.game), {
            type: 'event_queue.cleared',
            summary: 'Runtime event queue cleared',
            details: {
              removed,
            },
          })

          return { game }
        })

        return removed
      },

      applyAuthoredChoice: (choice, context) => {
        let result: AuthoredChoiceExecutionResult = {
          state: get().game,
          choiceId: choice.id,
          applied: false,
          availability: null,
          ...(choice.nextTargetId ? { nextTargetId: choice.nextTargetId } : {}),
          followUpIds: [],
          appliedConsequences: [],
          changedFlags: [],
          clearedFlags: [],
          consumedOneShots: [],
          touchedProgressClocks: [],
          touchedEncounterIds: [],
          sceneVisits: [],
          locationUpdated: false,
        }

        set((s) => {
          result = applyAuthoredChoiceState(s.game, choice, context)
          let gameWithDebugSnapshot: GameState = setUiDebugState(result.state, {
            authoring: {
              ...(context?.activeContextId ? { activeContextId: context.activeContextId } : {}),
              lastChoiceId: result.choiceId,
              ...(result.nextTargetId ? { lastNextTargetId: result.nextTargetId } : {}),
              lastFollowUpIds: result.followUpIds,
              updatedWeek: s.game.week,
            },
          })
          gameWithDebugSnapshot = appendDeveloperLogEventState(gameWithDebugSnapshot, {
            type: 'choice.executed',
            summary: `Choice executed: ${result.choiceId}`,
            contextId: context?.activeContextId,
            details: {
              ...(result.nextTargetId ? { nextTargetId: result.nextTargetId } : {}),
              ...(result.changedFlags.length ? { changedFlags: result.changedFlags } : {}),
              ...(result.clearedFlags.length ? { clearedFlags: result.clearedFlags } : {}),
              ...(result.consumedOneShots.length ? { consumedOneShots: result.consumedOneShots } : {}),
              ...(result.touchedProgressClocks.length
                ? { progressClocks: result.touchedProgressClocks }
                : {}),
              ...(result.touchedEncounterIds.length
                ? { encounterIds: result.touchedEncounterIds }
                : {}),
              ...(result.followUpIds.length ? { followUpIds: result.followUpIds } : {}),
            },
          })
          const queuedEvents = listQueuedRuntimeEvents(gameWithDebugSnapshot).filter(
            (event) => event.source === result.choiceId
          )
          gameWithDebugSnapshot = queuedEvents.length
            ? appendDeveloperLogEventState(gameWithDebugSnapshot, {
                type: 'event_queue.enqueued',
                summary: `Choice queued ${queuedEvents.length} follow-up event${queuedEvents.length === 1 ? '' : 's'}`,
                contextId: context?.activeContextId,
                details: {
                  choiceId: result.choiceId,
                  queueEventIds: queuedEvents.map((event) => event.id),
                  followUpIds: queuedEvents.map((event) => event.targetId),
                },
              })
            : gameWithDebugSnapshot
          gameWithDebugSnapshot = appendAuthoringContextLogIfChanged(
            s.game,
            gameWithDebugSnapshot,
            context?.activeContextId
          )
          result = {
            ...result,
            state: gameWithDebugSnapshot,
          }
          return {
            game: gameWithDebugSnapshot,
          }
        })

        return result
      },

      resolveHiddenEncounter: (input, context) => {
        let result: HiddenCombatExecutionResult = {
          resolution: {
            resolutionId: `hidden-combat.${input.encounterId}.${get().game.week}.failure`,
            outcomeId: 'failure',
            branchIsFallback: true,
            encounterId: input.encounterId,
            week: get().game.week,
            outcome: 'failure',
            success: false,
            score: 0,
            encounterPatch: {
              status: 'active',
              phase: 'hidden-combat:failure',
              flags: {
                hiddenCombatResolved: true,
                hiddenCombatSuccess: false,
                hiddenCombatPartial: false,
                hiddenCombatFailure: true,
              },
              lastUpdatedWeek: get().game.week,
            },
            followUpIds: [],
            queueEvents: [],
            flagEffects: {},
            progressEffects: [],
            allyBehaviors: [],
          },
          apply: {
            state: get().game,
            queuedEventIds: [],
            queueEvents: [],
          },
        }

        set((s) => {
          result = resolveAndApplyHiddenCombat(s.game, input, {
            contextId: context?.activeContextId,
          })

          let game = appendDeveloperLogEventState(result.apply.state, {
            type: 'encounter.patched',
            summary: `Hidden encounter resolved: ${result.resolution.encounterId} (${result.resolution.outcome})`,
            contextId: context?.activeContextId,
            details: {
              encounterId: result.resolution.encounterId,
              outcome: result.resolution.outcome,
              score: result.resolution.score,
              resolutionId: result.resolution.resolutionId,
              ...(result.resolution.followUpIds.length
                ? { followUpIds: result.resolution.followUpIds }
                : {}),
            },
          })

          game = result.apply.queueEvents.length
            ? appendDeveloperLogEventState(game, {
                type: 'event_queue.enqueued',
                summary: `Hidden encounter queued ${result.apply.queueEvents.length} follow-up event${result.apply.queueEvents.length === 1 ? '' : 's'}`,
                contextId: context?.activeContextId,
                details: {
                  encounterId: result.resolution.encounterId,
                  queueEventIds: result.apply.queuedEventIds,
                  followUpIds: result.apply.queueEvents.map((event) => event.targetId),
                },
              })
            : game

          result = {
            ...result,
            apply: {
              ...result.apply,
              state: game,
            },
          }

          return {
            game,
          }
        })

        return result
      },

      setPlayerProfile: (patch) => set((s) => ({ game: setPlayerProfile(s.game, patch) })),

      setGlobalFlag: (flagId, value) =>
        get().setPersistentFlag(flagId, value),

      clearGlobalFlag: (flagId) =>
        get().clearPersistentFlag(flagId),

      markOneShotEvent: (eventId, source) =>
        get().consumeOneShotContent(eventId, source),

      setCurrentLocation: (nextLocation) =>
        set((s) => {
          const beforeLocation = readGameStateManager(s.game).currentLocation
          let game = setManagedCurrentLocation(s.game, nextLocation)
          const afterLocation = readGameStateManager(game).currentLocation

          game = appendDeveloperLogEventState(game, {
            type: 'location.changed',
            summary: `Location changed: ${formatLocationSummary(afterLocation)}`,
            details: {
              hubId: afterLocation.hubId,
              ...(afterLocation.locationId ? { locationId: afterLocation.locationId } : {}),
              ...(afterLocation.sceneId ? { sceneId: afterLocation.sceneId } : {}),
            },
          })

          return {
            game: areLocationStatesEqual(beforeLocation, afterLocation) ? s.game : game,
          }
        }),

      recordSceneVisit: (entry) =>
        set((s) => {
          const beforeLocation = readGameStateManager(s.game).currentLocation
          let game = recordSceneVisit(s.game, entry)
          const afterLocation = readGameStateManager(game).currentLocation

          game = areLocationStatesEqual(beforeLocation, afterLocation)
            ? game
            : appendDeveloperLogEventState(game, {
                type: 'location.changed',
                summary: `Location changed: ${formatLocationSummary(afterLocation)}`,
                details: {
                  hubId: afterLocation.hubId,
                  ...(afterLocation.locationId ? { locationId: afterLocation.locationId } : {}),
                  ...(afterLocation.sceneId ? { sceneId: afterLocation.sceneId } : {}),
                  ...(entry.outcome ? { outcome: entry.outcome } : {}),
                },
              })

          return {
            game,
          }
        }),

      setEncounterRuntimeState: (encounterId, patch) =>
        set((s) => {
          const beforeEncounter = readGameStateManager(s.game).encounterState[encounterId]
          let game = setEncounterRuntimeState(s.game, encounterId, patch)
          const afterEncounter = readGameStateManager(game).encounterState[encounterId]

          game = appendDeveloperLogEventState(game, {
            type: 'encounter.patched',
            summary: `Encounter runtime patched: ${encounterId}`,
            details: {
              encounterId,
              ...(afterEncounter?.status ? { status: afterEncounter.status } : {}),
              ...(afterEncounter?.phase ? { phase: afterEncounter.phase } : {}),
              ...(afterEncounter?.hiddenModifierIds.length
                ? { hiddenModifierIds: afterEncounter.hiddenModifierIds }
                : {}),
              ...(afterEncounter?.revealedModifierIds.length
                ? { revealedModifierIds: afterEncounter.revealedModifierIds }
                : {}),
            },
          })

          return {
            game: areEncounterStatesEqual(beforeEncounter, afterEncounter) ? s.game : game,
          }
        }),

      clearEncounterRuntimeState: (encounterId) =>
        set((s) => ({ game: clearEncounterRuntimeState(s.game, encounterId) })),

      setProgressClock: (clockId, patch) =>
        set((s) => {
          const beforeClock = readGameStateManager(s.game).progressClocks[clockId]
          let game = setDefinedProgressClock(s.game, clockId, patch)
          const afterClock = readGameStateManager(game).progressClocks[clockId]

          game = appendDeveloperLogEventState(game, {
            type: 'progress_clock.changed',
            summary: `Progress clock changed: ${clockId}`,
            details: {
              clockId,
              ...(afterClock?.label ? { label: afterClock.label } : {}),
              ...(afterClock ? { value: afterClock.value, max: afterClock.max } : {}),
            },
          })

          return {
            game: areProgressClocksEqual(beforeClock, afterClock) ? s.game : game,
          }
        }),

      advanceProgressClock: (clockId, delta, defaults) =>
        set((s) => {
          const beforeClock = readGameStateManager(s.game).progressClocks[clockId]
          let game = advanceDefinedProgressClock(s.game, clockId, delta, defaults)
          const afterClock = readGameStateManager(game).progressClocks[clockId]

          game = appendDeveloperLogEventState(game, {
            type: 'progress_clock.changed',
            summary: `Progress clock changed: ${clockId}`,
            details: {
              clockId,
              delta,
              ...(afterClock?.label ? { label: afterClock.label } : {}),
              ...(afterClock ? { value: afterClock.value, max: afterClock.max } : {}),
            },
          })

          return {
            game: areProgressClocksEqual(beforeClock, afterClock) ? s.game : game,
          }
        }),

      setUiDebugState: (patch) =>
        set((s) => {
          let game: GameState = setUiDebugState(s.game, patch)
          game = patch.authoring ? appendAuthoringContextLogIfChanged(s.game, game) : game
          return { game }
        }),

      setDebugFlag: (flagId, enabled) =>
        set((s) => ({ game: setDebugFlag(s.game, flagId, enabled) })),

      setInventoryQuantity: (itemId, quantity) =>
        set((s) => ({ game: setInventoryQuantity(s.game, itemId, quantity) })),

      adjustInventoryQuantity: (itemId, delta) =>
        set((s) => ({ game: adjustInventoryQuantity(s.game, itemId, delta) })),

      launchContract: (contractId, teamId) =>
        set((s) => ({ game: launchContractDomain(s.game, contractId, teamId) })),

      launchMajorIncident: (caseId, teamIds, strategy = 'balanced', provisions = []) =>
        set((s) => ({
          game: launchMajorIncident(s.game, caseId, teamIds, strategy, provisions),
        })),

      assign: (caseId, teamId) => set((s) => ({ game: assignTeam(s.game, caseId, teamId) })),

      unassign: (caseId, teamId) => set((s) => ({ game: unassignTeam(s.game, caseId, teamId) })),

      hireCandidate: (candidateId) => set((s) => ({ game: hireCandidate(s.game, candidateId) })),

      scoutCandidate: (candidateId) => set((s) => ({ game: scoutCandidate(s.game, candidateId) })),

      transitionCandidateFunnel: (candidateId, toStage, options) => {
        let transitioned = false

        set((s) => {
          const transition = transitionRecruitmentCandidate(s.game, candidateId, {
            toStage,
            week: s.game.week,
            ...(options?.note ? { note: options.note } : {}),
            ...(options?.lossReason ? { lossReason: options.lossReason } : {}),
          })

          transitioned = transition.transitioned

          if (!transition.transitioned) {
            return { game: s.game }
          }

          const game = appendDeveloperLogEventState(transition.state, {
            type: 'authoring.context_changed',
            summary: `Candidate funnel transitioned: ${candidateId} -> ${toStage}`,
            details: {
              candidateId,
              ...(transition.fromStage ? { fromStage: transition.fromStage } : {}),
              toStage,
              ...(options?.note ? { note: options.note } : {}),
              ...(options?.lossReason ? { lossReason: options.lossReason } : {}),
            },
          })

          return { game }
        })

        return transitioned
      },

      contactCandidate: (candidateId, note) =>
        get().transitionCandidateFunnel(candidateId, 'contacted', {
          ...(note ? { note } : {}),
        }),

      screenCandidate: (candidateId, note) =>
        get().transitionCandidateFunnel(candidateId, 'screening', {
          ...(note ? { note } : {}),
        }),

      loseCandidate: (candidateId, lossReason) =>
        get().transitionCandidateFunnel(candidateId, 'lost', {
          ...(lossReason ? { lossReason } : {}),
        }),

      createTeam: (name, seedAgentId) =>
        set((s) => ({ game: createTeam(s.game, name, seedAgentId) })),

      renameTeam: (teamId, name) => set((s) => ({ game: renameTeam(s.game, teamId, name) })),

      setTeamLeader: (teamId, leaderId) =>
        set((s) => ({ game: setTeamLeader(s.game, teamId, leaderId) })),

      moveAgentBetweenTeams: (agentId, targetTeamId) =>
        set((s) => ({ game: moveAgentBetweenTeams(s.game, agentId, targetTeamId) })),

      deleteEmptyTeam: (teamId) => set((s) => ({ game: deleteEmptyTeam(s.game, teamId) })),

      queueTraining: (agentId, trainingId) =>
        set((s) => ({ game: queueTraining(s.game, agentId, trainingId) })),

      queueTeamTraining: (teamId, trainingId) =>
        set((s) => ({ game: queueTeamTraining(s.game, teamId, trainingId) })),

      cancelTraining: (agentId) => set((s) => ({ game: cancelTraining(s.game, agentId) })),

      transitionCertification: (agentId, certificationId, toState, options) =>
        set((s) => ({
          game: transitionCertification(s.game, agentId, certificationId, toState, options).state,
        })),

      reviewCertification: (agentId, certificationId, approve, options) =>
        set((s) => ({
          game: reviewCertification(s.game, agentId, certificationId, approve, options).state,
        })),

      spendSkillPoint: (agentId, stat) =>
        set((s) => ({ game: spendSkillPoint(s.game, agentId, stat) })),

      upgradeAcademy: () =>
        set((s) => {
          const beforeTier = s.game.academyTier ?? 0
          const beforeFunding = s.game.funding
          const next = upgradeAcademy(s.game)
          const afterTier = next.academyTier ?? 0

          if (afterTier === beforeTier) {
            return { game: next }
          }

          return {
            game: appendOperationEventDrafts(next, [
              createSystemAcademyUpgradedDraft({
                week: next.week,
                tierBefore: beforeTier,
                tierAfter: afterTier,
                fundingBefore: beforeFunding,
                fundingAfter: next.funding,
                cost: beforeFunding - next.funding,
              }),
            ]),
          }
        }),

      assignInstructor: (staffId, agentId) =>
        set((s) => {
          const before = s.game.staff[staffId]
          const next = assignInstructor(s.game, staffId, agentId)
          const after = next.staff[staffId]

          if (
            before?.role !== 'instructor' ||
            after?.role !== 'instructor' ||
            !after.assignedAgentId ||
            before.assignedAgentId === after.assignedAgentId
          ) {
            return { game: next }
          }

          const agentName = next.agents[agentId]?.name ?? s.game.agents[agentId]?.name ?? agentId
          return {
            game: appendOperationEventDrafts(next, [
              createAgentInstructorAssignedDraft({
                week: next.week,
                staffId,
                instructorName: after.name,
                agentId,
                agentName,
                instructorSpecialty: after.instructorSpecialty,
                bonus: getInstructorBonus(after.efficiency),
              }),
            ]),
          }
        }),

      unassignInstructor: (staffId) =>
        set((s) => {
          const before = s.game.staff[staffId]
          const assignedAgentId = before?.role === 'instructor' ? before.assignedAgentId : undefined
          const assignedAgentName = assignedAgentId
            ? (s.game.agents[assignedAgentId]?.name ?? assignedAgentId)
            : undefined
          const next = unassignInstructor(s.game, staffId)
          const after = next.staff[staffId]

          if (
            before?.role !== 'instructor' ||
            !assignedAgentId ||
            after?.role !== 'instructor' ||
            after.assignedAgentId
          ) {
            return { game: next }
          }

          return {
            game: appendOperationEventDrafts(next, [
              createAgentInstructorUnassignedDraft({
                week: next.week,
                staffId,
                instructorName: before.name,
                agentId: assignedAgentId,
                agentName: assignedAgentName ?? assignedAgentId,
                instructorSpecialty: before.instructorSpecialty,
                bonus: getInstructorBonus(before.efficiency),
              }),
            ]),
          }
        }),

      reconcileAgents: (leftId, rightId) =>
        set((s) => ({ game: reconcileAgents(s.game, leftId, rightId) })),

      equipAgentItem: (agentId, slot, itemId) =>
        set((s) => ({ game: equipAgentItem(s.game, agentId, slot, itemId) })),

      unequipAgentItem: (agentId, slot) =>
        set((s) => ({ game: unequipAgentItem(s.game, agentId, slot) })),

      queueFabrication: (recipeId) => set((s) => ({ game: queueFabrication(s.game, recipeId) })),

      purchaseMarketInventory: (listingId, bundles = 1) =>
        set((s) => ({ game: purchaseMarketInventory(s.game, listingId, bundles) })),

      sellMarketInventory: (listingId, bundles = 1) =>
        set((s) => ({ game: sellMarketInventory(s.game, listingId, bundles) })),

      drawPartyCards: (count = 1) =>
        set((s) => {
          if (!s.game.partyCards) {
            return s
          }

          const rng = createSeededRng(s.game.rngState)
          const draw = drawPartyCards(s.game.partyCards, count, rng.next)

          return {
            game: {
              ...s.game,
              rngState: rng.getState(),
              partyCards: draw.nextState,
            },
          }
        }),

      playPartyCard: (cardId, targetCaseId, targetTeamId) =>
        set((s) => {
          if (!s.game.partyCards) {
            return s
          }

          const nextPartyCards = playPartyCard(s.game.partyCards, cardId, {
            weekPlayed: s.game.week,
            targetCaseId,
            targetTeamId,
          })

          return {
            game: {
              ...s.game,
              partyCards: nextPartyCards,
            },
          }
        }),

      discardPartyCard: (cardId) =>
        set((s) => {
          if (!s.game.partyCards) {
            return s
          }

          return {
            game: {
              ...s.game,
              partyCards: discardPartyCard(s.game.partyCards, cardId),
            },
          }
        }),

      setWeeklyDirective: (directiveId) =>
        set((s) => ({
          game: {
            ...s.game,
            directiveState: {
              ...s.game.directiveState,
              selectedId: directiveId,
            },
          },
        })),

      refreshMissionRouting: () =>
        set((s) => ({
          game: {
            ...s.game,
            missionRouting: recomputeMissionRouting(s.game),
          },
        })),

      evaluateMissionDeployment: (missionId, teamId) => {
        const game = get().game
        if (!game.cases[missionId] || !game.teams[teamId]) {
          return null
        }

        return evaluateDeploymentEligibility(game, missionId, teamId)
      },

      assignMissionTeam: (missionId, teamId) => {
        const routed = routeMissionToTeam(get().game, missionId, teamId)

        if (!routed.assigned) {
          set(() => ({ game: routed.state }))
          return false
        }

        set(() => ({ game: assignTeam(routed.state, missionId, teamId) }))
        return true
      },

      advanceWeek: () => set((s) => ({ game: advanceWeek(s.game) })),

      reset: () => set({ game: createStartingState() }),

      setSeed: (seed) =>
        set((s) => {
          const normalizedSeed = normalizeSeed(seed)

          return {
            game: refreshContractBoard({
              ...s.game,
              rngSeed: normalizedSeed,
              rngState: normalizedSeed,
              contracts: undefined,
            }),
          }
        }),

      updateConfig: (patch) =>
        set((s) => ({
          game: {
            ...s.game,
            config: sanitizeGameConfig(patch, s.game.config),
          },
        })),

      exportSave: () => {
        let payload = ''

        set((s) => {
          const game = appendDeveloperLogEventState(s.game, {
            type: 'save.exported',
            summary: 'Save exported',
            details: {
              kind: GAME_SAVE_KIND,
              version: GAME_SAVE_VERSION,
            },
          })
          payload = serializeGameSave(game)
          return { game }
        })

        return payload
      },

      importSave: (raw) => {
        const importedGame = loadGameSave(raw)
        let payloadKind = GAME_SAVE_KIND
        let payloadVersion = GAME_SAVE_VERSION

        try {
          const parsed = JSON.parse(raw) as Partial<{ kind: string; version: number }>
          if (typeof parsed.kind === 'string') {
            payloadKind = parsed.kind
          }
          if (typeof parsed.version === 'number' && Number.isFinite(parsed.version)) {
            payloadVersion = Math.trunc(parsed.version)
          }
        } catch {
          // `loadGameSave` already performs real validation; this metadata parse is
          // only for a compact debug record after successful import.
        }

        set({
          game: appendDeveloperLogEventState(importedGame, {
            type: 'save.imported',
            summary: 'Save imported',
            details: {
              kind: payloadKind,
              version: payloadVersion,
            },
          }),
        })
      },

      exportRun: () => get().exportSave(),

      importRun: (raw) => get().importSave(raw),

      newRunFromCurrentConfig: () =>
        set((s) => ({
          game: createRunFromCurrentConfig(s.game.config, s.game.rngSeed),
        })),
    }),
    {
      name: 'containment-protocol-game-state',
      storage: createJSONStorage(resolveGameStorage),

      // Persist all simulation-critical fields; `templates` is excluded and
      // reloaded fresh from source code on every app boot.
      partialize: ({ game }): PersistedStore => ({
        game: stripGameTemplates(game),
      }),

      // After rehydration inject live template definitions so persisted saves never
      // carry stale template data from an older version of the app code.
      merge: (persistedState, currentState) => {
        const ps = persistedState as Partial<PersistedStore>
        if (!ps.game) return currentState

        const mergedGame = hydrateGame(ps.game as Partial<GameState>, currentState.game)

        return { ...currentState, game: mergedGame }
      },

      version: GAME_STORE_VERSION,

      migrate: (persistedState: unknown, version: number): PersistedStore => {
        return migratePersistedStore(persistedState, version, createStartingState())
      },
    }
  )
)
