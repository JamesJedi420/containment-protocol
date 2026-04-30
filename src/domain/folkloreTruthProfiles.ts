export type TruthProfileId = 'skeptical_modern' | 'veiled_intrusion' | 'active_folklore'
export type FolkloreClaimTruthState = 'false' | 'partial' | 'mechanically_true'
export type FolkloreClaimCategory = 'survival_test' | 'appeasement_rite' | 'hard_counter' | 'timing_rule'
export type FolkloreTimingPrecision = 'exact' | 'directional' | 'inexact'
export type InstitutionalResponsePosture = 'dismissive' | 'guarded' | 'mobilized'
export type PublicLegibility = 'denied' | 'contested' | 'accepted'
export type HorrorMode = 'investigative' | 'harassment' | 'mythic'

export interface CampaignTruthProfile {
  profileId: TruthProfileId
  label: string
  supernaturalReportReliability: 'mostly_false' | 'mixed' | 'mostly_true'
  anomalyPrevalence: 'suppressed' | 'emergent' | 'active'
  institutionalResponsePosture: InstitutionalResponsePosture
  publicLegibility: PublicLegibility
  horrorMode: HorrorMode
  nameSensitiveCulture: boolean
}

export interface FolkloreClaimInput {
  claimId: string
  label: string
  category: FolkloreClaimCategory
  baseConfidence: number
  profileTruth: Partial<Record<TruthProfileId, FolkloreClaimTruthState>>
  timingPrecisionByProfile?: Partial<Record<TruthProfileId, FolkloreTimingPrecision>>
  guidanceTags: readonly string[]
}

export interface FolklorePacketInput {
  packetId: string
  label: string
  localCulture: {
    nameSensitiveEvil: boolean
    publicDisclosureNorm: 'guarded' | 'practical' | 'open'
  }
  claims: readonly FolkloreClaimInput[]
}

export interface FolkloreClaimResolution {
  claimId: string
  label: string
  category: FolkloreClaimCategory
  truthState: FolkloreClaimTruthState
  confidence: number
  timingPrecision?: FolkloreTimingPrecision
  guidanceTags: string[]
}

export interface ResolvedFolklorePacket {
  packetId: string
  label: string
  profileId: TruthProfileId
  localCulture: {
    nameSensitiveEvil: boolean
    publicDisclosureNorm: 'guarded' | 'practical' | 'open'
  }
  claims: FolkloreClaimResolution[]
}

export interface TruthProfilePressureSurface {
  profileId: TruthProfileId
  anomalyEncounterPressure: number
  institutionalResponsePosture: InstitutionalResponsePosture
  witnessReliability: number
  publicLegibility: PublicLegibility
}

export interface FolkloreOperationalResponseSurface {
  packetId: string
  profileId: TruthProfileId
  actionableClaimCount: number
  briefingDisposition: 'dismiss_as_noise' | 'verify_selectively' | 'treat_as_field_guidance'
  requiredCounterTags: string[]
  timingAdvisory: 'ignore_civilian_timing' | 'treat_as_window_hint' | 'treat_as_operational_clock'
}

export const CAMPAIGN_TRUTH_PROFILES: Readonly<Record<TruthProfileId, CampaignTruthProfile>> = {
  skeptical_modern: {
    profileId: 'skeptical_modern',
    label: 'Skeptical Modern',
    supernaturalReportReliability: 'mostly_false',
    anomalyPrevalence: 'suppressed',
    institutionalResponsePosture: 'dismissive',
    publicLegibility: 'denied',
    horrorMode: 'investigative',
    nameSensitiveCulture: false,
  },
  veiled_intrusion: {
    profileId: 'veiled_intrusion',
    label: 'Veiled Intrusion',
    supernaturalReportReliability: 'mixed',
    anomalyPrevalence: 'emergent',
    institutionalResponsePosture: 'guarded',
    publicLegibility: 'contested',
    horrorMode: 'harassment',
    nameSensitiveCulture: true,
  },
  active_folklore: {
    profileId: 'active_folklore',
    label: 'Active Folklore',
    supernaturalReportReliability: 'mostly_true',
    anomalyPrevalence: 'active',
    institutionalResponsePosture: 'mobilized',
    publicLegibility: 'accepted',
    horrorMode: 'mythic',
    nameSensitiveCulture: true,
  },
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number(value.toFixed(3))))
}

function normalizeString(value: string) {
  return value.trim()
}

function uniqueSorted(values: readonly string[]) {
  return Array.from(new Set(values.map((value) => normalizeString(value)).filter(Boolean))).sort((left, right) =>
    left.localeCompare(right)
  )
}

function sortByKey<T>(values: readonly T[], getKey: (value: T) => string) {
  return [...values].sort((left, right) => getKey(left).localeCompare(getKey(right)))
}

function getTruthStateConfidence(baseConfidence: number, truthState: FolkloreClaimTruthState) {
  if (truthState === 'mechanically_true') {
    return clamp01(baseConfidence + 0.18)
  }
  if (truthState === 'partial') {
    return clamp01(baseConfidence)
  }
  return clamp01(baseConfidence - 0.22)
}

export function resolveFolklorePacket(
  input: FolklorePacketInput,
  profileId: TruthProfileId
): ResolvedFolklorePacket {
  return {
    packetId: normalizeString(input.packetId),
    label: normalizeString(input.label),
    profileId,
    localCulture: {
      nameSensitiveEvil: input.localCulture.nameSensitiveEvil,
      publicDisclosureNorm: input.localCulture.publicDisclosureNorm,
    },
    claims: sortByKey(
      input.claims.map((claim) => {
        const truthState = claim.profileTruth[profileId] ?? 'false'
        const timingPrecision = claim.timingPrecisionByProfile?.[profileId]
        return {
          claimId: normalizeString(claim.claimId),
          label: normalizeString(claim.label),
          category: claim.category,
          truthState,
          confidence: getTruthStateConfidence(claim.baseConfidence, truthState),
          ...(timingPrecision ? { timingPrecision } : {}),
          guidanceTags: uniqueSorted(claim.guidanceTags),
        }
      }),
      (claim) => claim.claimId
    ),
  }
}

export function deriveTruthProfilePressureSurface(profileId: TruthProfileId): TruthProfilePressureSurface {
  const profile = CAMPAIGN_TRUTH_PROFILES[profileId]
  const anomalyEncounterPressure =
    profile.anomalyPrevalence === 'active' ? 0.85 : profile.anomalyPrevalence === 'emergent' ? 0.58 : 0.24
  const witnessReliability =
    profile.supernaturalReportReliability === 'mostly_true'
      ? 0.78
      : profile.supernaturalReportReliability === 'mixed'
        ? 0.56
        : 0.31

  return {
    profileId,
    anomalyEncounterPressure,
    institutionalResponsePosture: profile.institutionalResponsePosture,
    witnessReliability,
    publicLegibility: profile.publicLegibility,
  }
}

export function countMechanicallyTrueClaims(packet: ResolvedFolklorePacket) {
  return packet.claims.filter((claim) => claim.truthState === 'mechanically_true').length
}

export function countFalseClaims(packet: ResolvedFolklorePacket) {
  return packet.claims.filter((claim) => claim.truthState === 'false').length
}

export function hasDirectionallyUsefulTiming(packet: ResolvedFolklorePacket) {
  return packet.claims.some(
    (claim) => claim.category === 'timing_rule' && (claim.timingPrecision === 'directional' || claim.timingPrecision === 'inexact')
  )
}

export function deriveFolkloreOperationalResponse(
  packet: ResolvedFolklorePacket
): FolkloreOperationalResponseSurface {
  const actionableClaims = packet.claims.filter((claim) => claim.truthState === 'mechanically_true')
  const partialClaims = packet.claims.filter((claim) => claim.truthState === 'partial')
  const timingClaim = packet.claims.find((claim) => claim.category === 'timing_rule')

  const briefingDisposition =
    actionableClaims.length >= 2
      ? 'treat_as_field_guidance'
      : actionableClaims.length >= 1 || partialClaims.length >= 2
        ? 'verify_selectively'
        : 'dismiss_as_noise'

  const timingAdvisory =
    timingClaim?.timingPrecision === 'exact'
      ? 'treat_as_operational_clock'
      : timingClaim?.timingPrecision === 'directional' || timingClaim?.timingPrecision === 'inexact'
        ? 'treat_as_window_hint'
        : 'ignore_civilian_timing'

  return {
    packetId: packet.packetId,
    profileId: packet.profileId,
    actionableClaimCount: actionableClaims.length,
    briefingDisposition,
    requiredCounterTags: uniqueSorted(actionableClaims.flatMap((claim) => claim.guidanceTags)),
    timingAdvisory,
  }
}
