/**
 * SPE-1699: teams roster primary-downtime view model.
 * Centralizes `domain/sim/downtimeSlot` so page/components under `features/teams/` do not import sim directly.
 */
export {
  PLAYER_PRIMARY_DOWNTIME_MENU,
  canSelectOffBooksCourierSideWork,
  canSelectPrimaryDowntimePlan,
  formatForegoneDowntimeSummary,
  getPrimaryDowntimeLabel,
  type PlayerPrimaryDowntimeMenu,
} from '../../domain/sim/downtimeSlot'
