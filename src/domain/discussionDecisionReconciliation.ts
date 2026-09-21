/**
 * SPE-2905: discussion-to-decision extraction and authoritative reconciliation.
 *
 * Pure deterministic governance helper. Connector/API callers supply normalized
 * discussion signals plus current Linear/GitHub authority snapshots; this module
 * never performs tracker writes or creates issues.
 */

export type DiscussionSignalKind =
  | 'confirmed_decision'
  | 'unresolved_disagreement'
  | 'implementation_promise'
  | 'changed_assumption'

export type ReconciliationDisposition =
  | 'no_op'
  | 'linear_update'
  | 'github_update'
  | 'documentation_consequence'
  | 'unresolved_contradiction'
  | 'missing_boundary_candidate'

export interface DiscussionProvenance {
  readonly sourceId: string
  readonly messageId: string
  readonly ordinal: number
}

export interface DiscussionSignal {
  readonly signalId: string
  readonly kind: DiscussionSignalKind
  readonly statement: string
  readonly provenance: DiscussionProvenance
  readonly supersedesSignalIds?: readonly string[]
  readonly ownerIssueId?: string
  readonly documentationOnly?: boolean
  readonly implementationRef?: string
}

export interface LinearAuthorityRecord {
  readonly issueId: string
  readonly canonicalStatements?: readonly string[]
  readonly status?: 'triage' | 'backlog' | 'started' | 'completed' | 'canceled'
}

export interface GitHubImplementationEvidence {
  readonly ref: string
  readonly verified: boolean
  readonly merged?: boolean
  readonly testEvidence?: readonly string[]
}

export interface DiscussionReconciliationInput {
  readonly signals: readonly DiscussionSignal[]
  readonly linearRecords?: readonly LinearAuthorityRecord[]
  readonly githubEvidence?: readonly GitHubImplementationEvidence[]
  readonly previouslyAppliedFingerprints?: readonly string[]
}

export interface DiscussionDecisionCandidate {
  readonly signalId: string
  readonly kind: DiscussionSignalKind
  readonly statement: string
  readonly provenance: DiscussionProvenance
  readonly fingerprint: string
  readonly disposition: ReconciliationDisposition
  readonly ownerIssueId?: string
  readonly implementationRef?: string
  readonly reasons: readonly string[]
  readonly supersededBySignalId?: string
}

export interface DiscussionReconciliationResult {
  readonly candidates: readonly DiscussionDecisionCandidate[]
  readonly writebackCandidates: readonly DiscussionDecisionCandidate[]
}

function normalize(value: string | undefined): string {
  return (value ?? '').trim().replace(/\s+/g, ' ')
}

function normalizeComparable(value: string): string {
  return normalize(value).toLocaleLowerCase()
}

function fingerprintSignal(signal: DiscussionSignal): string {
  return [
    signal.kind,
    normalizeComparable(signal.statement),
    normalize(signal.ownerIssueId),
    normalize(signal.implementationRef),
    signal.documentationOnly ? 'docs' : 'non-docs',
  ].join('|')
}

function buildSupersessionIndex(signals: readonly DiscussionSignal[]): ReadonlyMap<string, string> {
  const index = new Map<string, string>()

  for (const signal of [...signals].sort((a, b) => {
    const sourceOrder = a.provenance.sourceId.localeCompare(b.provenance.sourceId)
    if (sourceOrder !== 0) return sourceOrder
    const ordinalOrder = a.provenance.ordinal - b.provenance.ordinal
    if (ordinalOrder !== 0) return ordinalOrder
    return a.signalId.localeCompare(b.signalId)
  })) {
    for (const supersededId of signal.supersedesSignalIds ?? []) {
      index.set(supersededId, signal.signalId)
    }
  }

  return index
}

function findLinearRecord(
  signal: DiscussionSignal,
  records: readonly LinearAuthorityRecord[]
): LinearAuthorityRecord | undefined {
  if (!signal.ownerIssueId) return undefined
  return records.find((record) => record.issueId === signal.ownerIssueId)
}

function linearAlreadyRecords(
  statement: string,
  record: LinearAuthorityRecord | undefined
): boolean {
  if (!record) return false
  const statementKey = normalizeComparable(statement)
  return (record.canonicalStatements ?? []).some(
    (canonical) => normalizeComparable(canonical) === statementKey
  )
}

function findGitHubEvidence(
  signal: DiscussionSignal,
  evidence: readonly GitHubImplementationEvidence[]
): GitHubImplementationEvidence | undefined {
  if (!signal.implementationRef) return undefined
  return evidence.find((entry) => entry.ref === signal.implementationRef)
}

function candidateFor(
  signal: DiscussionSignal,
  supersededBySignalId: string | undefined,
  linearRecords: readonly LinearAuthorityRecord[],
  githubEvidence: readonly GitHubImplementationEvidence[],
  appliedFingerprints: ReadonlySet<string>
): DiscussionDecisionCandidate {
  const fingerprint = fingerprintSignal(signal)
  const linearRecord = findLinearRecord(signal, linearRecords)
  const implementationEvidence = findGitHubEvidence(signal, githubEvidence)
  const reasons: string[] = []

  let disposition: ReconciliationDisposition

  if (supersededBySignalId) {
    disposition = 'no_op'
    reasons.push('superseded_by_later_discussion_signal')
  } else if (appliedFingerprints.has(fingerprint)) {
    disposition = 'no_op'
    reasons.push('writeback_fingerprint_already_applied')
  } else if (linearAlreadyRecords(signal.statement, linearRecord)) {
    disposition = 'no_op'
    reasons.push('linear_authority_already_records_statement')
  } else if (signal.kind === 'unresolved_disagreement') {
    disposition = 'unresolved_contradiction'
    reasons.push('discussion_disagreement_requires_reconciliation')
  } else if (signal.documentationOnly) {
    disposition = 'documentation_consequence'
    reasons.push('doc_only_consequence_routes_through_spe_1705')
  } else if (signal.kind === 'implementation_promise') {
    if (implementationEvidence?.verified) {
      disposition = 'github_update'
      reasons.push(
        implementationEvidence.merged
          ? 'verified_merged_github_implementation_evidence'
          : 'verified_github_implementation_evidence'
      )
    } else if (linearRecord && linearRecord.status !== 'completed' && linearRecord.status !== 'canceled') {
      disposition = 'linear_update'
      reasons.push('implementation_promise_is_planning_only_without_verified_github_evidence')
    } else {
      disposition = 'no_op'
      reasons.push('implementation_promise_has_no_verified_github_evidence_or_active_linear_owner')
    }
  } else if (linearRecord && linearRecord.status !== 'completed' && linearRecord.status !== 'canceled') {
    disposition = 'linear_update'
    reasons.push('active_linear_owner_requires_authoritative_reconciliation')
  } else if (linearRecord) {
    disposition = 'missing_boundary_candidate'
    reasons.push('existing_linear_owner_is_completed_or_canceled_and_must_not_be_reopened')
  } else {
    disposition = 'missing_boundary_candidate'
    reasons.push('no_existing_authoritative_owner_found')
  }

  return Object.freeze({
    signalId: signal.signalId,
    kind: signal.kind,
    statement: normalize(signal.statement),
    provenance: Object.freeze({ ...signal.provenance }),
    fingerprint,
    disposition,
    ownerIssueId: signal.ownerIssueId,
    implementationRef: signal.implementationRef,
    reasons: Object.freeze(reasons),
    supersededBySignalId,
  })
}

/**
 * Extract durable discussion signals and reconcile them against supplied
 * authority snapshots. Missing-boundary output is only a candidate for the
 * normal approval workflow; this function has no write side effects.
 */
export function reconcileDiscussionDecisions(
  input: DiscussionReconciliationInput
): DiscussionReconciliationResult {
  const signals = [...(input.signals ?? [])]
    .filter((signal) => normalize(signal.signalId) && normalize(signal.statement))
    .sort((a, b) => {
      const sourceOrder = a.provenance.sourceId.localeCompare(b.provenance.sourceId)
      if (sourceOrder !== 0) return sourceOrder
      const ordinalOrder = a.provenance.ordinal - b.provenance.ordinal
      if (ordinalOrder !== 0) return ordinalOrder
      return a.signalId.localeCompare(b.signalId)
    })

  const supersessionIndex = buildSupersessionIndex(signals)
  const linearRecords = input.linearRecords ?? []
  const githubEvidence = input.githubEvidence ?? []
  const appliedFingerprints = new Set(input.previouslyAppliedFingerprints ?? [])
  const seenFingerprints = new Set<string>()

  const candidates = signals.map((signal) => {
    const candidate = candidateFor(
      signal,
      supersessionIndex.get(signal.signalId),
      linearRecords,
      githubEvidence,
      appliedFingerprints
    )

    if (candidate.disposition !== 'no_op' && seenFingerprints.has(candidate.fingerprint)) {
      return Object.freeze({
        ...candidate,
        disposition: 'no_op' as const,
        reasons: Object.freeze([...candidate.reasons, 'duplicate_candidate_in_same_reconciliation_pass']),
      })
    }

    seenFingerprints.add(candidate.fingerprint)
    return candidate
  })

  return Object.freeze({
    candidates: Object.freeze(candidates),
    writebackCandidates: Object.freeze(
      candidates.filter((candidate) => candidate.disposition !== 'no_op')
    ),
  })
}

export function discussionDecisionFingerprint(signal: DiscussionSignal): string {
  return fingerprintSignal(signal)
}
