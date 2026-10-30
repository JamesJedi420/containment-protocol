import { createTutorialRuntime } from './tutorialRuntime'
import { useGameStore } from './store/gameStore'
import { AGENCY_ESTABLISHMENT_TUTORIAL } from '../domain/agencyEstablishmentTutorial'
import { buildAgencyEstablishmentProjection } from '../domain/agencyEstablishmentProjection'
import { getTutorialLifecycle } from '../domain/gameStateManager'
import type { TutorialDispatchResult } from '../domain/tutorialDelivery'
import { unavailableTutorialResult } from '../domain/tutorialDelivery'
import type { TutorialCommandType } from '../domain/tutorialLifecycle'

export const agencyEstablishmentRuntime = createTutorialRuntime([AGENCY_ESTABLISHMENT_TUTORIAL])

export function dispatchAgencyEstablishment(
  type: TutorialCommandType,
  revision: number,
  stepId?: string
) {
  return agencyEstablishmentRuntime.dispatch(AGENCY_ESTABLISHMENT_TUTORIAL.id, {
    type,
    expectedRevision: revision,
    ...(stepId === undefined ? {} : { stepId }),
  })
}

/** Explicit user skip, using ordinary step-skip transitions; never bootstrap/routing. */
export function skipAgencyEstablishment(revision: number): TutorialDispatchResult {
  const initial = getTutorialLifecycle(useGameStore.getState().game, AGENCY_ESTABLISHMENT_TUTORIAL)
  if (!initial) return unavailableTutorialResult()
  let result =
    initial.status === 'not_started'
      ? dispatchAgencyEstablishment('start', revision)
      : dispatchAgencyEstablishment(
          'skip',
          revision,
          AGENCY_ESTABLISHMENT_TUTORIAL.steps[initial.cursor].id
        )
  for (let index = 0; index < AGENCY_ESTABLISHMENT_TUTORIAL.steps.length; index++) {
    const state = getTutorialLifecycle(useGameStore.getState().game, AGENCY_ESTABLISHMENT_TUTORIAL)
    if (!state || state.status !== 'active' || !result.lifecycleChanged) break
    result = dispatchAgencyEstablishment(
      'skip',
      state.revision,
      AGENCY_ESTABLISHMENT_TUTORIAL.steps[state.cursor].id
    )
    if (!result.lifecycleChanged) break
  }
  return result
}

/** Only newly emitted terminal progression can produce the semantic handoff. */
export function agencyEstablishmentHandoff(result: TutorialDispatchResult) {
  const skipped = result.events.find(
    (event) => event.kind === 'skipped' && event.stepId === undefined
  )
  const completed = result.completion
  const identity = completed ?? skipped
  if (
    !result.lifecycleChanged ||
    !identity ||
    identity.tutorialId !== AGENCY_ESTABLISHMENT_TUTORIAL.id ||
    identity.definitionVersion !== AGENCY_ESTABLISHMENT_TUTORIAL.version
  )
    return undefined
  return Object.freeze({
    token: buildAgencyEstablishmentProjection(useGameStore.getState().game).activation
      .nextStepToken,
    tutorialId: identity.tutorialId,
    definitionVersion: identity.definitionVersion,
    run: identity.run,
    revision: identity.revision,
    outcome: completed ? ('completed' as const) : ('skipped' as const),
  })
}

export type AgencyEstablishmentHandoff = NonNullable<ReturnType<typeof agencyEstablishmentHandoff>>
