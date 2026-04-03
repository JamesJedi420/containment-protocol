import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import {
  appendOperationEventDrafts,
  createAgentInstructorAssignedDraft,
  createAgentInstructorUnassignedDraft,
  createSystemAcademyUpgradedDraft,
} from '../../domain/events'
import {
  type GameConfig,
  type GameState,
  type Id,
  type StatKey,
  type WeeklyDirectiveId,
} from '../../domain/models'
import { createSeededRng, normalizeSeed } from '../../domain/math'
import type { EquipmentSlotKind } from '../../domain/equipment'
import {
  discardPartyCard,
  drawPartyCards,
  playPartyCard,
} from '../../domain/partyCards/engine'
import { createStartingState } from '../../data/startingState'
import { advanceWeek } from '../../domain/sim/advanceWeek'
import { assignTeam, unassignTeam } from '../../domain/sim/assign'
import { queueFabrication } from '../../domain/sim/production'
import { purchaseMarketInventory, sellMarketInventory } from '../../domain/sim/market'
import { hireCandidate } from '../../domain/sim/hire'
import { equipAgentItem, unequipAgentItem } from '../../domain/sim/equipment'
import {
  createTeam,
  deleteEmptyTeam,
  moveAgentBetweenTeams,
  renameTeam,
  setTeamLeader,
} from '../../domain/sim/teamManagement'
import { cancelTraining, queueTeamTraining, queueTraining, spendSkillPoint } from '../../domain/sim/training'
import { upgradeAcademy } from '../../domain/sim/academyUpgrade'
import { assignInstructor, getInstructorBonus, unassignInstructor } from '../../domain/sim/instructorAssignment'
import { reconcileAgents } from '../../domain/sim/reconciliation'
import {
  createRunFromCurrentConfig,
  GAME_STORE_VERSION,
  hydrateGame,
  migratePersistedStore,
  parseRunExport,
  sanitizeGameConfig,
  serializeRunExport,
  stripGameTemplates,
  type PersistedStore,
} from './runTransfer'

interface GameStore {
  game: GameState
  assign: (caseId: Id, teamId: Id) => void
  unassign: (caseId: Id, teamId?: Id) => void
  hireCandidate: (candidateId: Id) => void
  createTeam: (name: string, seedAgentId: Id) => void
  renameTeam: (teamId: Id, name: string) => void
  setTeamLeader: (teamId: Id, leaderId: Id | null) => void
  moveAgentBetweenTeams: (agentId: Id, targetTeamId?: Id | null) => void
  deleteEmptyTeam: (teamId: Id) => void
  queueTraining: (agentId: Id, trainingId: string) => void
  queueTeamTraining: (teamId: Id, trainingId: string) => void
  cancelTraining: (agentId: Id) => void
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
  advanceWeek: () => void
  setSeed: (seed: number) => void
  updateConfig: (patch: Partial<GameConfig>) => void
  exportRun: () => string
  importRun: (raw: string) => void
  newRunFromCurrentConfig: () => void
  reset: () => void
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

      assign: (caseId, teamId) =>
        set((s) => ({ game: assignTeam(s.game, caseId, teamId) })),

      unassign: (caseId, teamId) =>
        set((s) => ({ game: unassignTeam(s.game, caseId, teamId) })),

      hireCandidate: (candidateId) =>
        set((s) => ({ game: hireCandidate(s.game, candidateId) })),

      createTeam: (name, seedAgentId) =>
        set((s) => ({ game: createTeam(s.game, name, seedAgentId) })),

      renameTeam: (teamId, name) =>
        set((s) => ({ game: renameTeam(s.game, teamId, name) })),

      setTeamLeader: (teamId, leaderId) =>
        set((s) => ({ game: setTeamLeader(s.game, teamId, leaderId) })),

      moveAgentBetweenTeams: (agentId, targetTeamId) =>
        set((s) => ({ game: moveAgentBetweenTeams(s.game, agentId, targetTeamId) })),

      deleteEmptyTeam: (teamId) =>
        set((s) => ({ game: deleteEmptyTeam(s.game, teamId) })),

      queueTraining: (agentId, trainingId) =>
        set((s) => ({ game: queueTraining(s.game, agentId, trainingId) })),

      queueTeamTraining: (teamId, trainingId) =>
        set((s) => ({ game: queueTeamTraining(s.game, teamId, trainingId) })),

      cancelTraining: (agentId) =>
        set((s) => ({ game: cancelTraining(s.game, agentId) })),

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
          const assignedAgentName = assignedAgentId ? s.game.agents[assignedAgentId]?.name ?? assignedAgentId : undefined
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

      queueFabrication: (recipeId) =>
        set((s) => ({ game: queueFabrication(s.game, recipeId) })),

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

      advanceWeek: () => set((s) => ({ game: advanceWeek(s.game) })),

      reset: () => set({ game: createStartingState() }),

      setSeed: (seed) =>
        set((s) => {
          const normalizedSeed = normalizeSeed(seed)

          return {
            game: {
              ...s.game,
              rngSeed: normalizedSeed,
              rngState: normalizedSeed,
            },
          }
        }),

      updateConfig: (patch) =>
        set((s) => ({
          game: {
            ...s.game,
            config: sanitizeGameConfig(patch, s.game.config),
          },
        })),

      exportRun: () => serializeRunExport(get().game),

      importRun: (raw) => {
        const importedGame = parseRunExport(raw)
        set({ game: importedGame })
      },

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
