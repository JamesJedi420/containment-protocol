// Protocol logic for etiquette-driven anomaly polity (Threshold Court)
import type { FactionState } from './factions'

export interface ProtocolContactContext {
  actorStanding: number // Standing of the contacting party with the polity
  actorRole: string // e.g., 'envoy', 'operative', 'analyst'
  protocolObserved: boolean // Did the actor use correct etiquette?
  correctNaming: boolean // Did the actor use correct naming/title?
  acknowledgedRole: boolean // Did the actor acknowledge court role/rank?
}

export interface ProtocolContactOutcome {
  outcome: 'favor' | 'partial' | 'restricted' | 'offense'
  reliabilityDelta: number
  distortionDelta: number
  explanation: string
}

// Deterministic contact evaluator for Threshold Court
export function evaluateThresholdCourtContact(
  faction: FactionState,
  context: ProtocolContactContext
): ProtocolContactOutcome {
  // Etiquette logic: correct protocol, naming, and role acknowledgment
  const etiquetteScore =
    (context.protocolObserved ? 1 : 0) +
    (context.correctNaming ? 1 : 0) +
    (context.acknowledgedRole ? 1 : 0)

  // Favor if all correct, partial if 2/3, restricted if 1/3, offense if 0
  if (etiquetteScore === 3) {
    return {
      outcome: 'favor',
      reliabilityDelta: +8,
      distortionDelta: -6,
      explanation: 'Protocol correctly observed; favor granted.'
    }
  } else if (etiquetteScore === 2) {
    return {
      outcome: 'partial',
      reliabilityDelta: +2,
      distortionDelta: 0,
      explanation: 'Protocol mostly correct; partial access.'
    }
  } else if (etiquetteScore === 1) {
    return {
      outcome: 'restricted',
      reliabilityDelta: -4,
      distortionDelta: +4,
      explanation: 'Protocol misread; restricted cooperation.'
    }
  } else {
    return {
      outcome: 'offense',
      reliabilityDelta: -10,
      distortionDelta: +10,
      explanation: 'Symbolic offense triggered; cooperation withdrawn.'
    }
  }
}
