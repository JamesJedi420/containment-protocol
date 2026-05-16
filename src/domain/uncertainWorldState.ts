/**
 * SPE-1317: deterministic unresolved world-state fact evaluation.
 *
 * Models bounded operational questions that are not yet fully knowable from current evidence.
 * This module is pure and does not persist playable simulation aggregates, run actions, replace containment logic,
 * perform random/probabilistic resolution, or implement SPE-1085 canon/lore systems.
 *
 * For facts in `resolved` status, non-decisive evidence does not update `currentBestState`; when `resolvedState` is known,
 * outputs keep `currentBestState` aligned with it.
 */

export type UncertainWorldStateFactStatus = 'unresolved' | 'resolved' | 'superseded'

export type UncertainWorldStateFactKind =
  | 'unseen_room_state'
  | 'unverified_subject_property'

export type UncertainWorldStateEvidenceStrength =
  | 'weak'
  | 'moderate'
  | 'strong'
  | 'decisive'

export type UncertainWorldStateEvidenceSource =
  | 'observation'
  | 'report'
  | 'map'
  | 'sensor'
  | 'witness'
  | 'branch_continuity'
  | 'system'

export type UncertainWorldStateCheckTrigger =
  | 'new_evidence'
  | 'operator_review'
  | 'map_update'
  | 'observer_access'

export interface UncertainWorldStateFact {
  factId: string
  subjectId: string
  factKind: UncertainWorldStateFactKind
  status: UncertainWorldStateFactStatus
  question: string
  possibleStates: readonly string[]
  currentBestState?: string
  resolvedState?: string
  appliedEvidenceIds: readonly string[]
  createdAtWeek?: number
  resolvedAtWeek?: number
  allowSupersession?: boolean
}

export interface UncertainWorldStateEvidence {
  evidenceId: string
  factId: string
  subjectId: string
  supportsState: string
  strength: UncertainWorldStateEvidenceStrength
  source: UncertainWorldStateEvidenceSource
}

export interface UncertainWorldStateCheck {
  checkId: string
  factId: string
  trigger: UncertainWorldStateCheckTrigger
  minimumStrength?: UncertainWorldStateEvidenceStrength
}

export interface UncertainWorldStateResolution {
  factId: string
  statusBefore: UncertainWorldStateFactStatus
  statusAfter: UncertainWorldStateFactStatus
  appliedEvidenceIds: readonly string[]
  ignoredEvidenceIds: readonly string[]
  resolvedState?: string
  currentBestState?: string
  note: string
}

export interface UncertainWorldStateReport {
  facts: readonly UncertainWorldStateFact[]
  resolutions: readonly UncertainWorldStateResolution[]
  summary: {
    unresolvedCount: number
    resolvedCount: number
    supersededCount: number
  }
}

const STRENGTH_RANK: Readonly<Record<UncertainWorldStateEvidenceStrength, number>> = {
  weak: 0,
  moderate: 1,
  strong: 2,
  decisive: 3,
}

function strengthMeetsMinimum(
  strength: UncertainWorldStateEvidenceStrength,
  minimum: UncertainWorldStateEvidenceStrength | undefined
): boolean {
  if (minimum === undefined) {
    return true
  }
  return STRENGTH_RANK[strength] >= STRENGTH_RANK[minimum]
}

/** Strictest gate when multiple checks target the same fact (highest minimum rank). */
function effectiveMinimumStrengthForChecks(
  checksForFact: readonly UncertainWorldStateCheck[]
): UncertainWorldStateEvidenceStrength | undefined {
  if (checksForFact.length === 0) {
    return undefined
  }
  let best: UncertainWorldStateEvidenceStrength = 'weak'
  let bestRank = STRENGTH_RANK.weak
  for (const c of checksForFact) {
    const min = c.minimumStrength ?? 'weak'
    const rank = STRENGTH_RANK[min]
    if (rank > bestRank) {
      bestRank = rank
      best = min
    }
  }
  return best
}

function compareApplicableEvidence(
  a: UncertainWorldStateEvidence,
  b: UncertainWorldStateEvidence
): number {
  const ra = STRENGTH_RANK[a.strength]
  const rb = STRENGTH_RANK[b.strength]
  if (ra !== rb) {
    return ra - rb
  }
  return a.evidenceId.localeCompare(b.evidenceId)
}

function sortUniqueStrings(ids: readonly string[]): string[] {
  return [...new Set(ids)].sort((a, b) => a.localeCompare(b))
}

function formatChecksFragment(checksForFact: readonly UncertainWorldStateCheck[]): string {
  if (checksForFact.length === 0) {
    return ''
  }
  const parts = checksForFact.map((c) => `${c.checkId} (${c.trigger})`).sort((a, b) => a.localeCompare(b))
  return `Checks: ${parts.join('; ')}. `
}

/** Once resolved, mirror resolvedState onto currentBestState whenever resolvedState is defined. */
function finalizeCanonicalStates(
  statusAfter: UncertainWorldStateFactStatus,
  resolvedState: string | undefined,
  currentBestAfterLoop: string | undefined,
  fact: UncertainWorldStateFact
): { resolvedState: string | undefined; currentBestState: string | undefined } {
  if (statusAfter !== 'resolved') {
    return { resolvedState, currentBestState: currentBestAfterLoop }
  }
  const canonicalResolved = resolvedState ?? fact.resolvedState
  if (canonicalResolved !== undefined) {
    return { resolvedState: canonicalResolved, currentBestState: canonicalResolved }
  }
  return { resolvedState: undefined, currentBestState: currentBestAfterLoop }
}

function evaluateOneFact(input: {
  fact: UncertainWorldStateFact
  candidates: readonly UncertainWorldStateEvidence[]
  checksForFact: readonly UncertainWorldStateCheck[]
  context: { week?: number } | undefined
}): { fact: UncertainWorldStateFact; resolution: UncertainWorldStateResolution } {
  const { fact, candidates, checksForFact, context } = input
  const statusBefore = fact.status

  const baseApplied = [...fact.appliedEvidenceIds]
  const appliedSet = new Set(baseApplied)
  const newAppliedIds: string[] = []
  const pushApplied = (id: string) => {
    if (!appliedSet.has(id)) {
      appliedSet.add(id)
      newAppliedIds.push(id)
    }
  }

  const ignoredIds = new Set<string>()
  const pushIgnored = (id: string) => {
    ignoredIds.add(id)
  }

  const minStrength = effectiveMinimumStrengthForChecks(checksForFact)
  const checkPrefix = formatChecksFragment(checksForFact)

  if (fact.status === 'superseded') {
    const clone: UncertainWorldStateFact = {
      ...fact,
      possibleStates: [...fact.possibleStates],
      appliedEvidenceIds: sortUniqueStrings(fact.appliedEvidenceIds),
    }
    const resolution: UncertainWorldStateResolution = {
      factId: fact.factId,
      statusBefore,
      statusAfter: fact.status,
      appliedEvidenceIds: clone.appliedEvidenceIds,
      ignoredEvidenceIds: [],
      resolvedState: clone.resolvedState,
      currentBestState: clone.currentBestState,
      note: `${checkPrefix}Fact already superseded; no evaluation applied.`,
    }
    return { fact: clone, resolution }
  }

  const applicable: UncertainWorldStateEvidence[] = []

  for (const ev of candidates) {
    if (ev.subjectId !== fact.subjectId) {
      pushIgnored(ev.evidenceId)
      continue
    }
    if (!fact.possibleStates.includes(ev.supportsState)) {
      pushIgnored(ev.evidenceId)
      continue
    }
    if (!strengthMeetsMinimum(ev.strength, minStrength)) {
      pushIgnored(ev.evidenceId)
      continue
    }
    applicable.push(ev)
  }

  applicable.sort(compareApplicableEvidence)

  let statusAfter: UncertainWorldStateFactStatus = fact.status
  let currentBestState = fact.currentBestState
  let resolvedState = fact.resolvedState
  let resolvedAtWeek = fact.resolvedAtWeek

  const supersessionFragments: string[] = []
  let appliedNonDecisive = false
  let didSupersedeResolution = false
  let ignoredWeakWhileResolved = false

  for (const ev of applicable) {
    if (ev.strength !== 'decisive') {
      if (statusAfter === 'resolved') {
        ignoredWeakWhileResolved = true
        pushIgnored(ev.evidenceId)
        continue
      }
      currentBestState = ev.supportsState
      pushApplied(ev.evidenceId)
      appliedNonDecisive = true
      continue
    }

    if (statusAfter !== 'resolved') {
      statusAfter = 'resolved'
      resolvedState = ev.supportsState
      currentBestState = ev.supportsState
      if (context?.week !== undefined) {
        resolvedAtWeek = context.week
      }
      pushApplied(ev.evidenceId)
      continue
    }

    if (resolvedState === ev.supportsState) {
      pushApplied(ev.evidenceId)
      continue
    }

    if (fact.allowSupersession === true) {
      const prior = resolvedState
      resolvedState = ev.supportsState
      currentBestState = ev.supportsState
      if (context?.week !== undefined) {
        resolvedAtWeek = context.week
      }
      pushApplied(ev.evidenceId)
      if (prior !== undefined && prior !== ev.supportsState) {
        supersessionFragments.push(`Superseded prior resolvedState '${prior}'.`)
        didSupersedeResolution = true
      }
      continue
    }

    pushIgnored(ev.evidenceId)
  }

  const sync = finalizeCanonicalStates(statusAfter, resolvedState, currentBestState, fact)
  resolvedState = sync.resolvedState
  currentBestState = sync.currentBestState

  const appliedEvidenceIdsSorted = sortUniqueStrings([...baseApplied, ...newAppliedIds])
  const ignoredEvidenceSorted = sortUniqueStrings([...ignoredIds])

  const hadApplicable = applicable.length > 0

  let noteBody: string
  if (!hadApplicable) {
    noteBody = `${checkPrefix}No applicable evidence for this fact.`
  } else if (didSupersedeResolution) {
    const detail =
      supersessionFragments.length > 0 ? supersessionFragments.join(' ') : 'Conflicting decisive evidence.'
    noteBody = `${checkPrefix}${detail} Decisive evidence superseded conflicting resolution.`
  } else if (statusBefore !== 'resolved' && statusAfter === 'resolved') {
    noteBody = `${checkPrefix}Fact resolved via decisive evidence.`
  } else if (appliedNonDecisive && statusAfter !== 'resolved') {
    noteBody = `${checkPrefix}Updated currentBestState from non-decisive evidence.`
  } else if (statusBefore === 'resolved' && statusAfter === 'resolved' && newAppliedIds.length > 0) {
    noteBody = `${checkPrefix}Reinforced or adjusted resolved fact with additional decisive evidence.`
  } else if (statusBefore === 'resolved' && statusAfter === 'resolved' && ignoredWeakWhileResolved) {
    noteBody = `${checkPrefix}Non-decisive evidence ignored while fact remains resolved; decisive handling unchanged.`
  } else if (statusBefore === 'resolved' && statusAfter === 'resolved' && newAppliedIds.length === 0) {
    noteBody = `${checkPrefix}No new applicable evidence changed this fact.`
  } else {
    noteBody = `${checkPrefix}No material change from applicable evidence.`
  }

  const outFact: UncertainWorldStateFact = {
    ...fact,
    status: statusAfter,
    possibleStates: [...fact.possibleStates],
    currentBestState,
    resolvedState,
    resolvedAtWeek,
    appliedEvidenceIds: appliedEvidenceIdsSorted,
  }

  const resolution: UncertainWorldStateResolution = {
    factId: fact.factId,
    statusBefore,
    statusAfter,
    appliedEvidenceIds: appliedEvidenceIdsSorted,
    ignoredEvidenceIds: ignoredEvidenceSorted,
    resolvedState,
    currentBestState,
    note: noteBody.trim().replace(/\s+/g, ' '),
  }

  return { fact: outFact, resolution }
}

/** Deterministic buckets: preserves global evidence order within each factId group. */
function evidenceByFactId(evidence: readonly UncertainWorldStateEvidence[]): Map<string, UncertainWorldStateEvidence[]> {
  const buckets = new Map<string, UncertainWorldStateEvidence[]>()
  for (const ev of evidence) {
    const cur = buckets.get(ev.factId)
    if (cur === undefined) {
      buckets.set(ev.factId, [ev])
    } else {
      cur.push(ev)
    }
  }
  return buckets
}

/** Group checks once for deterministic lookup without rescanning the full checklist each fact. */
function checksByFactId(checks: readonly UncertainWorldStateCheck[]): Map<string, UncertainWorldStateCheck[]> {
  const buckets = new Map<string, UncertainWorldStateCheck[]>()
  for (const c of checks) {
    const cur = buckets.get(c.factId)
    if (cur === undefined) {
      buckets.set(c.factId, [c])
    } else {
      cur.push(c)
    }
  }
  return buckets
}

export function evaluateUncertainWorldStateFacts(input: {
  facts: readonly UncertainWorldStateFact[]
  evidence: readonly UncertainWorldStateEvidence[]
  checks?: readonly UncertainWorldStateCheck[]
  context?: { week?: number }
}): UncertainWorldStateReport {
  const sortedFacts = [...input.facts].sort((a, b) => a.factId.localeCompare(b.factId))
  const buckets = evidenceByFactId(input.evidence)
  const checks = input.checks ?? []
  const checkBuckets = checksByFactId(checks)

  const outFacts: UncertainWorldStateFact[] = []
  const resolutions: UncertainWorldStateResolution[] = []

  for (const fact of sortedFacts) {
    const checksForFact = checkBuckets.get(fact.factId) ?? []
    const candidates = buckets.get(fact.factId) ?? []
    const { fact: next, resolution } = evaluateOneFact({
      fact,
      candidates,
      checksForFact,
      context: input.context,
    })
    outFacts.push(next)
    resolutions.push(resolution)
  }

  resolutions.sort((a, b) => a.factId.localeCompare(b.factId))

  const summary = outFacts.reduce(
    (acc, f) => {
      if (f.status === 'unresolved') {
        acc.unresolvedCount += 1
      }
      if (f.status === 'resolved') {
        acc.resolvedCount += 1
      }
      if (f.status === 'superseded') {
        acc.supersededCount += 1
      }
      return acc
    },
    { unresolvedCount: 0, resolvedCount: 0, supersededCount: 0 }
  )

  return {
    facts: outFacts,
    resolutions,
    summary,
  }
}

export function resolveUncertainWorldStateCheck(input: {
  fact: UncertainWorldStateFact
  evidence: readonly UncertainWorldStateEvidence[]
  check?: UncertainWorldStateCheck
  context?: { week?: number }
}): UncertainWorldStateResolution {
  const report = evaluateUncertainWorldStateFacts({
    facts: [input.fact],
    evidence: input.evidence,
    checks: input.check === undefined ? undefined : [input.check],
    context: input.context,
  })
  const first = report.resolutions[0]
  if (first !== undefined) {
    return first
  }
  const sync = finalizeCanonicalStates(
    input.fact.status,
    input.fact.resolvedState,
    input.fact.currentBestState,
    input.fact
  )
  return {
    factId: input.fact.factId,
    statusBefore: input.fact.status,
    statusAfter: input.fact.status,
    appliedEvidenceIds: sortUniqueStrings(input.fact.appliedEvidenceIds),
    ignoredEvidenceIds: [],
    resolvedState: sync.resolvedState,
    currentBestState: sync.currentBestState,
    note: 'No fact supplied.',
  }
}
