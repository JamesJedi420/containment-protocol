import { useGameStore } from './store/gameStore'
import { getTutorialLifecycle } from '../domain/gameStateManager'
import {
  currentTutorialDefinitions,
  getTutorialArchive,
  unavailableTutorialResult,
} from '../domain/tutorialDelivery'
import type { TutorialDeliveryCommand } from '../domain/tutorialDelivery'
import { selectTutorialGuidance } from '../domain/tutorialGuidance'
import { createTutorialRegistry } from '../domain/tutorialLifecycle'
import type { TutorialDefinition, TutorialEligibility } from '../domain/tutorialLifecycle'
import type { GameState } from '../domain/models'
import type { ScreenRouteContext } from '../domain/screenRouting'

export type TutorialReadInput<Context extends ScreenRouteContext> = Omit<
  Parameters<typeof selectTutorialGuidance<Context>>[0],
  'game' | 'definition' | 'lifecycle'
>

/** Immutable registration; all durable state/commands use the existing gameStore. */
export function createTutorialRuntime(definitions: readonly TutorialDefinition[]) {
  const registry = createTutorialRegistry(definitions)
  const current = new Map(
    currentTutorialDefinitions(registry).map((definition) => [definition.id, definition])
  )
  return Object.freeze({
    registry,
    definition: (id: string, version?: number) =>
      version === undefined ? current.get(id) : registry.get(id, version),
    archive: (isVisible: (game: GameState, definition: TutorialDefinition) => boolean) =>
      getTutorialArchive(useGameStore.getState().game, registry, isVisible),
    read: <Context extends ScreenRouteContext>(id: string, input: TutorialReadInput<Context>) => {
      const definition = current.get(id)
      if (!definition) return undefined
      const game = useGameStore.getState().game
      const lifecycle = getTutorialLifecycle(game, definition)
      if (!lifecycle) return undefined
      const guidance = selectTutorialGuidance({ ...input, game, definition, lifecycle })
      if (!guidance) return undefined
      return Object.freeze({
        guidance,
        revision: lifecycle.revision,
        run: lifecycle.run,
        recoveryNeeded: guidance.action?.available === false,
      })
    },
    dispatch: (id: string, command: TutorialDeliveryCommand, eligibility?: TutorialEligibility) => {
      const definition = current.get(id)
      return definition
        ? useGameStore.getState().dispatchTutorialCommand(definition, command, eligibility)
        : unavailableTutorialResult()
    },
  })
}
