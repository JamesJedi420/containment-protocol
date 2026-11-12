/**
 * SPE-2475 slice 1: modular release packaging and compatibility declarations.
 *
 * Pure deterministic post-curation packaging that consumes accepted
 * contribution-intake curation output and emits a bounded release-package
 * envelope — no publish actions, UI, or persistence writes.
 */

import type {
  ContributionArtifactKind,
  ContributionCurationDecision,
  ContributionNormalizedMetadata,
} from './contributionIntakeCuration'

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type ReleasePackageStatus = 'packaged' | 'needs_revision' | 'rejected'

export const RELEASE_PACKAGE_STATUSES: readonly ReleasePackageStatus[] = [
  'packaged',
  'needs_revision',
  'rejected',
] as const

export type ReleaseArtifactType =
  | 'domain_code_bundle'
  | 'documentation_bundle'
  | 'content_accessory'
  | 'mixed_release_bundle'

export const RELEASE_ARTIFACT_TYPES: readonly ReleaseArtifactType[] = [
  'domain_code_bundle',
  'documentation_bundle',
  'content_accessory',
  'mixed_release_bundle',
] as const

export type CompatibilitySurfaceKind =
  | 'runtime_version'
  | 'save_format'
  | 'schema_registry'
  | 'breaking_change_callout'

export const COMPATIBILITY_SURFACE_KINDS: readonly CompatibilitySurfaceKind[] = [
  'runtime_version',
  'save_format',
  'schema_registry',
  'breaking_change_callout',
] as const

export type ReleaseManifestValidationCode =
  | 'invalid_manifest'
  | 'curation_not_accepted'
  | 'missing_normalized_metadata'
  | 'missing_artifact_paths'
  | 'missing_runtime_version'
  | 'missing_schema_registry_version'
  | 'missing_save_format_version'
  | 'missing_delivery_channel'
  | 'missing_consumer_scopes'

export type ReleaseManifestRemediationCode =
  | 'save_format_version_recommended'
  | 'delivery_channel_recommended'
  | 'breaking_change_notes_recommended'

export type ReleasePackageReasonCode =
  | ReleaseManifestValidationCode
  | ReleaseManifestRemediationCode

// ---------------------------------------------------------------------------
// Payload, policy, and envelopes
// ---------------------------------------------------------------------------

export interface ReleaseArtifactManifest {
  readonly artifactPaths?: readonly string[]
  readonly runtimeVersion?: string
  readonly saveFormatVersion?: string
  readonly schemaRegistryVersion?: string
  readonly breakingChangeNotes?: readonly string[]
  readonly deliveryChannel?: string
  readonly consumerScopes?: readonly string[]
}

export interface CompatibilityDeclaration {
  readonly surface: CompatibilitySurfaceKind
  readonly declaration: string
}

export interface ReleaseManifestValidationIssue {
  readonly code: ReleaseManifestValidationCode
  readonly severity: 'error'
  readonly detail: string
}

export interface ReleaseManifestRemediationNote {
  readonly code: ReleaseManifestRemediationCode
  readonly note: string
}

export interface ReleasePackageEnvelope {
  readonly status: ReleasePackageStatus
  readonly artifactType?: ReleaseArtifactType
  readonly compatibilityDeclarations: readonly CompatibilityDeclaration[]
  readonly deliveryAssumptions: readonly string[]
  readonly validationIssues: readonly ReleaseManifestValidationIssue[]
  readonly reasonCodes: readonly ReleasePackageReasonCode[]
  readonly remediationNotes: readonly ReleaseManifestRemediationNote[]
  readonly sourceMetadata?: ContributionNormalizedMetadata
}

// ---------------------------------------------------------------------------
// Calibration
// ---------------------------------------------------------------------------

const ARTIFACT_TYPE_BY_KIND: Record<ContributionArtifactKind, ReleaseArtifactType> = {
  code: 'domain_code_bundle',
  docs: 'documentation_bundle',
  content: 'content_accessory',
  mixed: 'mixed_release_bundle',
}

const COMPATIBILITY_SURFACE_SET = new Set<string>(COMPATIBILITY_SURFACE_KINDS)

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

export const CANONICAL_RELEASE_ARTIFACT_MANIFEST_FIXTURE: ReleaseArtifactManifest = Object.freeze({
  artifactPaths: Object.freeze([
    'src/domain/modularReleasePackaging.ts',
    'src/test/modularReleasePackaging.test.ts',
  ]),
  runtimeVersion: 'node-22',
  saveFormatVersion: 'save-v1',
  schemaRegistryVersion: 'SCHEMA_REGISTRY.md@main',
  breakingChangeNotes: Object.freeze([
    'No breaking compatibility surface changes in this baseline release.',
  ]),
  deliveryChannel: 'pr-merge',
  consumerScopes: Object.freeze(['domain-maintainers', 'agent-packaging-pipeline']),
})

export const INVALID_RELEASE_ARTIFACT_MANIFEST_FIXTURE: ReleaseArtifactManifest = Object.freeze({
  artifactPaths: Object.freeze([]),
  runtimeVersion: '',
  schemaRegistryVersion: '',
})

export const BORDERLINE_RELEASE_ARTIFACT_MANIFEST_FIXTURE: ReleaseArtifactManifest = Object.freeze({
  artifactPaths: Object.freeze([
    'src/domain/modularReleasePackaging.ts',
    'src/test/modularReleasePackaging.test.ts',
  ]),
  runtimeVersion: 'node-22',
  schemaRegistryVersion: 'SCHEMA_REGISTRY.md@main',
  deliveryChannel: 'pr-merge',
})

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isReleasePackageStatus(value: string): value is ReleasePackageStatus {
  return RELEASE_PACKAGE_STATUSES.includes(value as ReleasePackageStatus)
}

export function isReleaseArtifactType(value: string): value is ReleaseArtifactType {
  return RELEASE_ARTIFACT_TYPES.includes(value as ReleaseArtifactType)
}

export function isCompatibilitySurfaceKind(value: string): value is CompatibilitySurfaceKind {
  return COMPATIBILITY_SURFACE_SET.has(value)
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

function sortValidationIssues(
  issues: ReleaseManifestValidationIssue[]
): ReleaseManifestValidationIssue[] {
  return [...issues].sort((left, right) => {
    const codeOrder = left.code.localeCompare(right.code)
    if (codeOrder !== 0) {
      return codeOrder
    }

    return left.detail.localeCompare(right.detail)
  })
}

function sortRemediationNotes(
  notes: ReleaseManifestRemediationNote[]
): ReleaseManifestRemediationNote[] {
  return [...notes].sort((left, right) => {
    const codeOrder = left.code.localeCompare(right.code)
    if (codeOrder !== 0) {
      return codeOrder
    }

    return left.note.localeCompare(right.note)
  })
}

function sortCompatibilityDeclarations(
  declarations: CompatibilityDeclaration[]
): CompatibilityDeclaration[] {
  return [...declarations].sort((left, right) => {
    const surfaceOrder = left.surface.localeCompare(right.surface)
    if (surfaceOrder !== 0) {
      return surfaceOrder
    }

    return left.declaration.localeCompare(right.declaration)
  })
}

function freezeValidationResult(
  issues: ReleaseManifestValidationIssue[]
): { readonly valid: boolean; readonly issues: readonly ReleaseManifestValidationIssue[] } {
  const sortedIssues = sortValidationIssues(issues)

  return Object.freeze({
    valid: sortedIssues.length === 0,
    issues: Object.freeze(sortedIssues.map((issue) => Object.freeze({ ...issue }))),
  })
}

function freezeEnvelope(envelope: ReleasePackageEnvelope): ReleasePackageEnvelope {
  return Object.freeze({
    status: envelope.status,
    artifactType: envelope.artifactType,
    compatibilityDeclarations: Object.freeze(
      envelope.compatibilityDeclarations.map((declaration) => Object.freeze({ ...declaration }))
    ),
    deliveryAssumptions: Object.freeze([...envelope.deliveryAssumptions]),
    validationIssues: Object.freeze(envelope.validationIssues),
    reasonCodes: Object.freeze([...envelope.reasonCodes]),
    remediationNotes: Object.freeze(envelope.remediationNotes),
    sourceMetadata: envelope.sourceMetadata
      ? Object.freeze({
          ...envelope.sourceMetadata,
          testEvidenceRefs: Object.freeze([...envelope.sourceMetadata.testEvidenceRefs]),
        })
      : undefined,
  })
}

function resolveArtifactType(artifactKind: ContributionArtifactKind): ReleaseArtifactType {
  return ARTIFACT_TYPE_BY_KIND[artifactKind]
}

function buildCompatibilityDeclarations(
  manifest: ReleaseArtifactManifest
): CompatibilityDeclaration[] {
  const declarations: CompatibilityDeclaration[] = []
  const runtimeVersion = normalizeToken(manifest.runtimeVersion)
  const saveFormatVersion = normalizeToken(manifest.saveFormatVersion)
  const schemaRegistryVersion = normalizeToken(manifest.schemaRegistryVersion)
  const breakingChangeNotes = asStringArray(manifest.breakingChangeNotes)

  if (runtimeVersion) {
    declarations.push({
      surface: 'runtime_version',
      declaration: runtimeVersion,
    })
  }

  if (saveFormatVersion) {
    declarations.push({
      surface: 'save_format',
      declaration: saveFormatVersion,
    })
  }

  if (schemaRegistryVersion) {
    declarations.push({
      surface: 'schema_registry',
      declaration: schemaRegistryVersion,
    })
  }

  for (const note of breakingChangeNotes) {
    declarations.push({
      surface: 'breaking_change_callout',
      declaration: note,
    })
  }

  return sortCompatibilityDeclarations(declarations)
}

function buildDeliveryAssumptions(
  manifest: ReleaseArtifactManifest,
  artifactKind: ContributionArtifactKind
): string[] {
  const assumptions: string[] = []
  const deliveryChannel = normalizeToken(manifest.deliveryChannel)
  const consumerScopes = asStringArray(manifest.consumerScopes)
  const artifactPaths = asStringArray(manifest.artifactPaths)

  if (deliveryChannel) {
    assumptions.push(`delivery_channel:${deliveryChannel}`)
  }

  for (const scope of consumerScopes) {
    assumptions.push(`consumer_scope:${scope}`)
  }

  assumptions.push(`artifact_kind:${artifactKind}`)

  if (artifactPaths.length > 0) {
    assumptions.push(`artifact_path_count:${artifactPaths.length}`)
  }

  return assumptions.sort((left, right) => left.localeCompare(right))
}

function collectRequiredManifestIssues(
  manifest: ReleaseArtifactManifest,
  artifactKind: ContributionArtifactKind
): ReleaseManifestValidationIssue[] {
  const issues: ReleaseManifestValidationIssue[] = []
  const artifactPaths = asStringArray(manifest.artifactPaths)
  const runtimeVersion = normalizeToken(manifest.runtimeVersion)
  const saveFormatVersion = normalizeToken(manifest.saveFormatVersion)
  const schemaRegistryVersion = normalizeToken(manifest.schemaRegistryVersion)
  const deliveryChannel = normalizeToken(manifest.deliveryChannel)
  const consumerScopes = asStringArray(manifest.consumerScopes)

  if (artifactPaths.length === 0) {
    issues.push({
      code: 'missing_artifact_paths',
      severity: 'error',
      detail: 'Release artifact manifest must declare at least one artifact path.',
    })
  }

  switch (artifactKind) {
    case 'code':
      if (!runtimeVersion) {
        issues.push({
          code: 'missing_runtime_version',
          severity: 'error',
          detail: 'Code artifacts require runtimeVersion in the release manifest.',
        })
      }

      if (!schemaRegistryVersion) {
        issues.push({
          code: 'missing_schema_registry_version',
          severity: 'error',
          detail: 'Code artifacts require schemaRegistryVersion in the release manifest.',
        })
      }
      break
    case 'docs':
      if (!schemaRegistryVersion) {
        issues.push({
          code: 'missing_schema_registry_version',
          severity: 'error',
          detail: 'Documentation artifacts require schemaRegistryVersion in the release manifest.',
        })
      }

      if (!deliveryChannel) {
        issues.push({
          code: 'missing_delivery_channel',
          severity: 'error',
          detail: 'Documentation artifacts require deliveryChannel in the release manifest.',
        })
      }
      break
    case 'content':
      if (!deliveryChannel) {
        issues.push({
          code: 'missing_delivery_channel',
          severity: 'error',
          detail: 'Content artifacts require deliveryChannel in the release manifest.',
        })
      }

      if (consumerScopes.length === 0) {
        issues.push({
          code: 'missing_consumer_scopes',
          severity: 'error',
          detail: 'Content artifacts require consumerScopes in the release manifest.',
        })
      }
      break
    case 'mixed':
      if (!runtimeVersion) {
        issues.push({
          code: 'missing_runtime_version',
          severity: 'error',
          detail: 'Mixed artifacts require runtimeVersion in the release manifest.',
        })
      }

      if (!saveFormatVersion) {
        issues.push({
          code: 'missing_save_format_version',
          severity: 'error',
          detail: 'Mixed artifacts require saveFormatVersion in the release manifest.',
        })
      }

      if (!schemaRegistryVersion) {
        issues.push({
          code: 'missing_schema_registry_version',
          severity: 'error',
          detail: 'Mixed artifacts require schemaRegistryVersion in the release manifest.',
        })
      }

      if (!deliveryChannel) {
        issues.push({
          code: 'missing_delivery_channel',
          severity: 'error',
          detail: 'Mixed artifacts require deliveryChannel in the release manifest.',
        })
      }
      break
    default: {
      const _exhaustive: never = artifactKind
      return _exhaustive
    }
  }

  return issues
}

function collectRemediationNotes(
  manifest: ReleaseArtifactManifest,
  artifactKind: ContributionArtifactKind
): ReleaseManifestRemediationNote[] {
  const notes: ReleaseManifestRemediationNote[] = []
  const saveFormatVersion = normalizeToken(manifest.saveFormatVersion)
  const deliveryChannel = normalizeToken(manifest.deliveryChannel)
  const breakingChangeNotes = asStringArray(manifest.breakingChangeNotes)

  if (artifactKind === 'code' && !saveFormatVersion) {
    notes.push({
      code: 'save_format_version_recommended',
      note: 'Declare saveFormatVersion so downstream consumers can evaluate save compatibility.',
    })
  }

  if (artifactKind === 'content' && !deliveryChannel) {
    notes.push({
      code: 'delivery_channel_recommended',
      note: 'Declare deliveryChannel so content accessories route to the correct publish surface.',
    })
  }

  if (
    (artifactKind === 'code' || artifactKind === 'mixed') &&
    breakingChangeNotes.length === 0
  ) {
    notes.push({
      code: 'breaking_change_notes_recommended',
      note: 'Add breakingChangeNotes when the release changes compatibility surfaces.',
    })
  }

  return sortRemediationNotes(notes)
}

function validateCurationGate(
  curationDecision: ContributionCurationDecision
): ReleaseManifestValidationIssue[] {
  if (!curationDecision || typeof curationDecision !== 'object') {
    return [
      {
        code: 'invalid_manifest',
        severity: 'error',
        detail: 'Release packaging requires a curation decision object.',
      },
    ]
  }

  if (curationDecision.status !== 'accepted') {
    return [
      {
        code: 'curation_not_accepted',
        severity: 'error',
        detail: `Release packaging requires accepted curation status; received "${curationDecision.status}".`,
      },
    ]
  }

  if (!curationDecision.normalizedMetadata) {
    return [
      {
        code: 'missing_normalized_metadata',
        severity: 'error',
        detail: 'Accepted curation decisions must include normalizedMetadata for packaging.',
      },
    ]
  }

  return []
}

function validateManifestShape(manifest: unknown): ReleaseManifestValidationIssue[] {
  if (!manifest || typeof manifest !== 'object') {
    return [
      {
        code: 'invalid_manifest',
        severity: 'error',
        detail: 'Release artifact manifest must be an object.',
      },
    ]
  }

  return []
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validateReleaseArtifactManifest(
  curationDecision: ContributionCurationDecision,
  manifest?: ReleaseArtifactManifest
): { readonly valid: boolean; readonly issues: readonly ReleaseManifestValidationIssue[] } {
  const gateIssues = validateCurationGate(curationDecision)
  if (gateIssues.length > 0) {
    return freezeValidationResult(gateIssues)
  }

  const shapeIssues = validateManifestShape(manifest)
  if (shapeIssues.length > 0) {
    return freezeValidationResult(shapeIssues)
  }

  const artifactKind = curationDecision.normalizedMetadata!.artifactKind
  const manifestIssues = collectRequiredManifestIssues(manifest!, artifactKind)

  return freezeValidationResult(manifestIssues)
}

/**
 * SPE-75 follow-up baseline: deterministic post-curation release packaging with
 * bounded compatibility declarations and delivery assumptions — no publish side effects.
 */
export function evaluateModularReleasePackaging(
  curationDecision: ContributionCurationDecision,
  manifest?: ReleaseArtifactManifest
): ReleasePackageEnvelope {
  const gateIssues = validateCurationGate(curationDecision)
  if (gateIssues.length > 0) {
    const reasonCodes = [...new Set(gateIssues.map((issue) => issue.code))].sort((left, right) =>
      left.localeCompare(right)
    )

    return freezeEnvelope({
      status: 'rejected',
      compatibilityDeclarations: Object.freeze([]),
      deliveryAssumptions: Object.freeze([]),
      validationIssues: Object.freeze(gateIssues),
      reasonCodes,
      remediationNotes: Object.freeze([]),
    })
  }

  const shapeIssues = validateManifestShape(manifest)
  if (shapeIssues.length > 0) {
    const reasonCodes = [...new Set(shapeIssues.map((issue) => issue.code))].sort((left, right) =>
      left.localeCompare(right)
    )

    return freezeEnvelope({
      status: 'rejected',
      compatibilityDeclarations: Object.freeze([]),
      deliveryAssumptions: Object.freeze([]),
      validationIssues: Object.freeze(shapeIssues),
      reasonCodes,
      remediationNotes: Object.freeze([]),
    })
  }

  const normalizedMetadata = curationDecision.normalizedMetadata!
  const artifactKind = normalizedMetadata.artifactKind
  const manifestIssues = collectRequiredManifestIssues(manifest!, artifactKind)

  if (manifestIssues.length > 0) {
    const reasonCodes = [...new Set(manifestIssues.map((issue) => issue.code))].sort((left, right) =>
      left.localeCompare(right)
    )

    return freezeEnvelope({
      status: 'rejected',
      compatibilityDeclarations: Object.freeze([]),
      deliveryAssumptions: Object.freeze([]),
      validationIssues: Object.freeze(sortValidationIssues(manifestIssues)),
      reasonCodes,
      remediationNotes: Object.freeze([]),
    })
  }

  const remediationNotes = sortRemediationNotes(collectRemediationNotes(manifest!, artifactKind))

  if (remediationNotes.length > 0) {
    const reasonCodes = remediationNotes
      .map((note) => note.code)
      .sort((left, right) => left.localeCompare(right))

    return freezeEnvelope({
      status: 'needs_revision',
      artifactType: resolveArtifactType(artifactKind),
      compatibilityDeclarations: Object.freeze(buildCompatibilityDeclarations(manifest!)),
      deliveryAssumptions: Object.freeze(buildDeliveryAssumptions(manifest!, artifactKind)),
      validationIssues: Object.freeze([]),
      reasonCodes,
      remediationNotes: Object.freeze(remediationNotes.map((note) => Object.freeze({ ...note }))),
    })
  }

  return freezeEnvelope({
    status: 'packaged',
    artifactType: resolveArtifactType(artifactKind),
    compatibilityDeclarations: Object.freeze(buildCompatibilityDeclarations(manifest!)),
    deliveryAssumptions: Object.freeze(buildDeliveryAssumptions(manifest!, artifactKind)),
    validationIssues: Object.freeze([]),
    reasonCodes: Object.freeze([]),
    remediationNotes: Object.freeze([]),
    sourceMetadata: normalizedMetadata,
  })
}
