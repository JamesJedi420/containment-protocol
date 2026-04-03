export type SectorTone = 'stable' | 'warning' | 'critical'

export interface TelemetrySignal {
  label: string
  value: string
  note: string
}

export interface Sector {
  code: string
  name: string
  status: string
  tone: SectorTone
  detail: string
  responseLead: string
  routeStatus: string
  recommendedAction: string
}

export interface ProtocolStep {
  step: string
  detail: string
}

export interface TimelineEntry {
  stamp: string
  title: string
  detail: string
  owner: string
}

export const telemetry: TelemetrySignal[] = [
  {
    label: 'Seal integrity',
    value: '97.2%',
    note: 'Primary shutters are holding. Thermal bleed remains below tolerance.',
  },
  {
    label: 'Responder cycle',
    value: '06:14',
    note: 'Average time between corridor sweeps after the breach alarm.',
  },
  {
    label: 'Civilian routing',
    value: '3 lanes',
    note: 'Fallback exits remain open through the west transfer galleries.',
  },
]

export const sectors: Sector[] = [
  {
    code: 'A-03',
    name: 'Floodgate Spine',
    status: 'Stable',
    tone: 'stable',
    detail: 'Coolant pressure is back within nominal range after the first clamp cycle.',
    responseLead: 'Chief Sable Nwosu',
    routeStatus: 'North catwalk remains clear for engineering traffic.',
    recommendedAction: 'Leave the sector on passive observation and redirect spare crew south.',
  },
  {
    code: 'C-12',
    name: 'Glass Archive',
    status: 'Escalating',
    tone: 'warning',
    detail: 'Acoustic distortion keeps reactivating archival shutters during clearance checks.',
    responseLead: 'Archivist Teren Vale',
    routeStatus: 'Civilian movement is limited to escort lanes only.',
    recommendedAction: 'Deploy dampening rigs before any manual shutter override.',
  },
  {
    code: 'D-09',
    name: 'Transit Bloom',
    status: 'Blackout',
    tone: 'critical',
    detail: 'Power loss persists. Manual beacons are guiding teams through the lower tunnel.',
    responseLead: 'Marshal Inez Rook',
    routeStatus: 'Lower tunnel is restricted to recovery crews.',
    recommendedAction: 'Restore hardline power before reopening the vertical lift corridor.',
  },
  {
    code: 'F-18',
    name: 'Signal Orchard',
    status: 'Contained',
    tone: 'stable',
    detail: 'Relay towers are fenced off and feeding clean telemetry to command.',
    responseLead: 'Analyst Oren Pike',
    routeStatus: 'Observation deck is open for relay technicians.',
    recommendedAction: 'Keep a slim crew on relay watch and preserve bandwidth for alerts.',
  },
]

export const protocolSteps: ProtocolStep[] = [
  {
    step: 'Quiet the corridor',
    detail: 'Mute nonessential systems so operators can isolate the original breach signature.',
  },
  {
    step: 'Lock the hinge rooms',
    detail: 'Seal connector spaces first. It slows cascade failures without trapping responders.',
  },
  {
    step: 'Redirect the crowd',
    detail: 'Push evac traffic into lit routes with visible staff before panic reopens hot zones.',
  },
  {
    step: 'Rebuild trust in public',
    detail: 'Status boards update every ninety seconds so people are not guessing in the dark.',
  },
]

export const timeline: TimelineEntry[] = [
  {
    stamp: '00:03',
    title: 'Initial rupture',
    detail: 'A pressure bloom cut across the archive wing and tripped the outer shutters.',
    owner: 'Outer ring sensors',
  },
  {
    stamp: '00:11',
    title: 'Manual relay restored',
    detail: 'Field crews recovered voice comms after the automated bus started looping.',
    owner: 'Relay team orchard',
  },
  {
    stamp: '00:24',
    title: 'Containment majority',
    detail: 'Most sectors returned to controlled airflow while crews staged for recovery.',
    owner: 'Central command',
  },
]

export const toneLabels: Record<SectorTone, string> = {
  stable: 'Stable',
  warning: 'Escalating',
  critical: 'Blackout',
}

export function findSectorByCode(code: string) {
  return sectors.find((sector) => sector.code.toLowerCase() === code.toLowerCase())
}
