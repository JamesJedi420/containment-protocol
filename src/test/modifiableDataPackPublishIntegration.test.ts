import { describe, expect, it } from 'vitest'

import {
  CANONICAL_MODIFIABLE_DATA_PACK_FIXTURE,
  CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
  BORDERLINE_SCHEMA_DATA_PACK_FIXTURE,
  BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE,
  INVALID_MODIFIABLE_DATA_PACK_FIXTURE,
  PARTIAL_MODIFIABLE_DATA_PACK_FIXTURE,
} from '../domain/modifiableDataPackValidation'
import {
  CANONICAL_MODIFIABLE_DATA_PACK_PUBLISH_INTEGRATION_INPUT,
  evaluateModifiableDataPackPublishIntegration,
  evaluateModifiableDataPackPublishIntegrationFromRecord,
} from '../domain/modifiableDataPackPublishIntegration'
import {
  CANONICAL_PUBLISH_CREDITING_MANIFEST_FIXTURE,
} from '../domain/publishAutomationCreditingHooks'
import {
  CANONICAL_RELEASE_ARTIFACT_MANIFEST_FIXTURE,
} from '../domain/modularReleasePackaging'
import {
  CANONICAL_SUBMISSION_GOVERNANCE_FIXTURE,
} from '../domain/submissionGovernanceRights'

describe('modifiableDataPackPublishIntegration (SPE-2494 slice 3)', () => {
  it('returns applied record and ready_to_publish publish-intent for the canonical integration chain', () => {
    const envelope = evaluateModifiableDataPackPublishIntegration(
      CANONICAL_MODIFIABLE_DATA_PACK_PUBLISH_INTEGRATION_INPUT
    )

    expect(envelope.record).toEqual(CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE)
    expect(envelope.record?.importStatus).toBe('applied')
    expect(envelope.validationIssues).toEqual([])
    expect(envelope.publishDecision?.status).toBe('ready_to_publish')
    expect(envelope.publishDecision?.publishMetadata).toEqual({
      versionBumpRef: 'package.json:version',
      publishChannel: 'pr-merge',
      contributorRef: 'contributor:agent-maintainer',
      rightsTier: 'canonical',
      artifactType: 'content_accessory',
      creditingTargetCount: 2,
    })
    expect(envelope.publishDecision?.creditingHooks.length).toBeGreaterThan(0)
    expect(envelope.publishDecision?.publishHooks).toEqual([
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
    ])
  })

  it('returns null record and no publish-intent for rejected validation payloads', () => {
    for (const packPayload of [
      INVALID_MODIFIABLE_DATA_PACK_FIXTURE,
      PARTIAL_MODIFIABLE_DATA_PACK_FIXTURE,
      undefined,
    ]) {
      const envelope = evaluateModifiableDataPackPublishIntegration({
        packPayload,
        releaseManifest: CANONICAL_RELEASE_ARTIFACT_MANIFEST_FIXTURE,
        governancePayload: CANONICAL_SUBMISSION_GOVERNANCE_FIXTURE,
        creditingManifest: CANONICAL_PUBLISH_CREDITING_MANIFEST_FIXTURE,
      })

      expect(envelope.record).toBeNull()
      expect(envelope.publishDecision).toBeNull()
      expect(envelope.reasonCodes).toEqual(['pack_import_rejected'])
      expect(envelope.validationIssues[0]?.code).toBe('pack_import_rejected')
    }
  })

  it('caps publish-intent when borderline pack importStatus is needs_revision', () => {
    const envelope = evaluateModifiableDataPackPublishIntegration({
      packPayload: BORDERLINE_SCHEMA_DATA_PACK_FIXTURE,
      releaseManifest: CANONICAL_RELEASE_ARTIFACT_MANIFEST_FIXTURE,
      governancePayload: CANONICAL_SUBMISSION_GOVERNANCE_FIXTURE,
      creditingManifest: CANONICAL_PUBLISH_CREDITING_MANIFEST_FIXTURE,
    })

    expect(envelope.record).toEqual(BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE)
    expect(envelope.record?.importStatus).toBe('needs_revision')
    expect(envelope.publishDecision?.status).toBe('needs_revision')
    expect(envelope.reasonCodes).toContain('pack_import_needs_revision')
    expect(envelope.reasonCodes).toContain('schema_version_borderline')
    expect(envelope.validationIssues[0]?.code).toBe('pack_import_needs_revision')
  })

  it('safe-fails empty integration input without throw', () => {
    expect(() => evaluateModifiableDataPackPublishIntegration({})).not.toThrow()

    const envelope = evaluateModifiableDataPackPublishIntegration({})

    expect(envelope.record).toBeNull()
    expect(envelope.publishDecision).toBeNull()
    expect(envelope.reasonCodes).toEqual(['pack_import_rejected'])
  })

  it('returns byte-stable output on repeated evaluation calls', () => {
    const inputs = [
      CANONICAL_MODIFIABLE_DATA_PACK_PUBLISH_INTEGRATION_INPUT,
      {
        packPayload: BORDERLINE_SCHEMA_DATA_PACK_FIXTURE,
        releaseManifest: CANONICAL_RELEASE_ARTIFACT_MANIFEST_FIXTURE,
        governancePayload: CANONICAL_SUBMISSION_GOVERNANCE_FIXTURE,
        creditingManifest: CANONICAL_PUBLISH_CREDITING_MANIFEST_FIXTURE,
      },
      {
        packPayload: INVALID_MODIFIABLE_DATA_PACK_FIXTURE,
      },
    ] as const

    for (const input of inputs) {
      const first = evaluateModifiableDataPackPublishIntegration(input)
      const second = evaluateModifiableDataPackPublishIntegration(input)

      expect(first).toEqual(second)
    }
  })

  it('derives contribution metadata from pack authorRef and issueLink when omitted', () => {
    const envelope = evaluateModifiableDataPackPublishIntegration({
      packPayload: CANONICAL_MODIFIABLE_DATA_PACK_FIXTURE,
      releaseManifest: CANONICAL_RELEASE_ARTIFACT_MANIFEST_FIXTURE,
      governancePayload: CANONICAL_SUBMISSION_GOVERNANCE_FIXTURE,
      creditingManifest: CANONICAL_PUBLISH_CREDITING_MANIFEST_FIXTURE,
    })

    expect(envelope.record?.authorRef).toBe('contributor:agent-maintainer')
    expect(envelope.record?.issueLink).toBe('SPE-2479')
    expect(envelope.publishDecision?.publishMetadata?.contributorRef).toBe(
      'contributor:agent-maintainer'
    )
  })

  it('evaluates publish-intent from a persisted applied record via fromRecord helper', () => {
    const envelope = evaluateModifiableDataPackPublishIntegrationFromRecord(
      CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE
    )

    expect(envelope.record).toEqual(CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE)
    expect(envelope.publishDecision?.status).toBe('ready_to_publish')
  })
})
