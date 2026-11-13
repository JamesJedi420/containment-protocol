import type { GameState } from '../../domain/models'
import {
  parseFacilityProtectedRemoteWorkCells,
  projectExplainableProtectedRemoteWork,
  type ProtectedRemoteWorkExplainability,
} from '../../domain/protectedRemoteWorkCell'
import {
  PROTECTED_LAB,
  buildProtectedLabFacts,
  isAuthoredProtectedLabWork,
  parseProtectedRemoteWorkStation,
} from '../../domain/protectedRemoteWorkLab'

export type ProtectedRemoteWorkGameplayView = Readonly<{
  station: ReturnType<typeof parseProtectedRemoteWorkStation>
  canRequest: boolean
  requestOperationKey: string
  operators: readonly { id: string; name: string; qualified: boolean; available: boolean }[]
  rows: readonly (ProtectedRemoteWorkExplainability & {
    readonly canAbort: boolean
    readonly labAction: 'authorize' | 'begin' | 'resume' | 'complete' | null
    readonly isLabWork: boolean
    readonly operationKey: string
  })[]
}>

/** Only durable owner-supplied work is displayed; absent readiness is never fabricated. */
export function projectProtectedRemoteWorkGameplayView(
  game: GameState
): ProtectedRemoteWorkGameplayView {
  const works = parseFacilityProtectedRemoteWorkCells(game.facilityProtectedRemoteWorkCells)
  let requestSequence = Object.values(works ?? {}).filter(isAuthoredProtectedLabWork).length
  let requestOperationKey = `agency-lab-request:${game.week}:${requestSequence}`
  while (works && Object.hasOwn(works, `clinical-observation:${requestOperationKey}`)) {
    requestSequence += 1
    requestOperationKey = `agency-lab-request:${game.week}:${requestSequence}`
  }
  return {
    station: parseProtectedRemoteWorkStation(game.facilityProtectedRemoteWorkStation),
    requestOperationKey,
    canRequest: !Object.values(works ?? {}).some(
      (work) =>
        work.stationId === PROTECTED_LAB.stationId &&
        ['requested', 'authorized', 'in_progress', 'held', 'blocked'].includes(work.stage)
    ),
    operators: Object.keys(game.agents)
      .sort()
      .map((id) => {
        const agent = game.agents[id]!
        const facts = buildProtectedLabFacts(game, id, `clinical-observation:w${game.week}`)
        return {
          id,
          name: agent.name,
          qualified: facts.gates.operatorQualified,
          available: facts.gates.operatorAvailable,
        }
      }),
    rows: Object.keys(works ?? {})
      .sort()
      .map((id) => {
        const work = works![id]!
        return {
          ...projectExplainableProtectedRemoteWork(work),
          canAbort: ['requested', 'blocked', 'authorized', 'held'].includes(work.stage),
          isLabWork: isAuthoredProtectedLabWork(work),
          operationKey: `agency:${work.workId}:${work.stage}:${work.appliedOperationKeys.length}`,
          labAction: isAuthoredProtectedLabWork(work)
            ? work.stage === 'requested' || work.stage === 'blocked'
              ? 'authorize'
              : work.stage === 'authorized'
                ? 'begin'
                : work.stage === 'held'
                  ? 'resume'
                  : work.stage === 'in_progress'
                    ? 'complete'
                    : null
            : null,
        }
      }),
  }
}
