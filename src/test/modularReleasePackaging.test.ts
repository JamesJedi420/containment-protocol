import { describe, expect, it } from 'vitest'

import {
  BORDERLINE_CONTRIBUTION_SUBMISSION_FIXTURE,
  CANONICAL_CONTRIBUTION_SUBMISSION_FIXTURE,
  evaluateContributionIntakeCuration,
  INVALID_CONTRIBUTION_SUBMISSION_FIXTURE,
} from '../domain/contributionIntakeCuration'
import {
  BORDERLINE_RELEASE_ARTIFACT_MANIFEST_FIXTURE,
  CANONICAL_RELEASE_ARTIFACT_MANIFEST_FIXTURE,
  evaluateModularReleasePackaging,
  INVALID_RELEASE_ARTIFACT_MANIFEST_FIXTURE,
  validateReleaseArtifactManifest,
} from '../domain/modularReleasePackaging'

describe('modularReleasePackaging (SPE-2475 slice 1)', () => {
  const acceptedCuration = evaluateContributionIntakeCuration(
    CANONICAL_CONTRIBUTION_SUBMISSION_FIXTURE
  )

  it('packages the canonical accepted curation + manifest fixture with stable envelope', () => {
    const envelope = evaluateModularReleasePackaging(
      acceptedCuration,
      CANONICAL_RELEASE_ARTIFACT_MANIFEST_FIXTURE
    )

    expect(envelope.status).toBe('packaged')
    expect(envelope.validationIssues).toEqual([])
    expect(envelope.reasonCodes).toEqual([])
    expect(envelope.remediationNotes).toEqual([])
    expect(envelope.artifactType).toBe('domain_code_bundle')
    expect(envelope.compatibilityDeclarations).toEqual([
      {
        surface: 'breaking_change_callout',
        declaration: 'No breaking compatibility surface changes in this baseline release.',
      },
      { surface: 'runtime_version', declaration: 'node-22' },
      { surface: 'save_format', declaration: 'save-v1' },
      { surface: 'schema_registry', declaration: 'SCHEMA_REGISTRY.md@main' },
    ])
    expect(envelope.deliveryAssumptions).toEqual([
      'artifact_kind:code',
      'artifact_path_count:2',
      'consumer_scope:agent-packaging-pipeline',
      'consumer_scope:domain-maintainers',
      'delivery_channel:pr-merge',
    ])
    expect(envelope.sourceMetadata?.submissionId).toBe('submission:domain-template-canonical')
  })

  it('rejects non-accepted curation and missing compatibility fields with deterministic reason codes', () => {
    const rejectedCuration = evaluateContributionIntakeCuration(
      INVALID_CONTRIBUTION_SUBMISSION_FIXTURE
    )
    const rejectedEnvelope = evaluateModularReleasePackaging(
      rejectedCuration,
      CANONICAL_RELEASE_ARTIFACT_MANIFEST_FIXTURE
    )

    expect(rejectedEnvelope.status).toBe('rejected')
    expect(rejectedEnvelope.artifactType).toBeUndefined()
    expect(rejectedEnvelope.reasonCodes).toEqual(['curation_not_accepted'])
    expect(rejectedEnvelope.validationIssues[0]?.code).toBe('curation_not_accepted')

    const missingCompatibilityEnvelope = evaluateModularReleasePackaging(
      acceptedCuration,
      INVALID_RELEASE_ARTIFACT_MANIFEST_FIXTURE
    )

    expect(missingCompatibilityEnvelope.status).toBe('rejected')
    expect(missingCompatibilityEnvelope.reasonCodes).toEqual([
      'missing_artifact_paths',
      'missing_runtime_version',
      'missing_schema_registry_version',
    ])
    expect(missingCompatibilityEnvelope.validationIssues.map((issue) => issue.code)).toEqual(
      missingCompatibilityEnvelope.reasonCodes
    )
  })

  it('returns needs_revision for the borderline manifest fixture with bounded remediation notes', () => {
    const borderlineCuration = evaluateContributionIntakeCuration(
      BORDERLINE_CONTRIBUTION_SUBMISSION_FIXTURE
    )

    const envelope = evaluateModularReleasePackaging(
      acceptedCuration,
      BORDERLINE_RELEASE_ARTIFACT_MANIFEST_FIXTURE
    )

    expect(envelope.status).toBe('needs_revision')
    expect(envelope.validationIssues).toEqual([])
    expect(envelope.artifactType).toBe('domain_code_bundle')
    expect(envelope.reasonCodes).toEqual([
      'breaking_change_notes_recommended',
      'save_format_version_recommended',
    ])
    expect(envelope.remediationNotes).toHaveLength(2)
    expect(envelope.remediationNotes[0]?.code).toBe('breaking_change_notes_recommended')
    expect(envelope.remediationNotes[1]?.code).toBe('save_format_version_recommended')
    expect(envelope.compatibilityDeclarations).toEqual([
      { surface: 'runtime_version', declaration: 'node-22' },
      { surface: 'schema_registry', declaration: 'SCHEMA_REGISTRY.md@main' },
    ])

    const notAccepted = evaluateModularReleasePackaging(
      borderlineCuration,
      BORDERLINE_RELEASE_ARTIFACT_MANIFEST_FIXTURE
    )
    expect(notAccepted.status).toBe('rejected')
    expect(notAccepted.reasonCodes).toEqual(['curation_not_accepted'])
  })

  it('safe-fails malformed post-curation payloads without throw', () => {
    const validation = validateReleaseArtifactManifest(null as unknown as never)
    const envelope = evaluateModularReleasePackaging(undefined as unknown as never)

    expect(validation.valid).toBe(false)
    expect(validation.issues[0]?.code).toBe('invalid_manifest')
    expect(envelope.status).toBe('rejected')
    expect(envelope.reasonCodes).toEqual(['invalid_manifest'])
  })

  it('returns byte-stable output on repeated evaluation calls', () => {
    const curationDecisions = [
      acceptedCuration,
      evaluateContributionIntakeCuration(INVALID_CONTRIBUTION_SUBMISSION_FIXTURE),
      acceptedCuration,
    ] as const

    const manifests = [
      CANONICAL_RELEASE_ARTIFACT_MANIFEST_FIXTURE,
      INVALID_RELEASE_ARTIFACT_MANIFEST_FIXTURE,
      BORDERLINE_RELEASE_ARTIFACT_MANIFEST_FIXTURE,
    ] as const

    for (let index = 0; index < curationDecisions.length; index += 1) {
      const curationDecision = curationDecisions[index]!
      const manifest = manifests[index]!
      const first = evaluateModularReleasePackaging(curationDecision, manifest)
      const second = evaluateModularReleasePackaging(curationDecision, manifest)

      expect(first).toEqual(second)
    }
  })
})
