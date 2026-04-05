import { buildMissionResult, type MissionResultInput } from '../missionResults'
import type { GameState } from '../models'
import { getAverageTeamFatigue } from './fatiguePipeline'
import type { SpawnedCaseRecord } from './spawn'

type MissionResult = ReturnType<typeof buildMissionResult>
type MissionTeamUsage = MissionResultInput['teamsUsed'][number]
type MissionFatigueChange = NonNullable<MissionResultInput['fatigueChanges']>[number]
type MissionSpawnedConsequence = NonNullable<MissionResultInput['spawnedConsequences']>[number]

interface MissionFinalizationInput {
  sourceState: Pick<GameState, 'teams' | 'agents'>
  nextState: Pick<GameState, 'teams' | 'agents' | 'cases'>
  spawnedCases: SpawnedCaseRecord[]
  missionResultDraftByCaseId: Partial<Record<string, MissionResultInput>>
  activeTeamStressModifiers: Record<string, number>
}

function buildFollowUpConsequence(
  spawned: SpawnedCaseRecord,
  nextState: Pick<GameState, 'cases'>
): MissionSpawnedConsequence {
  const spawnedCase = nextState.cases[spawned.caseId]

  return {
    type: 'follow_up_case',
    caseId: spawned.caseId,
    caseTitle: spawnedCase?.title,
    stage: spawnedCase?.stage,
    trigger: spawned.trigger,
    detail: `Spawned follow-up case ${spawnedCase?.title ?? spawned.caseId}${spawnedCase ? ` at stage ${spawnedCase.stage}` : ''}.`,
  }
}

function buildMissionFatigueChanges(
  input: Pick<MissionFinalizationInput, 'sourceState' | 'nextState' | 'activeTeamStressModifiers'>,
  teamsUsed: MissionTeamUsage[]
): MissionFatigueChange[] {
  return teamsUsed.flatMap((team) => {
    const sourceTeam = input.sourceState.teams[team.teamId]
    const nextTeam = input.nextState.teams[team.teamId] ?? sourceTeam

    if (!sourceTeam || !nextTeam) {
      return []
    }

    const before = getAverageTeamFatigue(sourceTeam, input.sourceState.agents)
    const after = getAverageTeamFatigue(nextTeam, input.nextState.agents)

    return [
      {
        teamId: team.teamId,
        teamName: team.teamName ?? nextTeam.name,
        before,
        after,
        delta: after - before,
        stressModifier: Number((input.activeTeamStressModifiers[team.teamId] ?? 0).toFixed(2)),
      },
    ]
  })
}

function buildFollowUpConsequencesForCase(
  input: Pick<MissionFinalizationInput, 'spawnedCases' | 'nextState'>,
  caseId: string
): MissionSpawnedConsequence[] {
  return input.spawnedCases
    .filter((spawned) => spawned.parentCaseId === caseId)
    .map((spawned) => buildFollowUpConsequence(spawned, input.nextState))
}

export function finalizeMissionResultsFromDrafts(
  input: MissionFinalizationInput
): Partial<Record<string, MissionResult>> {
  return Object.fromEntries(
    Object.entries(input.missionResultDraftByCaseId).flatMap(([caseId, draft]) => {
      if (!draft) {
        return []
      }

      const spawnedConsequences = [
        ...(draft.spawnedConsequences ?? []),
        ...buildFollowUpConsequencesForCase(input, caseId),
      ]

      return [
        [
          caseId,
          buildMissionResult({
            ...draft,
            fatigueChanges: buildMissionFatigueChanges(input, draft.teamsUsed),
            spawnedConsequences,
          }),
        ],
      ] as const
    })
  )
}
