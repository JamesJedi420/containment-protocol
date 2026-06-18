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
