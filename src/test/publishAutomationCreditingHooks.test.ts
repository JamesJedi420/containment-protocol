import { describe, expect, it } from 'vitest'

import {
  CANONICAL_CONTRIBUTION_SUBMISSION_FIXTURE,
  evaluateContributionIntakeCuration,
  INVALID_CONTRIBUTION_SUBMISSION_FIXTURE,
} from '../domain/contributionIntakeCuration'
import {
  CANONICAL_RELEASE_ARTIFACT_MANIFEST_FIXTURE,
  evaluateModularReleasePackaging,
  INVALID_RELEASE_ARTIFACT_MANIFEST_FIXTURE,
} from '../domain/modularReleasePackaging'
import {
  BORDERLINE_PUBLISH_CREDITING_MANIFEST_FIXTURE,
  CANONICAL_PUBLISH_CREDITING_MANIFEST_FIXTURE,
  evaluatePublishAutomationCreditingHooks,
  INVALID_PUBLISH_CREDITING_MANIFEST_FIXTURE,
  validatePublishAutomationInputs,
} from '../domain/publishAutomationCreditingHooks'
import {
  CANONICAL_SUBMISSION_GOVERNANCE_FIXTURE,
  evaluateSubmissionGovernanceRights,
  MISSING_LICENSE_GOVERNANCE_FIXTURE,
} from '../domain/submissionGovernanceRights'

describe('publishAutomationCreditingHooks (SPE-2480 slice 1)', () => {
  const acceptedCuration = evaluateContributionIntakeCuration(
    CANONICAL_CONTRIBUTION_SUBMISSION_FIXTURE
  )
  const packagedRelease = evaluateModularReleasePackaging(
    acceptedCuration,
    CANONICAL_RELEASE_ARTIFACT_MANIFEST_FIXTURE
  )
  const appliedGovernance = evaluateSubmissionGovernanceRights(
    CANONICAL_SUBMISSION_GOVERNANCE_FIXTURE
  )

  it('returns ready_to_publish for the canonical upstream fixture chain with stable hooks', () => {
    const decision = evaluatePublishAutomationCreditingHooks(
      packagedRelease,
      appliedGovernance,
      CANONICAL_PUBLISH_CREDITING_MANIFEST_FIXTURE
    )

    expect(decision.status).toBe('ready_to_publish')
    expect(decision.validationIssues).toEqual([])
    expect(decision.reasonCodes).toEqual([])
    expect(decision.remediationNotes).toEqual([])
    expect(decision.publishMetadata).toEqual({
      versionBumpRef: 'package.json:version',
      publishChannel: 'pr-merge',
      contributorRef: 'contributor:agent-maintainer',
      rightsTier: 'canonical',
      artifactType: 'domain_code_bundle',
      creditingTargetCount: 2,
    })
    expect(decision.creditingHooks).toEqual([
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
    ])
    expect(decision.publishHooks).toEqual([
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

  it('rejects non-packaged release and non-applied governance with deterministic reason codes', () => {
    const rejectedCuration = evaluateContributionIntakeCuration(
      INVALID_CONTRIBUTION_SUBMISSION_FIXTURE
    )
    const rejectedRelease = evaluateModularReleasePackaging(
      rejectedCuration,
      CANONICAL_RELEASE_ARTIFACT_MANIFEST_FIXTURE
    )

    const rejectedReleaseDecision = evaluatePublishAutomationCreditingHooks(
      rejectedRelease,
      appliedGovernance,
      CANONICAL_PUBLISH_CREDITING_MANIFEST_FIXTURE
    )

    expect(rejectedReleaseDecision.status).toBe('rejected')
    expect(rejectedReleaseDecision.reasonCodes).toEqual(['release_not_packaged'])
    expect(rejectedReleaseDecision.validationIssues[0]?.code).toBe('release_not_packaged')

    const rejectedGovernance = evaluateSubmissionGovernanceRights(
      MISSING_LICENSE_GOVERNANCE_FIXTURE
    )
    const rejectedGovernanceDecision = evaluatePublishAutomationCreditingHooks(
      packagedRelease,
      rejectedGovernance,
      CANONICAL_PUBLISH_CREDITING_MANIFEST_FIXTURE
    )

    expect(rejectedGovernanceDecision.status).toBe('rejected')
    expect(rejectedGovernanceDecision.reasonCodes).toEqual(['governance_not_applied'])
    expect(rejectedGovernanceDecision.validationIssues[0]?.code).toBe('governance_not_applied')

    const invalidManifestDecision = evaluatePublishAutomationCreditingHooks(
      packagedRelease,
      appliedGovernance,
      INVALID_PUBLISH_CREDITING_MANIFEST_FIXTURE
    )

    expect(invalidManifestDecision.status).toBe('rejected')
    expect(invalidManifestDecision.reasonCodes).toEqual([
      'missing_changelog_entry',
      'missing_contributor_credit_refs',
      'missing_crediting_targets',
      'missing_publish_channel',
      'missing_version_bump_ref',
    ])
    expect(invalidManifestDecision.validationIssues.map((issue) => issue.code)).toEqual(
      invalidManifestDecision.reasonCodes
    )
  })

  it('returns needs_revision for the borderline crediting manifest with bounded remediation notes', () => {
    const decision = evaluatePublishAutomationCreditingHooks(
      packagedRelease,
      appliedGovernance,
      BORDERLINE_PUBLISH_CREDITING_MANIFEST_FIXTURE
    )

    expect(decision.status).toBe('needs_revision')
    expect(decision.validationIssues).toEqual([])
    expect(decision.reasonCodes).toEqual([
      'announcement_segments_recommended',
      'crediting_targets_borderline',
    ])
    expect(decision.remediationNotes).toHaveLength(2)
    expect(decision.remediationNotes[0]?.code).toBe('announcement_segments_recommended')
    expect(decision.remediationNotes[1]?.code).toBe('crediting_targets_borderline')
    expect(decision.publishMetadata?.creditingTargetCount).toBe(1)
    expect(decision.creditingHooks.length).toBeGreaterThan(0)
    expect(decision.publishHooks).toEqual([
      {
        kind: 'publish_channel',
        target: 'pr-merge',
        payload: 'channel:pr-merge',
      },
    ])
  })

  it('safe-fails malformed upstream payloads without throw', () => {
    const validation = validatePublishAutomationInputs(undefined, undefined, undefined)
    const decision = evaluatePublishAutomationCreditingHooks(undefined, undefined, undefined)

    expect(validation.valid).toBe(false)
    expect(validation.issues[0]?.code).toBe('invalid_upstream_envelope')
    expect(decision.status).toBe('rejected')
    expect(decision.reasonCodes).toEqual(['invalid_upstream_envelope'])
  })

  it('returns byte-stable output on repeated evaluation calls', () => {
    const notPackagedRelease = evaluateModularReleasePackaging(
      acceptedCuration,
      INVALID_RELEASE_ARTIFACT_MANIFEST_FIXTURE
    )
    const rejectedGovernance = evaluateSubmissionGovernanceRights(
      MISSING_LICENSE_GOVERNANCE_FIXTURE
    )

    const releasePackages = [packagedRelease, notPackagedRelease, packagedRelease] as const
    const governanceDecisions = [appliedGovernance, appliedGovernance, rejectedGovernance] as const
    const manifests = [
      CANONICAL_PUBLISH_CREDITING_MANIFEST_FIXTURE,
      INVALID_PUBLISH_CREDITING_MANIFEST_FIXTURE,
      BORDERLINE_PUBLISH_CREDITING_MANIFEST_FIXTURE,
    ] as const

    for (let index = 0; index < releasePackages.length; index += 1) {
      const releasePackage = releasePackages[index]!
      const governanceDecision = governanceDecisions[index]!
      const manifest = manifests[index]!
      const first = evaluatePublishAutomationCreditingHooks(
        releasePackage,
        governanceDecision,
        manifest
      )
      const second = evaluatePublishAutomationCreditingHooks(
        releasePackage,
        governanceDecision,
        manifest
      )

      expect(first).toEqual(second)
    }
  })
})
