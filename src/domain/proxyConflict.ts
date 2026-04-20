// Proxy-conflict projection for Threshold Court
import type { FactionState } from './factions'
import { hasDistortionState } from './shared/distortion'

export interface ProxyConflictOutcome {
  effect: 'proxy_interference' | 'none'
  explanation: string
}

// Deterministic proxy-conflict: if distortion or agendaPressure is high, project interference
export function evaluateThresholdCourtProxyConflict(faction: FactionState): ProxyConflictOutcome {
  if (faction.id !== 'threshold_court') return { effect: 'none', explanation: '' }
  if (
    hasDistortionState(faction.distortion, 'fragmented') ||
    hasDistortionState(faction.distortion, 'misleading') ||
    faction.agendaPressure > 60
  ) {
    return {
      effect: 'proxy_interference',
      explanation: 'Proxy interference detected: local intermediary or omen distorts outcome.'
    }
  }
  return { effect: 'none', explanation: '' }
}
