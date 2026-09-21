import { describe, expect, it } from 'vitest'

import {
  discussionDecisionFingerprint,
  reconcileDiscussionDecisions,
  type DiscussionSignal,
} from '../domain/discussionDecisionReconciliation'

const signals: readonly DiscussionSignal[] = [
  {
    signalId: 'decision-old',
    kind: 'confirmed_decision',
    statement: 'Use the legacy routing rule.',
    provenance: { sourceId: 'chat-1', messageId: 'm1', ordinal: 1 },
    ownerIssueId: 'SPE-1705',
  },
  {
    signalId: 'decision-new',
    kind: 'changed_assumption',
    statement: 'Use Linear as planning authority and GitHub as implementation evidence.',
    provenance: { sourceId: 'chat-1', messageId: 'm2', ordinal: 2 },
    supersedesSignalIds: ['decision-old'],
    ownerIssueId: 'SPE-1705',
  },
  {
    signalId: 'disagreement',
    kind: 'unresolved_disagreement',
    statement: 'The writeback owner remains disputed.',
    provenance: { sourceId: 'chat-1', messageId: 'm3', ordinal: 3 },
    ownerIssueId: 'SPE-1705',
  },
  {
    signalId: 'promise',
    kind: 'implementation_promise',
    statement: 'The reconciliation helper is implemented.',
    provenance: { sourceId: 'chat-1', messageId: 'm4', ordinal: 4 },
    ownerIssueId: 'SPE-2905',
    implementationRef: 'pr:4000',
  },
]

describe('discussionDecisionReconciliation (SPE-2905)', () => {
  it('preserves provenance and resolves supersession before routing', () => {
    const result = reconcileDiscussionDecisions({
      signals,
      linearRecords: [
        { issueId: 'SPE-1705', status: 'backlog' },
        { issueId: 'SPE-2905', status: 'started' },
      ],
    })

    expect(result.candidates[0]).toMatchObject({
      signalId: 'decision-old',
      disposition: 'no_op',
      supersededBySignalId: 'decision-new',
      provenance: { sourceId: 'chat-1', messageId: 'm1', ordinal: 1 },
    })
    expect(result.candidates[1]).toMatchObject({
      signalId: 'decision-new',
      disposition: 'linear_update',
    })
    expect(result.candidates[2]).toMatchObject({
      signalId: 'disagreement',
      disposition: 'unresolved_contradiction',
    })
  })

  it('does not treat an implementation promise as shipped without verified GitHub evidence', () => {
    const withoutEvidence = reconcileDiscussionDecisions({
      signals: [signals[3]!],
      linearRecords: [{ issueId: 'SPE-2905', status: 'started' }],
    })

    expect(withoutEvidence.candidates[0]).toMatchObject({
      disposition: 'linear_update',
      reasons: ['implementation_promise_is_planning_only_without_verified_github_evidence'],
    })

    const withEvidence = reconcileDiscussionDecisions({
      signals: [signals[3]!],
      linearRecords: [{ issueId: 'SPE-2905', status: 'started' }],
      githubEvidence: [
        {
          ref: 'pr:4000',
          verified: true,
          merged: true,
          testEvidence: ['src/test/discussionDecisionReconciliation.test.ts'],
        },
      ],
    })

    expect(withEvidence.candidates[0]).toMatchObject({
      disposition: 'github_update',
      reasons: ['verified_merged_github_implementation_evidence'],
    })
  })

  it('returns no-op when Linear already records the canonical statement', () => {
    const signal = signals[1]!
    const result = reconcileDiscussionDecisions({
      signals: [signal],
      linearRecords: [
        {
          issueId: 'SPE-1705',
          status: 'backlog',
          canonicalStatements: [
            'Use Linear as planning authority and GitHub as implementation evidence.',
          ],
        },
      ],
    })

    expect(result.candidates[0]).toMatchObject({
      disposition: 'no_op',
      reasons: ['linear_authority_already_records_statement'],
    })
    expect(result.writebackCandidates).toEqual([])
  })

  it('routes documentation consequences through the existing docs owner', () => {
    const result = reconcileDiscussionDecisions({
      signals: [
        {
          signalId: 'docs',
          kind: 'confirmed_decision',
          statement: 'Clarify the source extraction rubric.',
          provenance: { sourceId: 'chat-2', messageId: 'm1', ordinal: 1 },
          ownerIssueId: 'SPE-1705',
          documentationOnly: true,
        },
      ],
      linearRecords: [{ issueId: 'SPE-1705', status: 'backlog' }],
    })

    expect(result.candidates[0]?.disposition).toBe('documentation_consequence')
  })

  it('never reopens completed/canceled owners and only emits a missing-boundary candidate', () => {
    const result = reconcileDiscussionDecisions({
      signals: [
        {
          signalId: 'follow-up',
          kind: 'confirmed_decision',
          statement: 'Add a new follow-up behavior.',
          provenance: { sourceId: 'chat-3', messageId: 'm1', ordinal: 1 },
          ownerIssueId: 'SPE-100',
        },
      ],
      linearRecords: [{ issueId: 'SPE-100', status: 'completed' }],
    })

    expect(result.candidates[0]).toMatchObject({
      disposition: 'missing_boundary_candidate',
      reasons: ['existing_linear_owner_is_completed_or_canceled_and_must_not_be_reopened'],
    })
  })

  it('suppresses same-pass duplicates and previously applied writeback fingerprints', () => {
    const first: DiscussionSignal = {
      signalId: 'dup-1',
      kind: 'confirmed_decision',
      statement: 'Keep the smallest existing owner.',
      provenance: { sourceId: 'chat-4', messageId: 'm1', ordinal: 1 },
      ownerIssueId: 'SPE-1705',
    }
    const second: DiscussionSignal = {
      ...first,
      signalId: 'dup-2',
      provenance: { sourceId: 'chat-4', messageId: 'm2', ordinal: 2 },
    }

    const samePass = reconcileDiscussionDecisions({
      signals: [first, second],
      linearRecords: [{ issueId: 'SPE-1705', status: 'backlog' }],
    })

    expect(samePass.candidates.map((candidate) => candidate.disposition)).toEqual([
      'linear_update',
      'no_op',
    ])
    expect(samePass.candidates[1]?.reasons).toContain(
      'duplicate_candidate_in_same_reconciliation_pass'
    )

    const rerun = reconcileDiscussionDecisions({
      signals: [first],
      linearRecords: [{ issueId: 'SPE-1705', status: 'backlog' }],
      previouslyAppliedFingerprints: [discussionDecisionFingerprint(first)],
    })

    expect(rerun.candidates[0]).toMatchObject({
      disposition: 'no_op',
      reasons: ['writeback_fingerprint_already_applied'],
    })
  })

  it('is deterministic for identical inputs', () => {
    const input = {
      signals,
      linearRecords: [
        { issueId: 'SPE-1705', status: 'backlog' as const },
        { issueId: 'SPE-2905', status: 'started' as const },
      ],
      githubEvidence: [{ ref: 'pr:4000', verified: true, merged: false }],
    }

    expect(reconcileDiscussionDecisions(input)).toEqual(reconcileDiscussionDecisions(input))
  })
})
