import type { GameState } from './models'

export interface AgencyProgressionUnlockDefinition {
  id: string
  label: string
  description: string
  majorIncidentTemplateIds: string[]
  contractTemplateIds: string[]
}

const AGENCY_PROGRESSION_UNLOCK_DEFINITIONS: Record<string, AgencyProgressionUnlockDefinition> = {
  'containment-liturgy': {
    id: 'containment-liturgy',
    label: 'Containment Liturgy',
    description:
      'Recovered liturgical containment grammar opens deeper occult-response operations.',
    majorIncidentTemplateIds: ['occult-007'],
    contractTemplateIds: ['institutions-liturgy-expedition'],
  },
  'fracture-anchor-protocol': {
    id: 'fracture-anchor-protocol',
    label: 'Fracture Anchor Protocol',
    description:
      'Anchor-restoration doctrine enables higher-order breach stabilization deployments.',
    majorIncidentTemplateIds: ['anomaly-raid-001'],
    contractTemplateIds: ['oversight-anchor-restoration'],
  },
  'counter-cult-dossier': {
    id: 'counter-cult-dossier',
    label: 'Counter-Cult Dossier',
    description:
      'Deeper counter-network intelligence unlocks deniable strike windows against ritual infrastructure.',
    majorIncidentTemplateIds: ['extraction-raid-001'],
    contractTemplateIds: ['black-budget-cult-burn'],
  },
  'stormgrid-telemetry': {
    id: 'stormgrid-telemetry',
    label: 'Stormgrid Telemetry',
    description:
      'Telemetry from anomaly storms reveals new relay-collapse and psionic interception windows.',
    majorIncidentTemplateIds: ['cyber-raid-001', 'psi-005'],
    contractTemplateIds: ['black-budget-stormgrid-burn'],
  },
  'blacksite-retrofit': {
    id: 'blacksite-retrofit',
    label: 'Blacksite Retrofit',
    description:
      'Recovered retrofit plans open deeper containment-facility salvage and evidence-recovery operations.',
    majorIncidentTemplateIds: ['ops-009'],
    contractTemplateIds: ['oversight-blacksite-retrofit'],
  },
}

export function getAgencyProgressionUnlockDefinition(unlockId: string) {
  return AGENCY_PROGRESSION_UNLOCK_DEFINITIONS[unlockId]
}

export function getAgencyProgressionUnlockLabel(unlockId: string) {
  return getAgencyProgressionUnlockDefinition(unlockId)?.label ?? unlockId
}

export function getAgencyProgressionUnlockIds(game: Pick<GameState, 'agency'>) {
  return [
    ...new Set(
      (game.agency?.progressionUnlockIds ?? []).filter(
        (unlockId): unlockId is string => typeof unlockId === 'string' && unlockId.length > 0
      )
    ),
  ]
}

export function hasAgencyProgressionUnlock(
  game: Pick<GameState, 'agency'>,
  unlockId: string
) {
  return getAgencyProgressionUnlockIds(game).includes(unlockId)
}

export function getAgencyProgressionPressureTemplateIds(
  game: Pick<GameState, 'agency'>,
  baseTemplateIds: readonly string[] = []
) {
  return [
    ...new Set([
      ...baseTemplateIds,
      ...getAgencyProgressionUnlockIds(game).flatMap(
        (unlockId) =>
          getAgencyProgressionUnlockDefinition(unlockId)?.majorIncidentTemplateIds ?? []
      ),
    ]),
  ]
}
