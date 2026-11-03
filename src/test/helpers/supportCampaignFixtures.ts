import { createRunExportPayload } from '../../app/store/runTransfer'
import { createStartingState } from '../../data/startingState'
import type { GameState } from '../../domain/models'
import { assignTeam } from '../../domain/sim/assign'

// SPE-94 and SPE-38 inputs, respectively. These are imported scenarios, not
// evidence that a fresh player has reached either situation through controls.
export const MAINTENANCE_FIXTURE_ITEMS = [
  'medkits',
  'ward_seals',
  'silver_rounds',
  'signal_jammers',
  'emf_sensors',
] as const
export const SUPPORT_FIXTURE_CASE_IDS = ['case-001', 'case-002'] as const

export function createMaintenanceCampaignFixture(): GameState {
  const game = createStartingState()
  for (const id of MAINTENANCE_FIXTURE_ITEMS) game.inventory[id] = 1
  game.damagedEquipmentQueue = [...MAINTENANCE_FIXTURE_ITEMS]
  game.agency!.maintenanceSpecialistsAvailable = 2
  return game
}

export function createSupportShortfallCampaignFixture(): GameState {
  let game = createStartingState()
  game.agency!.supportAvailable = 1
  for (const id of SUPPORT_FIXTURE_CASE_IDS) {
    game.cases[id] = {
      ...game.cases[id],
      mode: 'threshold',
      status: 'open',
      durationWeeks: 1,
      weeksRemaining: undefined,
      difficulty: { combat: 1, investigation: 1, utility: 1, social: 1 },
      weights: { combat: 1, investigation: 1, utility: 1, social: 1 },
      requiredRoles: [],
      requiredTags: [],
      preferredTags: [],
    }
  }
  game = assignTeam(game, SUPPORT_FIXTURE_CASE_IDS[0], 't_nightwatch')
  return assignTeam(game, SUPPORT_FIXTURE_CASE_IDS[1], 't_greentape')
}

export function exportSupportCampaignFixture(game: GameState): string {
  return JSON.stringify({
    ...createRunExportPayload(game),
    // Keep artifact identity stable; this metadata does not drive simulation.
    exportedAt: '2026-11-02T00:00:00.000Z',
  })
}
