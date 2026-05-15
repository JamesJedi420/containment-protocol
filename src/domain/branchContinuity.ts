/**
 * SPE-1760: deterministic branch-continuity validation for authored incident nodes.
 *
 * Compares compact path facts against node prerequisites and player-knowledge assumptions.
 * Distinct from runtime stability checks, canon/lore systems, and live branch selection.
 */

export type BranchCompanionStatus = 'present' | 'lost' | 'rescued' | 'betrayed' | 'absent'
export type BranchInjuryStatus = 'none' | 'wounded' | 'healed'

export interface BranchSimulationTruth {
  hiddenEventIds?: readonly string[]
  hiddenLearnedClueIds?: readonly string[]
}

export interface BranchPathFacts {
  pathId: string
  acquiredItemIds: readonly string[]
  seedValues: Readonly<Record<string, string | number | boolean>>
  roomOfOriginId?: string
  companionStatusById: Readonly<Record<string, BranchCompanionStatus>>
  injuryStatusBySubjectId: Readonly<Record<string, BranchInjuryStatus>>
  witnessedEventIds: readonly string[]
  learnedClueIds: readonly string[]
  priorChoiceIds: readonly string[]
  simulationTruth?: BranchSimulationTruth
}

export interface BranchNodeRequirements {
  anyItemIds?: readonly string[]
  allItemIds?: readonly string[]
  injuryBySubjectId?: Readonly<Record<string, BranchInjuryStatus>>
  companionStatusById?: Readonly<Record<string, BranchCompanionStatus>>
  roomOfOriginId?: string
  witnessedEventIds?: readonly string[]
  learnedClueIds?: readonly string[]
  priorChoiceIds?: readonly string[]
  requiredRecordRevisionIds?: readonly string[]
}

export interface BranchPlayerKnowledgeAssumption {
  witnessedEventIds?: readonly string[]
  learnedClueIds?: readonly string[]
}

export interface BranchContinuityNode {
  nodeId: string
  label?: string
  requires?: BranchNodeRequirements
  assumesPlayerKnows?: BranchPlayerKnowledgeAssumption
  citesOfficialClaimIds?: readonly string[]
}

export interface BranchOfficialClaim {
  claimId: string
  subjectId?: string
  summary: string
}

export interface BranchCorrectedRecord {
  recordId: string
  supersededClaimId: string
  revisionId: string
  summary?: string
}

export type BranchContinuityWarningClass =
  | 'missing_item'
  | 'companion_status_mismatch'
  | 'missing_prior_choice'
  | 'injury_contradiction'
  | 'unlearned_clue'
  | 'unwitnessed_event'
  | 'impossible_origin'
  | 'missing_record_revision'
  | 'stale_official_claim'
  | 'player_awareness_leak'

export type BranchContinuityWarningSeverity = 'warning' | 'error'
export type BranchContinuityWarningAudience = 'player' | 'simulation' | 'institutional'

export interface BranchContinuityWarning {
  id: string
  pathId: string
  nodeId: string
  warningClass: BranchContinuityWarningClass
  severity: BranchContinuityWarningSeverity
  audience: BranchContinuityWarningAudience
  summary: string
  details?: string
  relatedIds?: readonly string[]
}

export interface BranchContinuityValidationReport {
  pathId: string
  warnings: readonly BranchContinuityWarning[]
  summary: {
    warningCount: number
    errorCount: number
    byClass: Readonly<Partial<Record<BranchContinuityWarningClass, number>>>
  }
}

export interface BranchContinuityValidationInput {
  pathFacts: BranchPathFacts
  nodes: readonly BranchContinuityNode[]
  correctedRecords?: readonly BranchCorrectedRecord[]
  officialClaims?: readonly BranchOfficialClaim[]
}

const ERROR_WARNING_CLASSES = new Set<BranchContinuityWarningClass>([
  'missing_item',
  'companion_status_mismatch',
  'missing_prior_choice',
  'injury_contradiction',
  'impossible_origin',
  'missing_record_revision',
])

const WARNING_CLASS_ORDER: readonly BranchContinuityWarningClass[] = [
  'missing_item',
  'companion_status_mismatch',
  'missing_prior_choice',
  'injury_contradiction',
  'unlearned_clue',
  'unwitnessed_event',
  'impossible_origin',
  'missing_record_revision',
  'stale_official_claim',
  'player_awareness_leak',
]

function normalizeString(value: string | undefined | null) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeStringList(values: readonly string[] | undefined) {
  return [...new Set((values ?? []).map(normalizeString).filter((value) => value.length > 0))]
}

function warningClassRank(warningClass: BranchContinuityWarningClass) {
  const index = WARNING_CLASS_ORDER.indexOf(warningClass)
  return index >= 0 ? index : WARNING_CLASS_ORDER.length
}

function buildWarningId(
  pathId: string,
  nodeId: string,
  warningClass: BranchContinuityWarningClass,
  detailKey: string
) {
  return `${pathId}:${nodeId}:${warningClass}:${detailKey}`
}

function severityForClass(warningClass: BranchContinuityWarningClass): BranchContinuityWarningSeverity {
  return ERROR_WARNING_CLASSES.has(warningClass) ? 'error' : 'warning'
}

function pushWarning(
  warnings: BranchContinuityWarning[],
  input: {
    pathId: string
    nodeId: string
    warningClass: BranchContinuityWarningClass
    audience: BranchContinuityWarningAudience
    summary: string
    details?: string
    relatedIds?: readonly string[]
    detailKey: string
  }
) {
  warnings.push({
    id: buildWarningId(input.pathId, input.nodeId, input.warningClass, input.detailKey),
    pathId: input.pathId,
    nodeId: input.nodeId,
    warningClass: input.warningClass,
    severity: severityForClass(input.warningClass),
    audience: input.audience,
    summary: input.summary,
    ...(input.details ? { details: input.details } : {}),
    ...(input.relatedIds && input.relatedIds.length > 0 ? { relatedIds: [...input.relatedIds] } : {}),
  })
}

function hasAcquiredItem(pathFacts: BranchPathFacts, itemId: string) {
  return pathFacts.acquiredItemIds.includes(itemId)
}

function hasWitnessedEvent(pathFacts: BranchPathFacts, eventId: string) {
  return pathFacts.witnessedEventIds.includes(eventId)
}

function hasLearnedClue(pathFacts: BranchPathFacts, clueId: string) {
  return pathFacts.learnedClueIds.includes(clueId)
}

function hasPriorChoice(pathFacts: BranchPathFacts, choiceId: string) {
  return pathFacts.priorChoiceIds.includes(choiceId)
}

function isHiddenSimulationEvent(pathFacts: BranchPathFacts, eventId: string) {
  return pathFacts.simulationTruth?.hiddenEventIds?.includes(eventId) ?? false
}

function isHiddenSimulationClue(pathFacts: BranchPathFacts, clueId: string) {
  return pathFacts.simulationTruth?.hiddenLearnedClueIds?.includes(clueId) ?? false
}

function getCompanionStatus(pathFacts: BranchPathFacts, companionId: string): BranchCompanionStatus {
  return pathFacts.companionStatusById[companionId] ?? 'absent'
}

function isCorrectedRecordActive(pathFacts: BranchPathFacts, record: BranchCorrectedRecord) {
  const effectiveFromChoiceId = normalizeString(record.effectiveFromChoiceId)
  if (effectiveFromChoiceId.length === 0) {
    return true
  }

  return hasPriorChoice(pathFacts, effectiveFromChoiceId)
}

function getActiveCorrectedRecords(
  pathFacts: BranchPathFacts,
  correctedRecords: readonly BranchCorrectedRecord[]
) {
  return correctedRecords.filter((record) => isCorrectedRecordActive(pathFacts, record))
}

function buildCorrectedRecordIndexes(
  pathFacts: BranchPathFacts,
  correctedRecords: readonly BranchCorrectedRecord[]
) {
  const activeRecords = getActiveCorrectedRecords(pathFacts, correctedRecords)

  return {
    supersededClaimIds: new Set(
      activeRecords.map((record) => normalizeString(record.supersededClaimId)).filter(Boolean)
    ),
    revisionIds: new Set(
      activeRecords.map((record) => normalizeString(record.revisionId)).filter(Boolean)
    ),
  }
}

function validateRequires(
  pathFacts: BranchPathFacts,
  node: BranchContinuityNode,
  revisionIds: ReadonlySet<string>,
  warnings: BranchContinuityWarning[]
) {
  const requires = node.requires
  if (!requires) {
    return
  }

  const pathId = pathFacts.pathId
  const nodeId = node.nodeId

  for (const itemId of normalizeStringList(requires.allItemIds)) {
    if (!hasAcquiredItem(pathFacts, itemId)) {
      pushWarning(warnings, {
        pathId,
        nodeId,
        warningClass: 'missing_item',
        audience: 'simulation',
        summary: `Node requires item ${itemId} that the path never acquired.`,
        relatedIds: [itemId],
        detailKey: `all:${itemId}`,
      })
    }
  }

  const anyItemIds = normalizeStringList(requires.anyItemIds)
  if (anyItemIds.length > 0 && !anyItemIds.some((itemId) => hasAcquiredItem(pathFacts, itemId))) {
    pushWarning(warnings, {
      pathId,
      nodeId,
      warningClass: 'missing_item',
      audience: 'simulation',
      summary: `Node requires at least one of ${anyItemIds.join(', ')}, but the path acquired none.`,
      relatedIds: anyItemIds,
      detailKey: `any:${anyItemIds.join('|')}`,
    })
  }

  for (const [subjectId, requiredStatus] of Object.entries(requires.injuryBySubjectId ?? {})) {
    const actualStatus = pathFacts.injuryStatusBySubjectId[subjectId] ?? 'none'

    if (requiredStatus === 'healed' && actualStatus === 'none') {
      pushWarning(warnings, {
        pathId,
        nodeId,
        warningClass: 'injury_contradiction',
        audience: 'simulation',
        summary: `Node assumes ${subjectId} was healed, but the path never recorded a wound.`,
        relatedIds: [subjectId],
        detailKey: `healed-never-inflicted:${subjectId}`,
      })
      continue
    }

    if (requiredStatus === 'wounded' && actualStatus !== 'wounded') {
      pushWarning(warnings, {
        pathId,
        nodeId,
        warningClass: 'injury_contradiction',
        audience: 'simulation',
        summary: `Node requires ${subjectId} to be wounded, but the path records ${actualStatus}.`,
        relatedIds: [subjectId],
        detailKey: `wounded-mismatch:${subjectId}`,
      })
      continue
    }

    if (requiredStatus === 'none' && actualStatus !== 'none') {
      pushWarning(warnings, {
        pathId,
        nodeId,
        warningClass: 'injury_contradiction',
        audience: 'simulation',
        summary: `Node requires ${subjectId} to have no wound, but the path records ${actualStatus}.`,
        relatedIds: [subjectId],
        detailKey: `unexpected-injury:${subjectId}`,
      })
      continue
    }

    if (requiredStatus === 'healed' && actualStatus === 'wounded') {
      pushWarning(warnings, {
        pathId,
        nodeId,
        warningClass: 'injury_contradiction',
        audience: 'simulation',
        summary: `Node assumes ${subjectId} was healed, but the path still records an active wound.`,
        relatedIds: [subjectId],
        detailKey: `still-wounded:${subjectId}`,
      })
    }
  }

  for (const [companionId, requiredStatus] of Object.entries(requires.companionStatusById ?? {})) {
    const actualStatus = getCompanionStatus(pathFacts, companionId)
    if (actualStatus !== requiredStatus) {
      pushWarning(warnings, {
        pathId,
        nodeId,
        warningClass: 'companion_status_mismatch',
        audience: 'simulation',
        summary: `Node requires companion ${companionId} to be ${requiredStatus}, but the path has ${actualStatus}.`,
        relatedIds: [companionId],
        detailKey: `companion:${companionId}`,
      })
    }
  }

  const requiredOrigin = normalizeString(requires.roomOfOriginId)
  if (
    requiredOrigin.length > 0 &&
    normalizeString(pathFacts.roomOfOriginId) !== requiredOrigin
  ) {
    pushWarning(warnings, {
      pathId,
      nodeId,
      warningClass: 'impossible_origin',
      audience: 'simulation',
      summary: `Node requires origin room ${requiredOrigin}, but the path origin is ${pathFacts.roomOfOriginId ?? 'unset'}.`,
      relatedIds: [requiredOrigin, pathFacts.roomOfOriginId ?? 'unset'],
      detailKey: `origin:${requiredOrigin}`,
    })
  }

  for (const eventId of normalizeStringList(requires.witnessedEventIds)) {
    if (!hasWitnessedEvent(pathFacts, eventId)) {
      pushWarning(warnings, {
        pathId,
        nodeId,
        warningClass: 'unwitnessed_event',
        audience: 'player',
        summary: `Node requires witnessed event ${eventId}, but the path never recorded it.`,
        relatedIds: [eventId],
        detailKey: `requires-event:${eventId}`,
      })
    }
  }

  for (const clueId of normalizeStringList(requires.learnedClueIds)) {
    if (!hasLearnedClue(pathFacts, clueId)) {
      pushWarning(warnings, {
        pathId,
        nodeId,
        warningClass: 'unlearned_clue',
        audience: 'player',
        summary: `Node requires learned clue ${clueId}, but the path never acquired it.`,
        relatedIds: [clueId],
        detailKey: `requires-clue:${clueId}`,
      })
    }
  }

  for (const choiceId of normalizeStringList(requires.priorChoiceIds)) {
    if (!hasPriorChoice(pathFacts, choiceId)) {
      pushWarning(warnings, {
        pathId,
        nodeId,
        warningClass: 'missing_prior_choice',
        audience: 'simulation',
        summary: `Node requires prior choice ${choiceId}, but the path never took it.`,
        relatedIds: [choiceId],
        detailKey: `requires-choice:${choiceId}`,
      })
    }
  }

  for (const revisionId of normalizeStringList(requires.requiredRecordRevisionIds)) {
    if (!revisionIds.has(revisionId)) {
      pushWarning(warnings, {
        pathId,
        nodeId,
        warningClass: 'missing_record_revision',
        audience: 'institutional',
        summary: `Node requires corrected-record revision ${revisionId}, but no matching correction exists.`,
        relatedIds: [revisionId],
        detailKey: `revision:${revisionId}`,
      })
    }
  }
}

function validateAssumesPlayerKnows(
  pathFacts: BranchPathFacts,
  node: BranchContinuityNode,
  warnings: BranchContinuityWarning[]
) {
  const assumes = node.assumesPlayerKnows
  if (!assumes) {
    return
  }

  const pathId = pathFacts.pathId
  const nodeId = node.nodeId

  for (const eventId of normalizeStringList(assumes.witnessedEventIds)) {
    if (hasWitnessedEvent(pathFacts, eventId)) {
      continue
    }

    if (isHiddenSimulationEvent(pathFacts, eventId)) {
      pushWarning(warnings, {
        pathId,
        nodeId,
        warningClass: 'player_awareness_leak',
        audience: 'player',
        summary: `Node assumes the player witnessed ${eventId}, but that event exists only in simulation truth.`,
        relatedIds: [eventId],
        detailKey: `hidden-event:${eventId}`,
      })
      continue
    }

    pushWarning(warnings, {
      pathId,
      nodeId,
      warningClass: 'unwitnessed_event',
      audience: 'player',
      summary: `Node assumes the player witnessed ${eventId}, but the path never recorded it.`,
      relatedIds: [eventId],
      detailKey: `assumes-event:${eventId}`,
    })
  }

  for (const clueId of normalizeStringList(assumes.learnedClueIds)) {
    if (hasLearnedClue(pathFacts, clueId)) {
      continue
    }

    if (isHiddenSimulationClue(pathFacts, clueId)) {
      pushWarning(warnings, {
        pathId,
        nodeId,
        warningClass: 'player_awareness_leak',
        audience: 'player',
        summary: `Node assumes the player learned ${clueId}, but that clue exists only in simulation truth.`,
        relatedIds: [clueId],
        detailKey: `hidden-clue:${clueId}`,
      })
      continue
    }

    pushWarning(warnings, {
      pathId,
      nodeId,
      warningClass: 'unlearned_clue',
      audience: 'player',
      summary: `Node assumes the player learned ${clueId}, but the path never acquired it.`,
      relatedIds: [clueId],
      detailKey: `assumes-clue:${clueId}`,
    })
  }
}

function validateOfficialClaims(
  pathFacts: BranchPathFacts,
  node: BranchContinuityNode,
  supersededClaimIds: ReadonlySet<string>,
  warnings: BranchContinuityWarning[]
) {
  for (const claimId of normalizeStringList(node.citesOfficialClaimIds)) {
    if (!supersededClaimIds.has(claimId)) {
      continue
    }

    pushWarning(warnings, {
      pathId: pathFacts.pathId,
      nodeId: node.nodeId,
      warningClass: 'stale_official_claim',
      audience: 'institutional',
      summary: `Node cites official claim ${claimId} that was superseded on this path.`,
      relatedIds: [claimId],
      detailKey: `claim:${claimId}`,
    })
  }
}

function sortWarnings(warnings: BranchContinuityWarning[]) {
  warnings.sort((left, right) => {
    const nodeCompare = left.nodeId.localeCompare(right.nodeId)
    if (nodeCompare !== 0) {
      return nodeCompare
    }

    const classCompare = warningClassRank(left.warningClass) - warningClassRank(right.warningClass)
    if (classCompare !== 0) {
      return classCompare
    }

    return left.id.localeCompare(right.id)
  })
}

function buildSummary(warnings: readonly BranchContinuityWarning[]) {
  const byClass: Partial<Record<BranchContinuityWarningClass, number>> = {}
  let errorCount = 0

  for (const warning of warnings) {
    byClass[warning.warningClass] = (byClass[warning.warningClass] ?? 0) + 1
    if (warning.severity === 'error') {
      errorCount += 1
    }
  }

  return {
    warningCount: warnings.length,
    errorCount,
    byClass,
  }
}

export function validateBranchContinuity(
  input: BranchContinuityValidationInput
): BranchContinuityValidationReport {
  const pathFacts = input.pathFacts
  const correctedRecords = input.correctedRecords ?? []
  const { supersededClaimIds, revisionIds } = buildCorrectedRecordIndexes(pathFacts, correctedRecords)

  const warnings: BranchContinuityWarning[] = []

  for (const node of input.nodes) {
    validateRequires(pathFacts, node, revisionIds, warnings)
    validateAssumesPlayerKnows(pathFacts, node, warnings)
    validateOfficialClaims(pathFacts, node, supersededClaimIds, warnings)
  }

  sortWarnings(warnings)

  return {
    pathId: pathFacts.pathId,
    warnings,
    summary: buildSummary(warnings),
  }
}

export function formatBranchContinuityReportLines(
  report: BranchContinuityValidationReport
): string[] {
  const lines = [
    `Branch continuity: ${report.summary.warningCount} warnings (${report.summary.errorCount} errors)`,
  ]

  for (const warning of report.warnings) {
    lines.push(
      `${warning.severity} · ${warning.warningClass} · ${warning.nodeId} · ${warning.summary}`
    )
  }

  return lines
}
