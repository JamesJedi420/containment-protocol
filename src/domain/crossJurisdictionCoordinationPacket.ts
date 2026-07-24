/**
 * SPE-2702 / SPE-39: bounded cross-jurisdiction coordination packets on distant reappearance.
 *
 * Read-time projection from SPE-854 archive-signature intake + case regionTags —
 * no new GameState persistence.
 */

import type {
  InformationIntakeReportRecord,
  InformationIntakeReportsMap,
} from './informationIntakeReport'
import { resolveMissionIntakeTopicKeys } from './missionIntakeInformationRouting'
import type { CaseInstance } from './models'

export type SignatureMatchBand = 'none' | 'weak' | 'tentative' | 'strong'

export type CrossJurisdictionPacketKind = 'liaison_coordination' | 'shared_signature_alert'

export interface DistantReappearanceSignal {
  readonly intakeReportId: string
  readonly topicRef: string
  readonly signatureMatchBand: Exclude<SignatureMatchBand, 'none' | 'weak'>
  readonly priorJurisdictionRef: string
  readonly currentJurisdictionRef: string
  readonly priorSiteLabel?: string
  readonly currentSiteLabel?: string
}

export interface CrossJurisdictionCoordinationPacket {
  readonly packetId: string
  readonly kind: CrossJurisdictionPacketKind
  readonly topicRef: string
  readonly intakeReportId: string
  readonly signatureMatchBand: DistantReappearanceSignal['signatureMatchBand']
  readonly priorJurisdictionRef: string
  readonly currentJurisdictionRef: string
  readonly summary: string
}

export interface CrossJurisdictionCoordinationSummary {
  readonly packetCount: number
  readonly packets: readonly CrossJurisdictionCoordinationPacket[]
  readonly summary: string
}

const WEAK_CONFIDENCE_CEILING = 0.25

function normalizeToken(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().toLowerCase()
}

/** Resolve SPE-854 archive-signature match strength for coordination gating. */
export function resolveSignatureMatchBand(
  report: Pick<
    InformationIntakeReportRecord,
    'initialSourceClass' | 'confidenceScore' | 'verificationStatus' | 'retainedDespiteContradiction'
  >
): SignatureMatchBand {
  if (report.initialSourceClass !== 'archive_signature') {
    return 'none'
  }

  if (
    report.verificationStatus === 'verified' ||
    report.verificationStatus === 'escalated_confidence'
  ) {
    return 'strong'
  }

  if (
    report.verificationStatus === 'partially_corroborated' ||
    report.retainedDespiteContradiction ||
    report.confidenceScore >= WEAK_CONFIDENCE_CEILING
  ) {
    return 'tentative'
  }

  return 'weak'
}

/** True when prior and current jurisdiction refs are both set and differ. */
export function isDistantJurisdiction(priorJurisdictionRef: string, currentJurisdictionRef: string): boolean {
  const prior = normalizeToken(priorJurisdictionRef)
  const current = normalizeToken(currentJurisdictionRef)
  return prior.length > 0 && current.length > 0 && prior !== current
}

function resolvePacketKind(
  band: DistantReappearanceSignal['signatureMatchBand']
): CrossJurisdictionPacketKind {
  return band === 'strong' ? 'liaison_coordination' : 'shared_signature_alert'
}

function formatPacketSummary(input: {
  kind: CrossJurisdictionPacketKind
  topicRef: string
  signatureMatchBand: DistantReappearanceSignal['signatureMatchBand']
  priorJurisdictionRef: string
  currentJurisdictionRef: string
  priorSiteLabel?: string
  currentSiteLabel?: string
}): string {
  const priorLabel = input.priorSiteLabel?.trim()
    ? `${input.priorSiteLabel.trim()} (${input.priorJurisdictionRef})`
    : input.priorJurisdictionRef
  const currentLabel = input.currentSiteLabel?.trim()
    ? `${input.currentSiteLabel.trim()} (${input.currentJurisdictionRef})`
    : input.currentJurisdictionRef
  const kindLabel =
    input.kind === 'liaison_coordination' ? 'Liaison coordination packet' : 'Shared signature alert'

  return (
    `${kindLabel}: archive signature (${input.signatureMatchBand}) on ${input.topicRef} ` +
    `reappeared across jurisdictions (${priorLabel} → ${currentLabel}).`
  )
}

/**
 * Build one bounded coordination packet from a distant-reappearance signal.
 * Returns null when the signal is not distant (defensive; compose already filters).
 */
export function buildCrossJurisdictionCoordinationPacket(
  signal: DistantReappearanceSignal
): CrossJurisdictionCoordinationPacket | null {
  if (!isDistantJurisdiction(signal.priorJurisdictionRef, signal.currentJurisdictionRef)) {
    return null
  }

  const kind = resolvePacketKind(signal.signatureMatchBand)
  const priorJurisdictionRef = normalizeToken(signal.priorJurisdictionRef)
  const currentJurisdictionRef = normalizeToken(signal.currentJurisdictionRef)
  const topicRef = normalizeToken(signal.topicRef) || signal.topicRef
  const packetId = [
    'coord',
    signal.intakeReportId,
    priorJurisdictionRef,
    currentJurisdictionRef,
  ].join(':')

  return {
    packetId,
    kind,
    topicRef,
    intakeReportId: signal.intakeReportId,
    signatureMatchBand: signal.signatureMatchBand,
    priorJurisdictionRef,
    currentJurisdictionRef,
    summary: formatPacketSummary({
      kind,
      topicRef,
      signatureMatchBand: signal.signatureMatchBand,
      priorJurisdictionRef,
      currentJurisdictionRef,
      priorSiteLabel: signal.priorSiteLabel,
      currentSiteLabel: signal.currentSiteLabel,
    }),
  }
}

type CaseRegionSlice = Pick<CaseInstance, 'id' | 'tags' | 'regionTag' | 'status' | 'title'>

function listCasesLinkedToTopic(
  cases: Record<string, CaseRegionSlice> | undefined,
  topicRef: string
): CaseRegionSlice[] {
  if (!cases) {
    return []
  }

  const topic = normalizeToken(topicRef)
  if (!topic) {
    return []
  }

  const linked: CaseRegionSlice[] = []
  for (const currentCase of Object.values(cases)) {
    const keys = resolveMissionIntakeTopicKeys(currentCase)
    if (keys.includes(topic)) {
      linked.push(currentCase)
    }
  }

  return linked.sort((left, right) => left.id.localeCompare(right.id))
}

function pickJurisdictionPair(
  linkedCases: readonly CaseRegionSlice[]
): {
  priorJurisdictionRef: string
  currentJurisdictionRef: string
  priorSiteLabel?: string
  currentSiteLabel?: string
} | null {
  const resolvedWithRegion = linkedCases.filter(
    (currentCase) => currentCase.status === 'resolved' && normalizeToken(currentCase.regionTag ?? '')
  )
  const openWithRegion = linkedCases.filter(
    (currentCase) => currentCase.status !== 'resolved' && normalizeToken(currentCase.regionTag ?? '')
  )

  for (const priorCase of resolvedWithRegion) {
    for (const currentCase of openWithRegion) {
      const priorJurisdictionRef = normalizeToken(priorCase.regionTag ?? '')
      const currentJurisdictionRef = normalizeToken(currentCase.regionTag ?? '')
      if (!isDistantJurisdiction(priorJurisdictionRef, currentJurisdictionRef)) {
        continue
      }

      return {
        priorJurisdictionRef,
        currentJurisdictionRef,
        priorSiteLabel: priorCase.title,
        currentSiteLabel: currentCase.title,
      }
    }
  }

  const uniqueRegions = [
    ...new Set(
      linkedCases
        .map((currentCase) => normalizeToken(currentCase.regionTag ?? ''))
        .filter((region) => region.length > 0)
    ),
  ].sort((left, right) => left.localeCompare(right))

  if (uniqueRegions.length < 2) {
    return null
  }

  const priorJurisdictionRef = uniqueRegions[0]
  const currentJurisdictionRef = uniqueRegions[1]
  const priorCase = linkedCases.find(
    (currentCase) => normalizeToken(currentCase.regionTag ?? '') === priorJurisdictionRef
  )
  const currentCase = linkedCases.find(
    (currentCase) => normalizeToken(currentCase.regionTag ?? '') === currentJurisdictionRef
  )

  return {
    priorJurisdictionRef,
    currentJurisdictionRef,
    priorSiteLabel: priorCase?.title,
    currentSiteLabel: currentCase?.title,
  }
}

/** Compose distant-reappearance signals from intake archive signatures + case region tags. */
export function composeDistantReappearanceSignals(input: {
  reports: InformationIntakeReportsMap | null | undefined
  cases: Record<string, CaseRegionSlice> | null | undefined
}): DistantReappearanceSignal[] {
  const reports = input.reports ?? {}
  const cases = input.cases ?? {}
  const signals: DistantReappearanceSignal[] = []

  const reportList = Object.values(reports).sort((left, right) => left.id.localeCompare(right.id))

  for (const report of reportList) {
    const band = resolveSignatureMatchBand(report)
    if (band !== 'tentative' && band !== 'strong') {
      continue
    }

    const linkedCases = listCasesLinkedToTopic(cases, report.topicRef)
    const pair = pickJurisdictionPair(linkedCases)
    if (!pair) {
      continue
    }

    signals.push({
      intakeReportId: report.id,
      topicRef: normalizeToken(report.topicRef) || report.topicRef,
      signatureMatchBand: band,
      priorJurisdictionRef: pair.priorJurisdictionRef,
      currentJurisdictionRef: pair.currentJurisdictionRef,
      ...(pair.priorSiteLabel ? { priorSiteLabel: pair.priorSiteLabel } : {}),
      ...(pair.currentSiteLabel ? { currentSiteLabel: pair.currentSiteLabel } : {}),
    })
  }

  return signals
}

/** Project all coordination packets for the given intake + cases (deterministic order). */
export function projectCrossJurisdictionCoordinationPackets(input: {
  reports: InformationIntakeReportsMap | null | undefined
  cases: Record<string, CaseRegionSlice> | null | undefined
}): CrossJurisdictionCoordinationPacket[] {
  const packets: CrossJurisdictionCoordinationPacket[] = []

  for (const signal of composeDistantReappearanceSignals(input)) {
    const packet = buildCrossJurisdictionCoordinationPacket(signal)
    if (packet) {
      packets.push(packet)
    }
  }

  return packets.sort((left, right) => left.packetId.localeCompare(right.packetId))
}

export function summarizeCrossJurisdictionCoordinationPackets(
  packets: readonly CrossJurisdictionCoordinationPacket[]
): CrossJurisdictionCoordinationSummary {
  if (packets.length === 0) {
    return {
      packetCount: 0,
      packets: [],
      summary: 'No cross-jurisdiction coordination packets.',
    }
  }

  const head = packets[0]
  const extra =
    packets.length > 1 ? ` (+${packets.length - 1} additional packet${packets.length === 2 ? '' : 's'})` : ''

  return {
    packetCount: packets.length,
    packets,
    summary: `${head.summary}${extra}`,
  }
}

/** Read-time agency/report summary of active coordination packets. */
export function buildCrossJurisdictionCoordinationSummary(input: {
  reports: InformationIntakeReportsMap | null | undefined
  cases: Record<string, CaseRegionSlice> | null | undefined
}): CrossJurisdictionCoordinationSummary {
  return summarizeCrossJurisdictionCoordinationPackets(
    projectCrossJurisdictionCoordinationPackets(input)
  )
}
