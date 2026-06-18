/**
 * SPE-2480 slice 1: publish automation and crediting hooks.
 *
 * Pure deterministic post-packaging publish-intent evaluation that composes
 * packaged release envelopes, applied governance metadata, and crediting
 * manifest inputs into bounded hook descriptors — no publish execution,
 * UI, or persistence writes.
 */

import type { ReleasePackageEnvelope } from './modularReleasePackaging'
import type {
  GovernanceApplicationDecision,
  SubmissionGovernanceMetadata,
} from './submissionGovernanceRights'

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type PublishAutomationStatus = 'ready_to_publish' | 'needs_revision' | 'rejected'

export const PUBLISH_AUTOMATION_STATUSES: readonly PublishAutomationStatus[] = [
  'ready_to_publish',
  'needs_revision',
  'rejected',
] as const

export type CreditingHookKind =
  | 'contributor_credit'
  | 'changelog_entry'
  | 'attribution_target'
  | 'version_bump'

export const CREDITING_HOOK_KINDS: readonly CreditingHookKind[] = [
  'contributor_credit',
  'changelog_entry',
  'attribution_target',
  'version_bump',
] as const

export type PublishHookKind = 'publish_channel' | 'announcement_segment'

export const PUBLISH_HOOK_KINDS: readonly PublishHookKind[] = [
  'publish_channel',
  'announcement_segment',
] as const

export type PublishAutomationValidationCode =
  | 'invalid_upstream_envelope'
  | 'release_not_packaged'
  | 'governance_not_applied'
  | 'missing_governance_metadata'
  | 'invalid_crediting_manifest'
  | 'missing_version_bump_ref'
  | 'missing_changelog_entry'
  | 'missing_contributor_credit_refs'
  | 'missing_crediting_targets'
  | 'missing_publish_channel'

export type PublishAutomationRemediationCode =
  | 'announcement_segments_recommended'
  | 'crediting_targets_borderline'

export type PublishAutomationReasonCode =
  | PublishAutomationValidationCode
  | PublishAutomationRemediationCode

// ---------------------------------------------------------------------------
// Payload, policy, and envelopes
// ---------------------------------------------------------------------------

export interface PublishCreditingManifest {
  readonly versionBumpRef?: string
  readonly changelogEntry?: string
  readonly contributorCreditRefs?: readonly string[]
  readonly creditingTargets?: readonly string[]
  readonly publishChannel?: string
  readonly announcementSegments?: readonly string[]
}

export interface PublishAutomationPolicy {
  readonly minimumCreditingTargetCount?: number
  readonly recommendedCreditingTargetCount?: number
}

export interface PublishAutomationValidationIssue {
  readonly code: PublishAutomationValidationCode
  readonly severity: 'error'
  readonly detail: string
}

export interface PublishAutomationRemediationNote {
  readonly code: PublishAutomationRemediationCode
  readonly note: string
}

export interface CreditingHookDescriptor {
  readonly kind: CreditingHookKind
  readonly target: string
  readonly payload: string
}

export interface PublishHookDescriptor {
  readonly kind: PublishHookKind
  readonly target: string
  readonly payload: string
}

export interface PublishAutomationMetadata {
  readonly versionBumpRef: string
  readonly publishChannel: string
  readonly contributorRef: string
  readonly rightsTier: string
  readonly artifactType: string
  readonly creditingTargetCount: number
}

export interface PublishAutomationDecision {
  readonly status: PublishAutomationStatus
  readonly creditingHooks: readonly CreditingHookDescriptor[]
  readonly publishHooks: readonly PublishHookDescriptor[]
  readonly validationIssues: readonly PublishAutomationValidationIssue[]
  readonly reasonCodes: readonly PublishAutomationReasonCode[]
  readonly remediationNotes: readonly PublishAutomationRemediationNote[]
  readonly publishMetadata?: PublishAutomationMetadata
}

// ---------------------------------------------------------------------------
// Calibration
// ---------------------------------------------------------------------------

const CREDITING_HOOK_KIND_SET = new Set<string>(CREDITING_HOOK_KINDS)
const PUBLISH_HOOK_KIND_SET = new Set<string>(PUBLISH_HOOK_KINDS)

const DEFAULT_POLICY: Required<PublishAutomationPolicy> = {
  minimumCreditingTargetCount: 1,
  recommendedCreditingTargetCount: 2,
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

export const CANONICAL_PUBLISH_CREDITING_MANIFEST_FIXTURE: PublishCreditingManifest = Object.freeze({
  versionBumpRef: 'package.json:version',
  changelogEntry:
    'Add publish automation and crediting hooks baseline for SPE-75 contribution pipeline.',
  contributorCreditRefs: Object.freeze([
    'contributor:agent-maintainer',
    'contributor:release-bot',
  ]),
  creditingTargets: Object.freeze(['CONTRIBUTORS', 'CHANGELOG.md']),
  publishChannel: 'pr-merge',
  announcementSegments: Object.freeze([
    'domain-release',
    'agent-packaging-pipeline',
  ]),
})

export const BORDERLINE_PUBLISH_CREDITING_MANIFEST_FIXTURE: PublishCreditingManifest = Object.freeze({
  versionBumpRef: 'package.json:version',
  changelogEntry: 'Borderline crediting manifest awaiting expanded attribution targets.',
  contributorCreditRefs: Object.freeze(['contributor:community-contributor']),
  creditingTargets: Object.freeze(['CHANGELOG.md']),
  publishChannel: 'pr-merge',
})

export const INVALID_PUBLISH_CREDITING_MANIFEST_FIXTURE: PublishCreditingManifest = Object.freeze({
  versionBumpRef: '',
  changelogEntry: '',
  contributorCreditRefs: Object.freeze([]),
  creditingTargets: Object.freeze([]),
  publishChannel: '',
})

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isPublishAutomationStatus(value: string): value is PublishAutomationStatus {
  return PUBLISH_AUTOMATION_STATUSES.includes(value as PublishAutomationStatus)
}

export function isCreditingHookKind(value: string): value is CreditingHookKind {
  return CREDITING_HOOK_KIND_SET.has(value)
}

export function isPublishHookKind(value: string): value is PublishHookKind {
  return PUBLISH_HOOK_KIND_SET.has(value)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeToken(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function asStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((entry) => normalizeToken(entry))
    .filter((entry) => entry.length > 0)
    .sort((left, right) => left.localeCompare(right))
}

function resolvePolicy(policy?: PublishAutomationPolicy): Required<PublishAutomationPolicy> {
  return {
    minimumCreditingTargetCount:
      policy?.minimumCreditingTargetCount ?? DEFAULT_POLICY.minimumCreditingTargetCount,
    recommendedCreditingTargetCount:
      policy?.recommendedCreditingTargetCount ?? DEFAULT_POLICY.recommendedCreditingTargetCount,
  }
}

function sortValidationIssues(
  issues: PublishAutomationValidationIssue[]
): PublishAutomationValidationIssue[] {
  return [...issues].sort((left, right) => {
    const codeOrder = left.code.localeCompare(right.code)
    if (codeOrder !== 0) {
      return codeOrder
    }

    return left.detail.localeCompare(right.detail)
  })
}

function sortRemediationNotes(
  notes: PublishAutomationRemediationNote[]
): PublishAutomationRemediationNote[] {
  return [...notes].sort((left, right) => {
    const codeOrder = left.code.localeCompare(right.code)
    if (codeOrder !== 0) {
      return codeOrder
    }

    return left.note.localeCompare(right.note)
  })
}

function sortCreditingHooks(hooks: CreditingHookDescriptor[]): CreditingHookDescriptor[] {
  return [...hooks].sort((left, right) => {
    const kindOrder = left.kind.localeCompare(right.kind)
    if (kindOrder !== 0) {
      return kindOrder
    }

    const targetOrder = left.target.localeCompare(right.target)
    if (targetOrder !== 0) {
      return targetOrder
    }

    return left.payload.localeCompare(right.payload)
  })
}

function sortPublishHooks(hooks: PublishHookDescriptor[]): PublishHookDescriptor[] {
  return [...hooks].sort((left, right) => {
    const kindOrder = left.kind.localeCompare(right.kind)
    if (kindOrder !== 0) {
      return kindOrder
    }

    const targetOrder = left.target.localeCompare(right.target)
    if (targetOrder !== 0) {
      return targetOrder
    }

    return left.payload.localeCompare(right.payload)
  })
}

function freezeValidationResult(
  issues: PublishAutomationValidationIssue[]
): { readonly valid: boolean; readonly issues: readonly PublishAutomationValidationIssue[] } {
  const sortedIssues = sortValidationIssues(issues)

  return Object.freeze({
    valid: sortedIssues.length === 0,
    issues: Object.freeze(sortedIssues.map((issue) => Object.freeze({ ...issue }))),
  })
}

function freezeDecision(decision: PublishAutomationDecision): PublishAutomationDecision {
  return Object.freeze({
    status: decision.status,
    creditingHooks: Object.freeze(
      decision.creditingHooks.map((hook) => Object.freeze({ ...hook }))
    ),
    publishHooks: Object.freeze(decision.publishHooks.map((hook) => Object.freeze({ ...hook }))),
    validationIssues: Object.freeze(decision.validationIssues),
    reasonCodes: Object.freeze([...decision.reasonCodes]),
    remediationNotes: Object.freeze(decision.remediationNotes),
    publishMetadata: decision.publishMetadata
      ? Object.freeze({ ...decision.publishMetadata })
      : undefined,
  })
}

function validateReleaseGate(
  releasePackage: ReleasePackageEnvelope | undefined
): PublishAutomationValidationIssue[] {
  if (!releasePackage || typeof releasePackage !== 'object') {
    return [
      {
        code: 'invalid_upstream_envelope',
        severity: 'error',
        detail: 'Publish automation requires a release package envelope object.',
      },
    ]
  }

  if (releasePackage.status !== 'packaged') {
    return [
      {
        code: 'release_not_packaged',
        severity: 'error',
        detail: `Publish automation requires packaged release status; received "${releasePackage.status}".`,
      },
    ]
  }

  if (!releasePackage.artifactType) {
    return [
      {
        code: 'invalid_upstream_envelope',
        severity: 'error',
        detail: 'Packaged release envelopes must include artifactType for publish hook composition.',
      },
    ]
  }

  return []
}

function validateGovernanceGate(
  governanceDecision: GovernanceApplicationDecision | undefined
): PublishAutomationValidationIssue[] {
  if (!governanceDecision || typeof governanceDecision !== 'object') {
    return [
      {
        code: 'invalid_upstream_envelope',
        severity: 'error',
        detail: 'Publish automation requires a governance application decision object.',
      },
    ]
  }

  if (governanceDecision.status !== 'applied') {
    return [
      {
        code: 'governance_not_applied',
        severity: 'error',
        detail: `Publish automation requires applied governance status; received "${governanceDecision.status}".`,
      },
    ]
  }

  if (!governanceDecision.governanceMetadata) {
    return [
      {
        code: 'missing_governance_metadata',
        severity: 'error',
        detail: 'Applied governance decisions must include governanceMetadata for crediting hooks.',
      },
    ]
  }

  return []
}

function validateCreditingManifestShape(
  manifest: unknown
): PublishAutomationValidationIssue[] {
  if (!manifest || typeof manifest !== 'object') {
    return [
      {
        code: 'invalid_crediting_manifest',
        severity: 'error',
        detail: 'Publish crediting manifest must be an object.',
      },
    ]
  }

  return []
}

function collectManifestIssues(
  manifest: PublishCreditingManifest
): PublishAutomationValidationIssue[] {
  const issues: PublishAutomationValidationIssue[] = []
  const versionBumpRef = normalizeToken(manifest.versionBumpRef)
  const changelogEntry = normalizeToken(manifest.changelogEntry)
  const contributorCreditRefs = asStringArray(manifest.contributorCreditRefs)
  const creditingTargets = asStringArray(manifest.creditingTargets)
  const publishChannel = normalizeToken(manifest.publishChannel)

  if (!versionBumpRef) {
    issues.push({
      code: 'missing_version_bump_ref',
      severity: 'error',
      detail: 'Publish crediting manifest must declare versionBumpRef.',
    })
  }

  if (!changelogEntry) {
    issues.push({
      code: 'missing_changelog_entry',
      severity: 'error',
      detail: 'Publish crediting manifest must declare changelogEntry.',
    })
  }

  if (contributorCreditRefs.length === 0) {
    issues.push({
      code: 'missing_contributor_credit_refs',
      severity: 'error',
      detail: 'Publish crediting manifest must declare at least one contributorCreditRef.',
    })
  }

  if (creditingTargets.length === 0) {
    issues.push({
      code: 'missing_crediting_targets',
      severity: 'error',
      detail: 'Publish crediting manifest must declare at least one creditingTarget.',
    })
  }

  if (!publishChannel) {
    issues.push({
      code: 'missing_publish_channel',
      severity: 'error',
      detail: 'Publish crediting manifest must declare publishChannel.',
    })
  }

  return issues
}

function collectRemediationNotes(
  manifest: PublishCreditingManifest,
  policy: Required<PublishAutomationPolicy>
): PublishAutomationRemediationNote[] {
  const notes: PublishAutomationRemediationNote[] = []
  const creditingTargets = asStringArray(manifest.creditingTargets)
  const announcementSegments = asStringArray(manifest.announcementSegments)

  if (
    creditingTargets.length >= policy.minimumCreditingTargetCount &&
    creditingTargets.length < policy.recommendedCreditingTargetCount
  ) {
    notes.push({
      code: 'crediting_targets_borderline',
      note: `Declare at least ${policy.recommendedCreditingTargetCount} crediting targets (for example CONTRIBUTORS and CHANGELOG.md) before publish automation can fully apply.`,
    })
  }

  if (announcementSegments.length === 0) {
    notes.push({
      code: 'announcement_segments_recommended',
      note: 'Add announcementSegments so segmented publish channels receive bounded release copy.',
    })
  }

  return sortRemediationNotes(notes)
}

function buildCreditingHooks(
  manifest: PublishCreditingManifest,
  governanceMetadata: SubmissionGovernanceMetadata
): CreditingHookDescriptor[] {
  const hooks: CreditingHookDescriptor[] = []
  const versionBumpRef = normalizeToken(manifest.versionBumpRef)
  const changelogEntry = normalizeToken(manifest.changelogEntry)
  const contributorCreditRefs = asStringArray(manifest.contributorCreditRefs)
  const creditingTargets = asStringArray(manifest.creditingTargets)

  if (versionBumpRef) {
    hooks.push({
      kind: 'version_bump',
      target: versionBumpRef,
      payload: `bump:${versionBumpRef}`,
    })
  }

  if (changelogEntry) {
    hooks.push({
      kind: 'changelog_entry',
      target: 'CHANGELOG.md',
      payload: changelogEntry,
    })
  }

  for (const creditRef of contributorCreditRefs) {
    hooks.push({
      kind: 'contributor_credit',
      target: creditRef,
      payload: governanceMetadata.attributionStatement,
    })
  }

  for (const target of creditingTargets) {
    hooks.push({
      kind: 'attribution_target',
      target,
      payload: `${governanceMetadata.contributorRef}:${governanceMetadata.rightsTier}`,
    })
  }

  return sortCreditingHooks(hooks)
}

function buildPublishHooks(manifest: PublishCreditingManifest): PublishHookDescriptor[] {
  const hooks: PublishHookDescriptor[] = []
  const publishChannel = normalizeToken(manifest.publishChannel)
  const announcementSegments = asStringArray(manifest.announcementSegments)

  if (publishChannel) {
    hooks.push({
      kind: 'publish_channel',
      target: publishChannel,
      payload: `channel:${publishChannel}`,
    })
  }

  for (const segment of announcementSegments) {
    hooks.push({
      kind: 'announcement_segment',
      target: segment,
      payload: `segment:${segment}`,
    })
  }

  return sortPublishHooks(hooks)
}

function buildPublishMetadata(
  manifest: PublishCreditingManifest,
  governanceMetadata: SubmissionGovernanceMetadata,
  artifactType: string
): PublishAutomationMetadata {
  return Object.freeze({
    versionBumpRef: normalizeToken(manifest.versionBumpRef),
    publishChannel: normalizeToken(manifest.publishChannel),
    contributorRef: governanceMetadata.contributorRef,
    rightsTier: governanceMetadata.rightsTier,
    artifactType,
    creditingTargetCount: asStringArray(manifest.creditingTargets).length,
  })
}

function rejectDecision(
  issues: PublishAutomationValidationIssue[]
): PublishAutomationDecision {
  const sortedIssues = sortValidationIssues(issues)
  const reasonCodes = [...new Set(sortedIssues.map((issue) => issue.code))].sort((left, right) =>
    left.localeCompare(right)
  )

  return freezeDecision({
    status: 'rejected',
    creditingHooks: Object.freeze([]),
    publishHooks: Object.freeze([]),
    validationIssues: Object.freeze(sortedIssues.map((issue) => Object.freeze({ ...issue }))),
    reasonCodes,
    remediationNotes: Object.freeze([]),
  })
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validatePublishAutomationInputs(
  releasePackage?: ReleasePackageEnvelope,
  governanceDecision?: GovernanceApplicationDecision,
  creditingManifest?: PublishCreditingManifest
): { readonly valid: boolean; readonly issues: readonly PublishAutomationValidationIssue[] } {
  const releaseIssues = validateReleaseGate(releasePackage)
  if (releaseIssues.length > 0) {
    return freezeValidationResult(releaseIssues)
  }

  const governanceIssues = validateGovernanceGate(governanceDecision)
  if (governanceIssues.length > 0) {
    return freezeValidationResult(governanceIssues)
  }

  const shapeIssues = validateCreditingManifestShape(creditingManifest)
  if (shapeIssues.length > 0) {
    return freezeValidationResult(shapeIssues)
  }

  return freezeValidationResult(collectManifestIssues(creditingManifest!))
}

/**
 * SPE-75 follow-up baseline: deterministic publish-intent evaluation with
 * bounded crediting and publish hook descriptors — no publish execution.
 */
export function evaluatePublishAutomationCreditingHooks(
  releasePackage?: ReleasePackageEnvelope,
  governanceDecision?: GovernanceApplicationDecision,
  creditingManifest?: PublishCreditingManifest,
  policy?: PublishAutomationPolicy
): PublishAutomationDecision {
  const resolvedPolicy = resolvePolicy(policy)

  const releaseIssues = validateReleaseGate(releasePackage)
  if (releaseIssues.length > 0) {
    return rejectDecision(releaseIssues)
  }

  const governanceIssues = validateGovernanceGate(governanceDecision)
  if (governanceIssues.length > 0) {
    return rejectDecision(governanceIssues)
  }

  const shapeIssues = validateCreditingManifestShape(creditingManifest)
  if (shapeIssues.length > 0) {
    return rejectDecision(shapeIssues)
  }

  const manifestIssues = collectManifestIssues(creditingManifest!)
  if (manifestIssues.length > 0) {
    return rejectDecision(manifestIssues)
  }

  const governanceMetadata = governanceDecision!.governanceMetadata!
  const artifactType = releasePackage!.artifactType!
  const remediationNotes = sortRemediationNotes(
    collectRemediationNotes(creditingManifest!, resolvedPolicy)
  )

  if (remediationNotes.length > 0) {
    const reasonCodes = remediationNotes
      .map((note) => note.code)
      .sort((left, right) => left.localeCompare(right))

    return freezeDecision({
      status: 'needs_revision',
      creditingHooks: Object.freeze(
        buildCreditingHooks(creditingManifest!, governanceMetadata).map((hook) =>
          Object.freeze({ ...hook })
        )
      ),
      publishHooks: Object.freeze(
        buildPublishHooks(creditingManifest!).map((hook) => Object.freeze({ ...hook }))
      ),
      validationIssues: Object.freeze([]),
      reasonCodes,
      remediationNotes: Object.freeze(remediationNotes.map((note) => Object.freeze({ ...note }))),
      publishMetadata: buildPublishMetadata(
        creditingManifest!,
        governanceMetadata,
        artifactType
      ),
    })
  }

  return freezeDecision({
    status: 'ready_to_publish',
    creditingHooks: Object.freeze(
      buildCreditingHooks(creditingManifest!, governanceMetadata).map((hook) =>
        Object.freeze({ ...hook })
      )
    ),
    publishHooks: Object.freeze(
      buildPublishHooks(creditingManifest!).map((hook) => Object.freeze({ ...hook }))
    ),
    validationIssues: Object.freeze([]),
    reasonCodes: Object.freeze([]),
    remediationNotes: Object.freeze([]),
    publishMetadata: buildPublishMetadata(creditingManifest!, governanceMetadata, artifactType),
  })
}

// ---------------------------------------------------------------------------
// Publish queue persistence (SPE-2483 slice 1)
// ---------------------------------------------------------------------------

export type PublishQueueRecordId = string

export interface PublishQueueRecord {
  readonly id: PublishQueueRecordId
  readonly label: string
  readonly summary?: string
  readonly queuedWeek?: number
  readonly releaseArtifactRef: string
  readonly status: PublishAutomationStatus
  readonly creditingHooks: readonly CreditingHookDescriptor[]
  readonly publishHooks: readonly PublishHookDescriptor[]
  readonly reasonCodes: readonly PublishAutomationReasonCode[]
  readonly publishMetadata?: PublishAutomationMetadata
}

export type PublishQueueRecordsMap = Record<PublishQueueRecordId, PublishQueueRecord>

export type PublishQueueValidationCode =
  | 'missing_id'
  | 'missing_label'
  | 'missing_release_artifact_ref'
  | 'invalid_status'
  | 'invalid_crediting_hook'
  | 'invalid_publish_hook'
  | 'invalid_reason_code'
  | 'invalid_queued_week'
  | 'invalid_publish_metadata'

export interface PublishQueueValidationIssue {
  readonly code: PublishQueueValidationCode
  readonly severity: 'error'
  readonly detail: string
}

export interface PublishQueueValidationResult {
  readonly valid: boolean
  readonly issues: readonly PublishQueueValidationIssue[]
}

const PUBLISH_AUTOMATION_REASON_CODE_SET = new Set<string>([
  'invalid_upstream_envelope',
  'release_not_packaged',
  'governance_not_applied',
  'missing_governance_metadata',
  'invalid_crediting_manifest',
  'missing_version_bump_ref',
  'missing_changelog_entry',
  'missing_contributor_credit_refs',
  'missing_crediting_targets',
  'missing_publish_channel',
  'announcement_segments_recommended',
  'crediting_targets_borderline',
])

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteWeek(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isPublishAutomationReasonCode(value: string): value is PublishAutomationReasonCode {
  return PUBLISH_AUTOMATION_REASON_CODE_SET.has(value)
}

function parseCreditingHookList(value: unknown): readonly CreditingHookDescriptor[] {
  if (!Array.isArray(value)) {
    return []
  }

  const hooks: CreditingHookDescriptor[] = []

  for (const entry of value) {
    if (!isPlainRecord(entry)) {
      continue
    }

    const kind = entry.kind
    const target = normalizeToken(entry.target)
    const payload = normalizeToken(entry.payload)

    if (
      typeof kind !== 'string' ||
      !isCreditingHookKind(kind) ||
      !target ||
      !payload
    ) {
      continue
    }

    hooks.push({ kind, target, payload })
  }

  return sortCreditingHooks(hooks)
}

function parsePublishHookList(value: unknown): readonly PublishHookDescriptor[] {
  if (!Array.isArray(value)) {
    return []
  }

  const hooks: PublishHookDescriptor[] = []

  for (const entry of value) {
    if (!isPlainRecord(entry)) {
      continue
    }

    const kind = entry.kind
    const target = normalizeToken(entry.target)
    const payload = normalizeToken(entry.payload)

    if (typeof kind !== 'string' || !isPublishHookKind(kind) || !target || !payload) {
      continue
    }

    hooks.push({ kind, target, payload })
  }

  return sortPublishHooks(hooks)
}

function parseReasonCodeList(value: unknown): readonly PublishAutomationReasonCode[] {
  if (!Array.isArray(value)) {
    return []
  }

  const codes = value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0 && isPublishAutomationReasonCode(entry))

  return [...new Set(codes)].sort((left, right) => left.localeCompare(right))
}

function parsePublishMetadata(value: unknown): PublishAutomationMetadata | undefined {
  if (!isPlainRecord(value)) {
    return undefined
  }

  const versionBumpRef = normalizeToken(value.versionBumpRef)
  const publishChannel = normalizeToken(value.publishChannel)
  const contributorRef = normalizeToken(value.contributorRef)
  const rightsTier = normalizeToken(value.rightsTier)
  const artifactType = normalizeToken(value.artifactType)
  const creditingTargetCount = value.creditingTargetCount

  if (
    !versionBumpRef ||
    !publishChannel ||
    !contributorRef ||
    !rightsTier ||
    !artifactType ||
    typeof creditingTargetCount !== 'number' ||
    !Number.isInteger(creditingTargetCount) ||
    creditingTargetCount < 0
  ) {
    return undefined
  }

  return Object.freeze({
    versionBumpRef,
    publishChannel,
    contributorRef,
    rightsTier,
    artifactType,
    creditingTargetCount,
  })
}

function freezePublishQueueValidationResult(
  issues: PublishQueueValidationIssue[]
): PublishQueueValidationResult {
  const sortedIssues = [...issues].sort((left, right) => {
    const codeOrder = left.code.localeCompare(right.code)
    if (codeOrder !== 0) {
      return codeOrder
    }

    return left.detail.localeCompare(right.detail)
  })

  return Object.freeze({
    valid: sortedIssues.length === 0,
    issues: Object.freeze(sortedIssues.map((issue) => Object.freeze({ ...issue }))),
  })
}

export function validatePublishQueueRecord(
  record: PublishQueueRecord
): PublishQueueValidationResult {
  const issues: PublishQueueValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)
  const releaseArtifactRef = normalizeToken(record.releaseArtifactRef)

  if (!id) {
    issues.push({
      code: 'missing_id',
      severity: 'error',
      detail: 'Publish queue record is missing id.',
    })
  }

  if (!label) {
    issues.push({
      code: 'missing_label',
      severity: 'error',
      detail: 'Publish queue record is missing label.',
    })
  }

  if (!releaseArtifactRef) {
    issues.push({
      code: 'missing_release_artifact_ref',
      severity: 'error',
      detail: 'Publish queue record is missing releaseArtifactRef.',
    })
  }

  if (!isPublishAutomationStatus(record.status)) {
    issues.push({
      code: 'invalid_status',
      severity: 'error',
      detail: `Publish queue record ${id || '(unknown)'} has invalid status ${String(record.status)}.`,
    })
  }

  if (record.queuedWeek !== undefined && !isFiniteWeek(record.queuedWeek)) {
    issues.push({
      code: 'invalid_queued_week',
      severity: 'error',
      detail: `Publish queue record ${id || '(unknown)'} has invalid queuedWeek ${String(record.queuedWeek)}.`,
    })
  }

  for (const hook of record.creditingHooks) {
    if (
      !isCreditingHookKind(hook.kind) ||
      !normalizeToken(hook.target) ||
      !normalizeToken(hook.payload)
    ) {
      issues.push({
        code: 'invalid_crediting_hook',
        severity: 'error',
        detail: `Publish queue record ${id || '(unknown)'} has invalid crediting hook.`,
      })
      break
    }
  }

  for (const hook of record.publishHooks) {
    if (
      !isPublishHookKind(hook.kind) ||
      !normalizeToken(hook.target) ||
      !normalizeToken(hook.payload)
    ) {
      issues.push({
        code: 'invalid_publish_hook',
        severity: 'error',
        detail: `Publish queue record ${id || '(unknown)'} has invalid publish hook.`,
      })
      break
    }
  }

  for (const code of record.reasonCodes) {
    if (!isPublishAutomationReasonCode(code)) {
      issues.push({
        code: 'invalid_reason_code',
        severity: 'error',
        detail: `Publish queue record ${id || '(unknown)'} has invalid reason code ${String(code)}.`,
      })
      break
    }
  }

  if (record.publishMetadata !== undefined && parsePublishMetadata(record.publishMetadata) === undefined) {
    issues.push({
      code: 'invalid_publish_metadata',
      severity: 'error',
      detail: `Publish queue record ${id || '(unknown)'} has invalid publishMetadata.`,
    })
  }

  return freezePublishQueueValidationResult(issues)
}

function definePublishQueueRecord(record: PublishQueueRecord): PublishQueueRecord {
  return Object.freeze({
    ...record,
    creditingHooks: Object.freeze(record.creditingHooks.map((hook) => Object.freeze({ ...hook }))),
    publishHooks: Object.freeze(record.publishHooks.map((hook) => Object.freeze({ ...hook }))),
    reasonCodes: Object.freeze([...record.reasonCodes]),
    ...(record.publishMetadata ? { publishMetadata: Object.freeze({ ...record.publishMetadata }) } : {}),
  })
}

/**
 * Read-only composition: materialize a bounded publish-queue record from a
 * publish-automation decision without executing publish actions.
 */
export function composePublishQueueRecord(input: {
  readonly id: string
  readonly label: string
  readonly releaseArtifactRef: string
  readonly decision: PublishAutomationDecision
  readonly summary?: string
  readonly queuedWeek?: number
}): PublishQueueRecord | null {
  const id = normalizeToken(input.id)
  const label = normalizeToken(input.label)
  const releaseArtifactRef = normalizeToken(input.releaseArtifactRef)

  if (!id || !label || !releaseArtifactRef) {
    return null
  }

  const record = definePublishQueueRecord({
    id,
    label,
    releaseArtifactRef,
    status: input.decision.status,
    creditingHooks: input.decision.creditingHooks,
    publishHooks: input.decision.publishHooks,
    reasonCodes: input.decision.reasonCodes,
    ...(normalizeToken(input.summary ?? '') ? { summary: normalizeToken(input.summary) } : {}),
    ...(input.queuedWeek !== undefined && isFiniteWeek(input.queuedWeek)
      ? { queuedWeek: input.queuedWeek }
      : {}),
    ...(input.decision.publishMetadata ? { publishMetadata: input.decision.publishMetadata } : {}),
  })

  return validatePublishQueueRecord(record).valid ? record : null
}

function sanitizePublishQueueRecordEntry(value: unknown): PublishQueueRecord | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const id = normalizeToken(value.id)
  const label = normalizeToken(value.label)
  const releaseArtifactRef = normalizeToken(value.releaseArtifactRef)
  const status = value.status

  if (
    !id ||
    !label ||
    !releaseArtifactRef ||
    typeof status !== 'string' ||
    !isPublishAutomationStatus(status)
  ) {
    return null
  }

  const creditingHooks = parseCreditingHookList(value.creditingHooks)
  const publishHooks = parsePublishHookList(value.publishHooks)
  const reasonCodes = parseReasonCodeList(value.reasonCodes)
  const publishMetadata = parsePublishMetadata(value.publishMetadata)
  const summary =
    typeof value.summary === 'string' && value.summary.trim().length > 0
      ? value.summary.trim()
      : undefined
  const queuedWeek = value.queuedWeek

  const record = definePublishQueueRecord({
    id,
    label,
    releaseArtifactRef,
    status,
    creditingHooks,
    publishHooks,
    reasonCodes,
    ...(summary ? { summary } : {}),
    ...(queuedWeek !== undefined && isFiniteWeek(queuedWeek) ? { queuedWeek } : {}),
    ...(publishMetadata ? { publishMetadata } : {}),
  })

  return validatePublishQueueRecord(record).valid ? record : null
}

/** Hydration: canonical record map keyed by record id; drops invalid and duplicate-id entries. */
export function sanitizePublishQueueRecords(
  value: unknown,
  fallback: PublishQueueRecordsMap = {}
): PublishQueueRecordsMap {
  if (!isPlainRecord(value)) {
    return fallback
  }

  const next: PublishQueueRecordsMap = {}
  const seenIds = new Set<string>()

  for (const entry of Object.values(value)) {
    const record = sanitizePublishQueueRecordEntry(entry)
    if (!record || seenIds.has(record.id)) {
      continue
    }

    seenIds.add(record.id)
    next[record.id] = record
  }

  return Object.keys(next).length > 0 ? next : fallback
}

/** Ready-to-publish queue entry composed from the canonical upstream fixture chain. */
export const CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE: PublishQueueRecord = definePublishQueueRecord({
  id: 'publish-queue:domain-release-batch-1',
  label: 'Domain release batch 1',
  summary: 'Queued publish intent for SPE-75 contribution pipeline domain release.',
  queuedWeek: 4,
  releaseArtifactRef: 'release:domain-code-bundle-spe-2480',
  status: 'ready_to_publish',
  creditingHooks: Object.freeze([
    {
      kind: 'attribution_target',
      target: 'CHANGELOG.md',
      payload: 'contributor:agent-maintainer:canonical',
    },
    {
      kind: 'attribution_target',
      target: 'CONTRIBUTORS',
      payload: 'contributor:agent-maintainer:canonical',
    },
    {
      kind: 'changelog_entry',
      target: 'CHANGELOG.md',
      payload:
        'Add publish automation and crediting hooks baseline for SPE-75 contribution pipeline.',
    },
    {
      kind: 'contributor_credit',
      target: 'contributor:agent-maintainer',
      payload:
        'Maintainer-authored domain module with explicit MIT license and canonical release manifest alignment.',
    },
    {
      kind: 'contributor_credit',
      target: 'contributor:release-bot',
      payload:
        'Maintainer-authored domain module with explicit MIT license and canonical release manifest alignment.',
    },
    {
      kind: 'version_bump',
      target: 'package.json:version',
      payload: 'bump:package.json:version',
    },
  ]),
  publishHooks: Object.freeze([
    {
      kind: 'announcement_segment',
      target: 'agent-packaging-pipeline',
      payload: 'segment:agent-packaging-pipeline',
    },
    {
      kind: 'announcement_segment',
      target: 'domain-release',
      payload: 'segment:domain-release',
    },
    {
      kind: 'publish_channel',
      target: 'pr-merge',
      payload: 'channel:pr-merge',
    },
  ]),
  reasonCodes: Object.freeze([]),
  publishMetadata: Object.freeze({
    versionBumpRef: 'package.json:version',
    publishChannel: 'pr-merge',
    contributorRef: 'contributor:agent-maintainer',
    rightsTier: 'canonical',
    artifactType: 'domain_code_bundle',
    creditingTargetCount: 2,
  }),
})
