/**
 * SPE-1317: deterministic unresolved world-state fact evaluation.
 *
 * Models bounded operational questions that are not yet fully knowable from current evidence.
 * This module is pure and does not persist playable simulation aggregates, run actions, replace containment logic,
 * perform random/probabilistic resolution, or implement SPE-1085 canon/lore systems.
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

/** Strictest check gate when multiple checks target the same fact (highest minimum rank). */
function effectiveMinimumStrengthForFact(
  checks: readonly UncertainWorldStateCheck[] | undefined,
  factId: string
): UncertainWorldStateEvidenceStrength | undefined {
  if (checks === undefined || checks.length === 0) {
    return undefined
  }
  const relevant = checks.filter((c) => c.factId === factId)
  if (relevant.length === 0) {
    return undefined
  }
  let best: UncertainWorldStateEvidenceStrength = 'weak'
  let bestRank = STRENGTH_RANK.weak
  for (const c of relevant) {
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

function formatChecksFragment(checks: readonly UncertainWorldStateCheck[] | undefined, factId: string): string {
  if (checks === undefined || checks.length === 0) {
    return ''
  }
  const rel = checks.filter((c) => c.factId === factId)
  if (rel.length === 0) {
    return ''
  }
  const parts = rel.map((c) => `${c.checkId} (${c.trigger})`)
  return `Checks: ${parts.join('; ')}. `
}

function evaluateOneFact(input: {
  fact: UncertainWorldStateFact
  allEvidence: readonly UncertainWorldStateEvidence[]
  checks: readonly UncertainWorldStateCheck[] | undefined
  context: { week?: number } | undefined
}): { fact: UncertainWorldStateFact; resolution: UncertainWorldStateResolution } {
  const { fact, allEvidence, checks, context } = input
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

  const ignored: string[] = []
  const pushIgnored = (id: string) => {
    if (!ignored.includes(id)) {
      ignored.push(id)
    }
  }

  const minStrength = effectiveMinimumStrengthForFact(checks, fact.factId)
  const checkPrefix = formatChecksFragment(checks, fact.factId)

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

  const candidates = allEvidence.filter((e) => e.factId === fact.factId)
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

  for (const ev of applicable) {
    if (ev.strength !== 'decisive') {
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

  const appliedEvidenceIdsSorted = sortUniqueStrings([...baseApplied, ...newAppliedIds])

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
  } else if (statusBefore === 'resolved' && statusAfter === 'resolved' && newAppliedIds.length === 0) {
    noteBody = `${checkPrefix}No new applicable evidence changed this fact.`
  } else if (statusBefore === 'resolved' && statusAfter === 'resolved' && newAppliedIds.length > 0) {
    noteBody = `${checkPrefix}Reinforced or adjusted resolved fact with additional decisive evidence.`
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
    ignoredEvidenceIds: sortUniqueStrings(ignored),
    resolvedState,
    currentBestState,
    note: noteBody.trim().replace(/\s+/g, ' '),
  }

  return { fact: outFact, resolution }
}

export function evaluateUncertainWorldStateFacts(input: {
  facts: readonly UncertainWorldStateFact[]
  evidence: readonly UncertainWorldStateEvidence[]
  checks?: readonly UncertainWorldStateCheck[]
  context?: { week?: number }
}): UncertainWorldStateReport {
  const sortedFacts = [...input.facts].sort((a, b) => a.factId.localeCompare(b.factId))
  const outFacts: UncertainWorldStateFact[] = []
  const resolutions: UncertainWorldStateResolution[] = []

  for (const fact of sortedFacts) {
    const { fact: next, resolution } = evaluateOneFact({
      fact,
      allEvidence: input.evidence,
      checks: input.checks,
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
  return {
    factId: input.fact.factId,
    statusBefore: input.fact.status,
    statusAfter: input.fact.status,
    appliedEvidenceIds: sortUniqueStrings(input.fact.appliedEvidenceIds),
    ignoredEvidenceIds: [],
    resolvedState: input.fact.resolvedState,
    currentBestState: input.fact.currentBestState,
    note: 'No fact supplied.',
  }
}
