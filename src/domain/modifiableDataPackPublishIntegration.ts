/**
 * SPE-2494 slice 3: modifiable data-pack import → publish-intent integration.
 *
 * Pure deterministic composition that connects SPE-2479 pack validation/import
 * with the SPE-2480 publish-automation upstream chain — no persistence, UI, or
 * publish execution side effects.
 */

import type {
  ContributionCurationPolicy,
  ContributionSubmissionPayload,
} from './contributionIntakeCuration'
import { evaluateContributionIntakeCuration } from './contributionIntakeCuration'
import type { ReleaseArtifactManifest } from './modularReleasePackaging'
import {
  CANONICAL_RELEASE_ARTIFACT_MANIFEST_FIXTURE,
  evaluateModularReleasePackaging,
} from './modularReleasePackaging'
import type {
  DataPackValidationPolicy,
  ModifiableDataPackKind,
  ModifiableDataPackPayload,
  ModifiableDataPackRecord,
} from './modifiableDataPackValidation'
import {
  CANONICAL_MODIFIABLE_DATA_PACK_FIXTURE,
  composeModifiableDataPackRecord,
} from './modifiableDataPackValidation'
import type {
  PublishAutomationDecision,
  PublishAutomationPolicy,
  PublishCreditingManifest,
} from './publishAutomationCreditingHooks'
import {
  CANONICAL_PUBLISH_CREDITING_MANIFEST_FIXTURE,
  evaluatePublishAutomationCreditingHooks,
} from './publishAutomationCreditingHooks'
import type { SubmissionGovernancePayload } from './submissionGovernanceRights'
import {
  CANONICAL_SUBMISSION_GOVERNANCE_FIXTURE,
  evaluateSubmissionGovernanceRights,
} from './submissionGovernanceRights'

// ---------------------------------------------------------------------------
// Identifiers and envelopes
// ---------------------------------------------------------------------------

export type ModifiableDataPackPublishIntegrationCode =
  | 'pack_import_rejected'
  | 'pack_import_needs_revision'

export interface ModifiableDataPackPublishIntegrationIssue {
  readonly code: ModifiableDataPackPublishIntegrationCode
  readonly severity: 'error' | 'info'
  readonly detail: string
}

export interface ModifiableDataPackPublishIntegrationInput {
  readonly packPayload?: ModifiableDataPackPayload
  readonly contributionPayload?: ContributionSubmissionPayload
  readonly releaseManifest?: ReleaseArtifactManifest
  readonly governancePayload?: SubmissionGovernancePayload
  readonly creditingManifest?: PublishCreditingManifest
  readonly dataPackPolicy?: DataPackValidationPolicy
  readonly contributionPolicy?: ContributionCurationPolicy
  readonly publishPolicy?: PublishAutomationPolicy
}

export interface ModifiableDataPackPublishIntegrationEnvelope {
  readonly record: ModifiableDataPackRecord | null
  readonly publishDecision: PublishAutomationDecision | null
  readonly validationIssues: readonly ModifiableDataPackPublishIntegrationIssue[]
  readonly reasonCodes: readonly string[]
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

export const CANONICAL_MODIFIABLE_DATA_PACK_PUBLISH_INTEGRATION_INPUT: ModifiableDataPackPublishIntegrationInput =
  Object.freeze({
    packPayload: CANONICAL_MODIFIABLE_DATA_PACK_FIXTURE,
    releaseManifest: CANONICAL_RELEASE_ARTIFACT_MANIFEST_FIXTURE,
    governancePayload: CANONICAL_SUBMISSION_GOVERNANCE_FIXTURE,
    creditingManifest: CANONICAL_PUBLISH_CREDITING_MANIFEST_FIXTURE,
  })

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sortIntegrationIssues(
  issues: ModifiableDataPackPublishIntegrationIssue[]
): ModifiableDataPackPublishIntegrationIssue[] {
  return [...issues].sort((left, right) => {
    const codeOrder = left.code.localeCompare(right.code)
    if (codeOrder !== 0) {
      return codeOrder
    }

    return left.detail.localeCompare(right.detail)
  })
}

function sortReasonCodes(reasonCodes: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(reasonCodes)].sort((left, right) => left.localeCompare(right)))
}

function freezeIntegrationEnvelope(
  envelope: ModifiableDataPackPublishIntegrationEnvelope
): ModifiableDataPackPublishIntegrationEnvelope {
  return Object.freeze({
    record: envelope.record,
    publishDecision: envelope.publishDecision,
    validationIssues: Object.freeze(
      envelope.validationIssues.map((issue) => Object.freeze({ ...issue }))
    ),
    reasonCodes: sortReasonCodes(envelope.reasonCodes),
  })
}

function rejectEnvelope(
  detail: string,
  code: ModifiableDataPackPublishIntegrationCode = 'pack_import_rejected'
): ModifiableDataPackPublishIntegrationEnvelope {
  return freezeIntegrationEnvelope({
    record: null,
    publishDecision: null,
    validationIssues: Object.freeze([
      Object.freeze({
        code,
        severity: 'error',
        detail,
      }),
    ]),
    reasonCodes: Object.freeze([code]),
  })
}

function mapPackKindToArtifactKind(
  packKind: ModifiableDataPackKind
): ContributionSubmissionPayload['artifactKind'] {
  switch (packKind) {
    case 'tuning_table':
    case 'content_accessory':
      return 'content'
    case 'reference_sheet':
    case 'doctrine_note':
      return 'docs'
    default: {
      const _exhaustive: never = packKind
      return _exhaustive
    }
  }
}

function deriveContributionSubmissionFromPack(
  record: ModifiableDataPackRecord
): ContributionSubmissionPayload {
  const sectionCount = record.modifiableSections.length

  return Object.freeze({
    submissionId: `submission:${record.packId}`,
    contributorRef: record.authorRef,
    issueLink: record.issueLink,
    title: `Modifiable data pack ${record.packId}`,
    scopeStatement: `Import modifiable data pack ${record.packId} with ${sectionCount} typed sections through the SPE-75 publish-automation integration pipeline.`,
    artifactKind: mapPackKindToArtifactKind(record.packKind),
    summary:
      `Deterministic modifiable data pack (${record.packKind}) import and publish-intent integration ` +
      `for ${record.packId} with schema version ${record.schemaVersion}.`,
    testEvidenceRefs: Object.freeze(['src/test/modifiableDataPackPublishIntegration.test.ts']),
    licenseDeclaration: 'MIT',
  })
}

function applyPackImportStatusGate(
  record: ModifiableDataPackRecord,
  publishDecision: PublishAutomationDecision
): {
  readonly publishDecision: PublishAutomationDecision
  readonly validationIssues: readonly ModifiableDataPackPublishIntegrationIssue[]
  readonly reasonCodes: readonly string[]
} {
  if (record.importStatus !== 'needs_revision' || publishDecision.status !== 'ready_to_publish') {
    return {
      publishDecision,
      validationIssues: Object.freeze([]),
      reasonCodes: publishDecision.reasonCodes,
    }
  }

  const packIssue: ModifiableDataPackPublishIntegrationIssue = Object.freeze({
    code: 'pack_import_needs_revision',
    severity: 'info',
    detail: `Modifiable data-pack record "${record.packId}" has importStatus needs_revision — publish-intent capped from ready_to_publish.`,
  })

  const reasonCodes = sortReasonCodes([
    ...publishDecision.reasonCodes,
    'pack_import_needs_revision',
    ...record.reasonCodes,
  ])

  return {
    publishDecision: Object.freeze({
      ...publishDecision,
      status: 'needs_revision',
      reasonCodes,
    }),
    validationIssues: Object.freeze([packIssue]),
    reasonCodes,
  }
}

/**
 * SPE-2494 baseline: deterministic modifiable data-pack import composed with
 * contribution intake → release packaging → governance → publish-intent evaluation.
 */
export function evaluateModifiableDataPackPublishIntegration(
  input: ModifiableDataPackPublishIntegrationInput = {}
): ModifiableDataPackPublishIntegrationEnvelope {
  const record = composeModifiableDataPackRecord(input.packPayload, input.dataPackPolicy)

  if (!record) {
    return rejectEnvelope(
      'Modifiable data-pack payload failed validation — no record composed and no publish-intent evaluation performed.'
    )
  }

  const contributionPayload =
    input.contributionPayload ?? deriveContributionSubmissionFromPack(record)
  const curationDecision = evaluateContributionIntakeCuration(
    contributionPayload,
    input.contributionPolicy
  )
  const releasePackage = evaluateModularReleasePackaging(
    curationDecision,
    input.releaseManifest
  )
  const governanceDecision = evaluateSubmissionGovernanceRights(input.governancePayload)
  const publishDecision = evaluatePublishAutomationCreditingHooks(
    releasePackage,
    governanceDecision,
    input.creditingManifest,
    input.publishPolicy
  )

  const gated = applyPackImportStatusGate(record, publishDecision)

  return freezeIntegrationEnvelope({
    record,
    publishDecision: gated.publishDecision,
    validationIssues: Object.freeze(sortIntegrationIssues([...gated.validationIssues])),
    reasonCodes: gated.reasonCodes,
  })
}
