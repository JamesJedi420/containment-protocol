/**
 * SPE-699 — affiliated orders, sects, and branch linkage.
 *
 * Pure caller-owned linked branch records under one parent institution.
 * InstitutionProfile umbrella/branchKey hooks remain SPE-698 scaffolding;
 * this module owns affiliation state, visibility/mandate tension, and
 * mantle-style office continuity. No GameState field and no schism simulator.
 */

export const AFFILIATED_ORDER_BRANCH_LINKAGE_OWNER = 'SPE-699' as const

export type BranchVisibility = 'public' | 'semi_public' | 'deniable_covert'

export type AffiliationKind = 'internal_branch' | 'sect' | 'affiliated_order'

export type AutonomyBand = 'subordinate' | 'semi_autonomous' | 'rival_tolerated'

export type DoctrinalStance = 'aligned' | 'divergent' | 'rival'

export interface AffiliatedBranchRecord {
  readonly branchId: string
  readonly parentInstitutionProfileId: string
  readonly umbrellaProfileId: string
  readonly branchKey: string
  readonly affiliationKind: AffiliationKind
  readonly visibility: BranchVisibility
  readonly autonomyBand: AutonomyBand
  readonly doctrinalStance: DoctrinalStance
  /** Compact mandate assumption tag (not prose). */
  readonly mandateTag: string
  /** Compact authority assumption tag. */
  readonly authorityTag: string
  /** Compact resourcing assumption tag. */
  readonly resourcingTag: string
  /** Compact moral-limit assumption tag. */
  readonly moralLimitTag: string
  /** Shared public office identity for mantle continuity. */
  readonly publicOfficeIdentity?: string
  readonly currentOccupantId?: string
  readonly predecessorOccupantId?: string
  /** When true, internal replacement stays institutionally concealed. */
  readonly mantleConcealed?: boolean
}

export interface BranchLinkageGroup {
  readonly umbrellaProfileId: string
  readonly parentInstitutionProfileId: string
  readonly branchIds: readonly string[]
  readonly visibilityBands: readonly BranchVisibility[]
  readonly hasSemiAutonomousOrder: boolean
  readonly hasDoctrinalDivergence: boolean
  readonly hasRivalry: boolean
}

export interface BranchDownstreamSurface {
  readonly branchId: string
  readonly parentInstitutionProfileId: string
  readonly umbrellaProfileId: string
  readonly accessHints: readonly string[]
  readonly legitimacyHints: readonly string[]
  readonly factionBehaviorHints: readonly string[]
}

export interface BranchDivergencePair {
  readonly leftBranchId: string
  readonly rightBranchId: string
  readonly differByVisibility: boolean
  readonly differByMandate: boolean
  readonly differByMoralLimit: boolean
}

const VISIBILITY_ORDER: readonly BranchVisibility[] = [
  'public',
  'semi_public',
  'deniable_covert',
]

function requireNonEmpty(value: string, label: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new Error(`affiliated branch ${label} is required`)
  return trimmed
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.filter((entry) => entry.length > 0))].sort((a, b) =>
    a.localeCompare(b),
  )
}

function isAffiliationKind(value: unknown): value is AffiliationKind {
  return value === 'internal_branch' || value === 'sect' || value === 'affiliated_order'
}

function isVisibility(value: unknown): value is BranchVisibility {
  return value === 'public' || value === 'semi_public' || value === 'deniable_covert'
}

function isAutonomyBand(value: unknown): value is AutonomyBand {
  return value === 'subordinate' || value === 'semi_autonomous' || value === 'rival_tolerated'
}

function isDoctrinalStance(value: unknown): value is DoctrinalStance {
  return value === 'aligned' || value === 'divergent' || value === 'rival'
}

/**
 * Fail-closed create for one linked branch / affiliated-order record.
 */
export function createAffiliatedBranchRecord(
  input: AffiliatedBranchRecord,
): AffiliatedBranchRecord {
  const branchId = requireNonEmpty(input.branchId, 'branchId')
  const parentInstitutionProfileId = requireNonEmpty(
    input.parentInstitutionProfileId,
    'parentInstitutionProfileId',
  )
  const umbrellaProfileId = requireNonEmpty(input.umbrellaProfileId, 'umbrellaProfileId')
  const branchKey = requireNonEmpty(input.branchKey, 'branchKey')
  const mandateTag = requireNonEmpty(input.mandateTag, 'mandateTag')
  const authorityTag = requireNonEmpty(input.authorityTag, 'authorityTag')
  const resourcingTag = requireNonEmpty(input.resourcingTag, 'resourcingTag')
  const moralLimitTag = requireNonEmpty(input.moralLimitTag, 'moralLimitTag')

  if (!isAffiliationKind(input.affiliationKind)) {
    throw new Error('affiliated branch affiliationKind is invalid')
  }
  if (!isVisibility(input.visibility)) {
    throw new Error('affiliated branch visibility is invalid')
  }
  if (!isAutonomyBand(input.autonomyBand)) {
    throw new Error('affiliated branch autonomyBand is invalid')
  }
  if (!isDoctrinalStance(input.doctrinalStance)) {
    throw new Error('affiliated branch doctrinalStance is invalid')
  }

  const publicOfficeIdentity = input.publicOfficeIdentity?.trim() || undefined
  const currentOccupantId = input.currentOccupantId?.trim() || undefined
  const predecessorOccupantId = input.predecessorOccupantId?.trim() || undefined

  if (input.mantleConcealed === true && !publicOfficeIdentity) {
    throw new Error('affiliated branch mantleConcealed requires publicOfficeIdentity')
  }
  if (predecessorOccupantId && !currentOccupantId) {
    throw new Error('affiliated branch predecessorOccupantId requires currentOccupantId')
  }
  if (currentOccupantId && predecessorOccupantId && currentOccupantId === predecessorOccupantId) {
    throw new Error('affiliated branch occupant ids must differ for mantle succession')
  }

  return Object.freeze({
    branchId,
    parentInstitutionProfileId,
    umbrellaProfileId,
    branchKey,
    affiliationKind: input.affiliationKind,
    visibility: input.visibility,
    autonomyBand: input.autonomyBand,
    doctrinalStance: input.doctrinalStance,
    mandateTag,
    authorityTag,
    resourcingTag,
    moralLimitTag,
    ...(publicOfficeIdentity ? { publicOfficeIdentity } : {}),
    ...(currentOccupantId ? { currentOccupantId } : {}),
    ...(predecessorOccupantId ? { predecessorOccupantId } : {}),
    ...(input.mantleConcealed === true ? { mantleConcealed: true as const } : {}),
  })
}

/**
 * Validate linkage consistency across a set of sibling branches.
 */
export function validateAffiliatedBranchSet(
  branches: readonly AffiliatedBranchRecord[],
): string[] {
  const errors: string[] = []
  const seenIds = new Set<string>()
  const seenKeys = new Map<string, string>()
  const umbrellaParent = new Map<string, string>()

  for (const branch of branches) {
    if (seenIds.has(branch.branchId)) {
      errors.push(`duplicate branchId: ${branch.branchId}`)
    }
    seenIds.add(branch.branchId)

    const keyScope = `${branch.umbrellaProfileId}|${branch.branchKey}`
    const prior = seenKeys.get(keyScope)
    if (prior) {
      errors.push(
        `duplicate branchKey under umbrella ${branch.umbrellaProfileId}: ${branch.branchKey} (${prior}, ${branch.branchId})`,
      )
    } else {
      seenKeys.set(keyScope, branch.branchId)
    }

    if (!branch.parentInstitutionProfileId) {
      errors.push(`${branch.branchId}: missing parentInstitutionProfileId`)
    }
    if (!branch.umbrellaProfileId) {
      errors.push(`${branch.branchId}: missing umbrellaProfileId`)
    }

    const recordedParent = umbrellaParent.get(branch.umbrellaProfileId)
    if (!recordedParent) {
      umbrellaParent.set(branch.umbrellaProfileId, branch.parentInstitutionProfileId)
    } else if (recordedParent !== branch.parentInstitutionProfileId) {
      errors.push(
        `${branch.branchId}: umbrella ${branch.umbrellaProfileId} parent mismatch (${recordedParent} vs ${branch.parentInstitutionProfileId})`,
      )
    }
  }

  return errors
}

/**
 * Group linked branches by umbrella under one parent institution.
 */
export function groupBranchesByUmbrella(
  branches: readonly AffiliatedBranchRecord[],
): BranchLinkageGroup[] {
  const byUmbrella = new Map<string, AffiliatedBranchRecord[]>()

  for (const branch of branches) {
    const existing = byUmbrella.get(branch.umbrellaProfileId) ?? []
    existing.push(branch)
    byUmbrella.set(branch.umbrellaProfileId, existing)
  }

  const groups: BranchLinkageGroup[] = []
  for (const [umbrellaProfileId, members] of [...byUmbrella.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    const sorted = [...members].sort((a, b) => a.branchId.localeCompare(b.branchId))
    const parentInstitutionProfileId = sorted[0]?.parentInstitutionProfileId ?? ''
    const visibilityBands = uniqueSorted(
      sorted.map((entry) => entry.visibility),
    ) as BranchVisibility[]
    // Keep visibility in declared band order when present.
    visibilityBands.sort(
      (a, b) => VISIBILITY_ORDER.indexOf(a) - VISIBILITY_ORDER.indexOf(b),
    )

    groups.push(
      Object.freeze({
        umbrellaProfileId,
        parentInstitutionProfileId,
        branchIds: Object.freeze(sorted.map((entry) => entry.branchId)),
        visibilityBands: Object.freeze(visibilityBands),
        hasSemiAutonomousOrder: sorted.some(
          (entry) =>
            entry.affiliationKind === 'affiliated_order' &&
            entry.autonomyBand === 'semi_autonomous',
        ),
        hasDoctrinalDivergence: sorted.some(
          (entry) =>
            entry.doctrinalStance === 'divergent' || entry.doctrinalStance === 'rival',
        ),
        hasRivalry: sorted.some(
          (entry) =>
            entry.doctrinalStance === 'rival' || entry.autonomyBand === 'rival_tolerated',
        ),
      }),
    )
  }

  return groups
}

/**
 * Apply mantle-style office continuity: successor keeps the same public office
 * identity while the internal replacement remains concealed when requested.
 */
export function applyMantleSuccession(args: {
  readonly branch: AffiliatedBranchRecord
  readonly successorOccupantId: string
  readonly concealReplacement?: boolean
}): AffiliatedBranchRecord {
  const successorOccupantId = requireNonEmpty(args.successorOccupantId, 'successorOccupantId')
  const publicOfficeIdentity = requireNonEmpty(
    args.branch.publicOfficeIdentity ?? '',
    'publicOfficeIdentity',
  )
  const predecessor =
    args.branch.currentOccupantId?.trim() || args.branch.predecessorOccupantId?.trim() || undefined

  if (predecessor && predecessor === successorOccupantId) {
    throw new Error('mantle succession requires a different successor occupant')
  }

  return createAffiliatedBranchRecord({
    branchId: args.branch.branchId,
    parentInstitutionProfileId: args.branch.parentInstitutionProfileId,
    umbrellaProfileId: args.branch.umbrellaProfileId,
    branchKey: args.branch.branchKey,
    affiliationKind: args.branch.affiliationKind,
    visibility: args.branch.visibility,
    autonomyBand: args.branch.autonomyBand,
    doctrinalStance: args.branch.doctrinalStance,
    mandateTag: args.branch.mandateTag,
    authorityTag: args.branch.authorityTag,
    resourcingTag: args.branch.resourcingTag,
    moralLimitTag: args.branch.moralLimitTag,
    publicOfficeIdentity,
    currentOccupantId: successorOccupantId,
    ...(predecessor ? { predecessorOccupantId: predecessor } : {}),
    ...(args.concealReplacement === true ? { mantleConcealed: true as const } : {}),
  })
}

/**
 * Downstream-ready hints for access, legitimacy, and faction behavior.
 */
export function deriveBranchDownstreamSurface(
  branch: AffiliatedBranchRecord,
): BranchDownstreamSurface {
  return Object.freeze({
    branchId: branch.branchId,
    parentInstitutionProfileId: branch.parentInstitutionProfileId,
    umbrellaProfileId: branch.umbrellaProfileId,
    accessHints: Object.freeze(
      uniqueSorted([
        `access:visibility-${branch.visibility}`,
        `access:mandate-${branch.mandateTag}`,
        `access:authority-${branch.authorityTag}`,
        `access:resourcing-${branch.resourcingTag}`,
      ]),
    ),
    legitimacyHints: Object.freeze(
      uniqueSorted([
        `legitimacy:affiliation-${branch.affiliationKind}`,
        `legitimacy:doctrine-${branch.doctrinalStance}`,
        `legitimacy:moral-${branch.moralLimitTag}`,
        ...(branch.mantleConcealed === true
          ? ['legitimacy:mantle-concealed']
          : branch.publicOfficeIdentity
            ? [`legitimacy:office-${branch.publicOfficeIdentity}`]
            : []),
      ]),
    ),
    factionBehaviorHints: Object.freeze(
      uniqueSorted([
        `faction:autonomy-${branch.autonomyBand}`,
        `faction:branch-${branch.branchKey}`,
        ...(branch.doctrinalStance === 'rival' || branch.autonomyBand === 'rival_tolerated'
          ? ['faction:internal-rivalry']
          : []),
        ...(branch.affiliationKind === 'affiliated_order'
          ? ['faction:affiliated-order']
          : []),
      ]),
    ),
  })
}

/**
 * Enumerate sibling pairs under the same umbrella that differ by visibility,
 * mandate, or moral-limit assumptions.
 */
export function listDivergentBranchPairs(
  branches: readonly AffiliatedBranchRecord[],
): BranchDivergencePair[] {
  const byUmbrella = new Map<string, AffiliatedBranchRecord[]>()
  for (const branch of branches) {
    const list = byUmbrella.get(branch.umbrellaProfileId) ?? []
    list.push(branch)
    byUmbrella.set(branch.umbrellaProfileId, list)
  }

  const pairs: BranchDivergencePair[] = []
  for (const members of byUmbrella.values()) {
    const sorted = [...members].sort((a, b) => a.branchId.localeCompare(b.branchId))
    for (let i = 0; i < sorted.length; i += 1) {
      for (let j = i + 1; j < sorted.length; j += 1) {
        const left = sorted[i]!
        const right = sorted[j]!
        const differByVisibility = left.visibility !== right.visibility
        const differByMandate = left.mandateTag !== right.mandateTag
        const differByMoralLimit = left.moralLimitTag !== right.moralLimitTag
        if (!differByVisibility && !differByMandate && !differByMoralLimit) continue
        pairs.push(
          Object.freeze({
            leftBranchId: left.branchId,
            rightBranchId: right.branchId,
            differByVisibility,
            differByMandate,
            differByMoralLimit,
          }),
        )
      }
    }
  }

  return pairs.sort((a, b) => {
    const left = a.leftBranchId.localeCompare(b.leftBranchId)
    if (left !== 0) return left
    return a.rightBranchId.localeCompare(b.rightBranchId)
  })
}
