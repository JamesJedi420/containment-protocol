import { describe, expect, it } from 'vitest'
import {
  applyMantleSuccession,
  createAffiliatedBranchRecord,
  deriveBranchDownstreamSurface,
  groupBranchesByUmbrella,
  listDivergentBranchPairs,
  validateAffiliatedBranchSet,
} from '../domain/affiliatedOrderBranchLinkage'

describe('SPE-699 affiliated orders, sects, and branch linkage', () => {
  const parentId = 'civ:sanctum:profile:10:1:order'
  const umbrellaId = 'civ:sanctum:umbrella:order'

  const publicBranch = createAffiliatedBranchRecord({
    branchId: 'branch-public-desk',
    parentInstitutionProfileId: parentId,
    umbrellaProfileId: umbrellaId,
    branchKey: 'order-public',
    affiliationKind: 'internal_branch',
    visibility: 'public',
    autonomyBand: 'subordinate',
    doctrinalStance: 'aligned',
    mandateTag: 'civic-containment',
    authorityTag: 'chartered-office',
    resourcingTag: 'tithe-budget',
    moralLimitTag: 'public-accountability',
    publicOfficeIdentity: 'office:warden-of-rites',
    currentOccupantId: 'occupant:elder-vera',
  })

  const semiPublicSect = createAffiliatedBranchRecord({
    branchId: 'branch-sect-lantern',
    parentInstitutionProfileId: parentId,
    umbrellaProfileId: umbrellaId,
    branchKey: 'order-sect-lantern',
    affiliationKind: 'sect',
    visibility: 'semi_public',
    autonomyBand: 'rival_tolerated',
    doctrinalStance: 'divergent',
    mandateTag: 'doctrinal-inquiry',
    authorityTag: 'tolerated-chapter',
    resourcingTag: 'chapter-dues',
    moralLimitTag: 'soft-interdiction',
  })

  const covertOrder = createAffiliatedBranchRecord({
    branchId: 'branch-order-veil',
    parentInstitutionProfileId: parentId,
    umbrellaProfileId: umbrellaId,
    branchKey: 'order-veil',
    affiliationKind: 'affiliated_order',
    visibility: 'deniable_covert',
    autonomyBand: 'semi_autonomous',
    doctrinalStance: 'aligned',
    mandateTag: 'deniable-interdiction',
    authorityTag: 'shadow-warrant',
    resourcingTag: 'black-ledger',
    moralLimitTag: 'ends-justify',
  })

  it('links divergent internal branches and a semi-autonomous affiliated order under one parent', () => {
    const branches = [publicBranch, semiPublicSect, covertOrder]
    expect(validateAffiliatedBranchSet(branches)).toEqual([])

    const groups = groupBranchesByUmbrella(branches)
    expect(groups).toHaveLength(1)
    expect(groups[0]?.parentInstitutionProfileId).toBe(parentId)
    expect(groups[0]?.branchIds).toEqual([
      'branch-order-veil',
      'branch-public-desk',
      'branch-sect-lantern',
    ])
    expect(groups[0]?.visibilityBands).toEqual([
      'public',
      'semi_public',
      'deniable_covert',
    ])
    expect(groups[0]?.hasSemiAutonomousOrder).toBe(true)
    expect(groups[0]?.hasDoctrinalDivergence).toBe(true)
    expect(groups[0]?.hasRivalry).toBe(true)
  })

  it('flags branch pairs that differ by visibility, mandate, or moral-limit assumptions', () => {
    const pairs = listDivergentBranchPairs([publicBranch, semiPublicSect, covertOrder])
    expect(pairs.length).toBe(3)

    const publicVsCovert = pairs.find(
      (pair) =>
        pair.leftBranchId === 'branch-order-veil' &&
        pair.rightBranchId === 'branch-public-desk',
    )
    expect(publicVsCovert).toEqual({
      leftBranchId: 'branch-order-veil',
      rightBranchId: 'branch-public-desk',
      differByVisibility: true,
      differByMandate: true,
      differByMoralLimit: true,
    })
  })

  it('applies mantle succession while preserving public office identity', () => {
    const succeeded = applyMantleSuccession({
      branch: publicBranch,
      successorOccupantId: 'occupant:heir-jonas',
      concealReplacement: true,
    })

    expect(succeeded.publicOfficeIdentity).toBe('office:warden-of-rites')
    expect(succeeded.currentOccupantId).toBe('occupant:heir-jonas')
    expect(succeeded.predecessorOccupantId).toBe('occupant:elder-vera')
    expect(succeeded.mantleConcealed).toBe(true)

    const surface = deriveBranchDownstreamSurface(succeeded)
    expect(surface.legitimacyHints).toContain('legitimacy:mantle-concealed')
    expect(surface.legitimacyHints).toContain('legitimacy:office-office:warden-of-rites')
    expect(surface.accessHints).toContain('access:visibility-public')
    expect(surface.factionBehaviorHints).toContain('faction:autonomy-subordinate')

    // Vacancy (no current occupant) must not invent a predecessor from a stale prior.
    const vacant = createAffiliatedBranchRecord({
      ...publicBranch,
      branchId: 'branch-vacant-mantle',
      currentOccupantId: undefined,
      predecessorOccupantId: 'occupant:stale-prior',
    })
    const filledVacancy = applyMantleSuccession({
      branch: vacant,
      successorOccupantId: 'occupant:new-warden',
    })
    expect(filledVacancy.currentOccupantId).toBe('occupant:new-warden')
    expect(filledVacancy.predecessorOccupantId).toBeUndefined()

    // Already-concealed mantle stays concealed across further succession.
    const second = applyMantleSuccession({
      branch: succeeded,
      successorOccupantId: 'occupant:heir-mira',
    })
    expect(second.mantleConcealed).toBe(true)
    expect(second.predecessorOccupantId).toBe('occupant:heir-jonas')
  })

  it('projects deterministic downstream consumption for affiliated-order autonomy', () => {
    const surface = deriveBranchDownstreamSurface(covertOrder)
    expect(surface.parentInstitutionProfileId).toBe(parentId)
    expect(surface.umbrellaProfileId).toBe(umbrellaId)
    expect(surface.accessHints).toEqual([
      'access:authority-shadow-warrant',
      'access:mandate-deniable-interdiction',
      'access:resourcing-black-ledger',
      'access:visibility-deniable_covert',
    ])
    expect(surface.factionBehaviorHints).toContain('faction:affiliated-order')
    expect(surface.factionBehaviorHints).toContain('faction:autonomy-semi_autonomous')
  })

  it('rejects invalid create and duplicate branch keys under one umbrella', () => {
    expect(() =>
      createAffiliatedBranchRecord({
        ...publicBranch,
        branchId: '',
      }),
    ).toThrow(/branchId is required/)

    expect(() =>
      createAffiliatedBranchRecord({
        ...publicBranch,
        branchId: 'branch-mantle-bad',
        mantleConcealed: true,
        publicOfficeIdentity: undefined,
      }),
    ).toThrow(/mantleConcealed requires publicOfficeIdentity/)

    const duplicate = createAffiliatedBranchRecord({
      ...semiPublicSect,
      branchId: 'branch-sect-dup',
      branchKey: publicBranch.branchKey,
    })
    expect(validateAffiliatedBranchSet([publicBranch, duplicate])).toEqual([
      `duplicate branchKey under umbrella ${umbrellaId}: ${publicBranch.branchKey} (${publicBranch.branchId}, branch-sect-dup)`,
    ])

    const mismatchedParent = createAffiliatedBranchRecord({
      ...semiPublicSect,
      branchId: 'branch-wrong-parent',
      parentInstitutionProfileId: 'other-parent',
    })
    expect(validateAffiliatedBranchSet([publicBranch, mismatchedParent])).toEqual([
      `branch-wrong-parent: umbrella ${umbrellaId} parent mismatch (${parentId} vs other-parent)`,
    ])

    const duplicateId = createAffiliatedBranchRecord({
      ...semiPublicSect,
      branchId: publicBranch.branchId,
      branchKey: 'order-sect-other-key',
    })
    expect(validateAffiliatedBranchSet([publicBranch, duplicateId])).toEqual([
      `duplicate branchId: ${publicBranch.branchId}`,
    ])

    expect(() => groupBranchesByUmbrella([publicBranch, mismatchedParent])).toThrow(
      /affiliated branch set invalid/,
    )
    expect(() => listDivergentBranchPairs([publicBranch, mismatchedParent])).toThrow(
      /affiliated branch set invalid/,
    )
  })
})
