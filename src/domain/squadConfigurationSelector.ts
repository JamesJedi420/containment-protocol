// Squad configuration summary selector (SPE-1304)
// Pure derivation from GameState — no side effects, no RNG.
import type { GameState } from './models'
import { buildSquadConfigurationSummary, type SquadConfigurationSummary } from './squadConfigurationSummary'
import { getTeamMemberIds } from './teamSimulation'

/**
 * Derives a SquadConfigurationSummary for a given team from GameState.
 * Returns null when squad metadata is absent (clean no-config fallback).
 *
 * Slot data is derived from team.agentIds and game.agents — no separate
 * slot-persistence field is required.
 */
export function selectSquadConfigurationSummary(
  game: GameState,
  teamId: string
): SquadConfigurationSummary | null {
  const metadata = game.squadMetadata?.[teamId]
  if (!metadata) return null

  const team = game.teams[teamId]
  if (!team) return null

  const memberIds = getTeamMemberIds(team)
  const slots = memberIds.map((agentId, index) => ({
    slotId: agentId,
    role: game.agents[agentId]?.role ?? 'operative',
    occupantId: agentId,
    order: index,
  }))

  const assignment = game.squadKitAssignments?.[teamId] ?? null
  const kitTemplatesById: Record<string, import('./squadKitTemplate').SquadKitTemplate> =
    game.squadKitTemplates ?? {}
  const squadItemTags: readonly string[] = team?.tags ?? []

  const result = buildSquadConfigurationSummary({
    metadata,
    slots,
    assignment,
    kitTemplatesById,
    squadItemTags,
  })

  if (result.ok) {
    return result.summary
  }

  const fallbackResult = buildSquadConfigurationSummary({
    metadata,
    slots,
    assignment: null,
    kitTemplatesById,
    squadItemTags,
  })

  return fallbackResult.ok ? fallbackResult.summary : null
}
