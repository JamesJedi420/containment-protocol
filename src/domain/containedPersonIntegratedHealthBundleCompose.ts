/**
 * SPE-1889 slice 5 + slice 8 + slice 9: compose upstream-derived fragments into persisted
 * contained-person integrated health bundles.
 *
 * Pure deterministic merge — strips prior wired links by ref prefix, preserves
 * authored bundle fields, and updates wired mental-state markers.
 */

import {
  validateContainedPersonIntegratedHealthBundle,
  type ContainedPersonIntegratedHealthBundle,
  type ContainedPersonIntegratedHealthBundleRecordsMap,
  type CustodyStatusLink,
  type MedicationRegimenLink,
  type TherapeuticCareScheduleLink,
} from './containedPersonIntegratedHealthBundleRegistry'
import {
  CUSTODY_STATUS_WIRED_REF_PREFIX,
  type DerivedCustodyStatusBundleFragment,
} from './containedPersonCustodyStatusHealthBundleLinks'
import {
  MEDICATION_REGIMEN_WIRED_REF_PREFIX,
  type DerivedMedicationRegimenBundleFragment,
} from './containedPersonMedicationRegimenHealthBundleLinks'
import {
  THERAPEUTIC_CARE_WIRED_REF_PREFIX,
  type DerivedTherapeuticCareBundleFragment,
} from './containedPersonTherapeuticCareHealthBundleLinks'

function isWiredTherapeuticCareLink(link: TherapeuticCareScheduleLink): boolean {
  const wiredRef = typeof link.wiredRef === 'string' ? link.wiredRef.trim() : ''
  return wiredRef.startsWith(THERAPEUTIC_CARE_WIRED_REF_PREFIX)
}

function sortTherapeuticCareScheduleLinks(
  links: readonly TherapeuticCareScheduleLink[]
): readonly TherapeuticCareScheduleLink[] {
  return Object.freeze(
    [...links].sort((left, right) => {
      const scheduleCompare = left.scheduleRef.localeCompare(right.scheduleRef)
      if (scheduleCompare !== 0) {
        return scheduleCompare
      }

      return left.wiredRef.localeCompare(right.wiredRef)
    })
  )
}

function mergeTherapeuticCareScheduleLinks(
  existing: readonly TherapeuticCareScheduleLink[] | undefined,
  derived: readonly TherapeuticCareScheduleLink[]
): readonly TherapeuticCareScheduleLink[] {
  const preserved = (existing ?? []).filter((link) => !isWiredTherapeuticCareLink(link))
  return sortTherapeuticCareScheduleLinks([...preserved, ...derived])
}

function bundlesDeepEqual(
  left: ContainedPersonIntegratedHealthBundle,
  right: ContainedPersonIntegratedHealthBundle
): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function isWiredMedicationRegimenLink(link: MedicationRegimenLink): boolean {
  const wiredRef = typeof link.wiredRef === 'string' ? link.wiredRef.trim() : ''
  return wiredRef.startsWith(MEDICATION_REGIMEN_WIRED_REF_PREFIX)
}

function hasAuthoredMedicationRegimenLinks(bundle: ContainedPersonIntegratedHealthBundle): boolean {
  return (bundle.medicationRegimenLinks ?? []).some((link) => !isWiredMedicationRegimenLink(link))
}

function isWiredCustodyStatusLink(link: CustodyStatusLink): boolean {
  const wiredRef = typeof link.wiredRef === 'string' ? link.wiredRef.trim() : ''
  return wiredRef.startsWith(CUSTODY_STATUS_WIRED_REF_PREFIX)
}

function hasAuthoredCustodyStatusLinks(bundle: ContainedPersonIntegratedHealthBundle): boolean {
  return (bundle.custodyStatusLinks ?? []).some((link) => !isWiredCustodyStatusLink(link))
}

function bundleHasAuthoredFields(bundle: ContainedPersonIntegratedHealthBundle): boolean {
  return (
    bundle.confidence !== undefined ||
    (bundle.unknownFields?.length ?? 0) > 0 ||
    (bundle.redactedFields?.length ?? 0) > 0 ||
    hasAuthoredMedicationRegimenLinks(bundle) ||
    hasAuthoredCustodyStatusLinks(bundle) ||
    (bundle.welfareDebtAccountingLinks?.length ?? 0) > 0 ||
    (bundle.therapeuticCareScheduleLinks ?? []).some((link) => !isWiredTherapeuticCareLink(link))
  )
}

function composeBundleWithFragment(
  existing: ContainedPersonIntegratedHealthBundle | undefined,
  fragment: DerivedTherapeuticCareBundleFragment
): ContainedPersonIntegratedHealthBundle {
  const mergedLinks = mergeTherapeuticCareScheduleLinks(
    existing?.therapeuticCareScheduleLinks,
    fragment.therapeuticCareScheduleLinks
  )

  const candidate: ContainedPersonIntegratedHealthBundle = {
    id: fragment.subjectRef,
    label: existing?.label ?? fragment.label,
    subjectRef: fragment.subjectRef,
    therapeuticCareScheduleLinks: mergedLinks,
    mentalStateBand: fragment.mentalStateBand,
    humaneCareRiskScore: fragment.humaneCareRiskScore,
    ...(existing?.medicationRegimenLinks
      ? { medicationRegimenLinks: existing.medicationRegimenLinks }
      : {}),
    ...(existing?.custodyStatusLinks ? { custodyStatusLinks: existing.custodyStatusLinks } : {}),
    ...(existing?.welfareDebtAccountingLinks
      ? { welfareDebtAccountingLinks: existing.welfareDebtAccountingLinks }
      : {}),
    ...(existing?.confidence !== undefined ? { confidence: existing.confidence } : {}),
    ...(existing?.unknownFields ? { unknownFields: existing.unknownFields } : {}),
    ...(existing?.redactedFields ? { redactedFields: existing.redactedFields } : {}),
  }

  if (!validateContainedPersonIntegratedHealthBundle(candidate).valid) {
    return existing ?? candidate
  }

  return Object.freeze(candidate)
}

function stripWiredFieldsFromBundle(
  bundle: ContainedPersonIntegratedHealthBundle
): ContainedPersonIntegratedHealthBundle | undefined {
  const preservedLinks = (bundle.therapeuticCareScheduleLinks ?? []).filter(
    (link) => !isWiredTherapeuticCareLink(link)
  )

  if (preservedLinks.length === 0 && !bundleHasAuthoredFields(bundle)) {
    return undefined
  }

  const candidate: ContainedPersonIntegratedHealthBundle = {
    id: bundle.id,
    label: bundle.label,
    subjectRef: bundle.subjectRef,
    ...(preservedLinks.length > 0
      ? { therapeuticCareScheduleLinks: sortTherapeuticCareScheduleLinks(preservedLinks) }
      : {}),
    ...(bundle.medicationRegimenLinks
      ? { medicationRegimenLinks: bundle.medicationRegimenLinks }
      : {}),
    ...(bundle.custodyStatusLinks ? { custodyStatusLinks: bundle.custodyStatusLinks } : {}),
    ...(bundle.welfareDebtAccountingLinks
      ? { welfareDebtAccountingLinks: bundle.welfareDebtAccountingLinks }
      : {}),
    ...(bundle.confidence !== undefined ? { confidence: bundle.confidence } : {}),
    ...(bundle.unknownFields ? { unknownFields: bundle.unknownFields } : {}),
    ...(bundle.redactedFields ? { redactedFields: bundle.redactedFields } : {}),
  }

  if (!validateContainedPersonIntegratedHealthBundle(candidate).valid) {
    return bundle
  }

  return Object.freeze(candidate)
}

/**
 * Merges therapeutic-care-derived bundle fragments into persisted integrated health bundles.
 * Empty bundle map with empty fragments is a no-op without throw.
 */
export function composeTherapeuticCareIntoIntegratedHealthBundles(
  bundles: ContainedPersonIntegratedHealthBundleRecordsMap | null | undefined,
  fragments: readonly DerivedTherapeuticCareBundleFragment[]
): ContainedPersonIntegratedHealthBundleRecordsMap {
  const safeBundles = bundles ?? {}
  const fragmentBySubject = new Map(
    fragments.map((fragment) => [fragment.subjectRef, fragment] as const)
  )
  const subjectRefs = new Set([
    ...Object.keys(safeBundles),
    ...fragments.map((fragment) => fragment.subjectRef),
  ])

  if (subjectRefs.size === 0) {
    return safeBundles
  }

  const next: ContainedPersonIntegratedHealthBundleRecordsMap = { ...safeBundles }
  let changed = false

  for (const subjectRef of [...subjectRefs].sort((left, right) => left.localeCompare(right))) {
    const existing = safeBundles[subjectRef]
    const fragment = fragmentBySubject.get(subjectRef)

    if (fragment) {
      const composed = composeBundleWithFragment(existing, fragment)
      if (!existing || !bundlesDeepEqual(existing, composed)) {
        next[subjectRef] = composed
        changed = true
      }
      continue
    }

    if (!existing) {
      continue
    }

    const hasWiredLinks = (existing.therapeuticCareScheduleLinks ?? []).some(
      isWiredTherapeuticCareLink
    )
    const hasWiredMarkers =
      existing.mentalStateBand !== undefined || existing.humaneCareRiskScore !== undefined

    if (!hasWiredLinks && !hasWiredMarkers) {
      continue
    }

    const stripped = stripWiredFieldsFromBundle(existing)
    if (stripped === undefined) {
      delete next[subjectRef]
      changed = true
      continue
    }

    if (stripped !== existing) {
      next[subjectRef] = stripped
      changed = true
    }
  }

  return changed ? next : safeBundles
}

function sortMedicationRegimenLinks(
  links: readonly MedicationRegimenLink[]
): readonly MedicationRegimenLink[] {
  return Object.freeze(
    [...links].sort((left, right) => {
      const regimenCompare = left.regimenRef.localeCompare(right.regimenRef)
      if (regimenCompare !== 0) {
        return regimenCompare
      }

      return left.wiredRef.localeCompare(right.wiredRef)
    })
  )
}

function mergeMedicationRegimenLinks(
  existing: readonly MedicationRegimenLink[] | undefined,
  derived: readonly MedicationRegimenLink[]
): readonly MedicationRegimenLink[] {
  const preserved = (existing ?? []).filter((link) => !isWiredMedicationRegimenLink(link))
  return sortMedicationRegimenLinks([...preserved, ...derived])
}

function composeBundleWithMedicationFragment(
  existing: ContainedPersonIntegratedHealthBundle | undefined,
  fragment: DerivedMedicationRegimenBundleFragment
): ContainedPersonIntegratedHealthBundle {
  const mergedLinks = mergeMedicationRegimenLinks(
    existing?.medicationRegimenLinks,
    fragment.medicationRegimenLinks
  )

  const candidate: ContainedPersonIntegratedHealthBundle = {
    id: fragment.subjectRef,
    label: existing?.label ?? fragment.label,
    subjectRef: fragment.subjectRef,
    medicationRegimenLinks: mergedLinks,
    ...(existing?.therapeuticCareScheduleLinks
      ? { therapeuticCareScheduleLinks: existing.therapeuticCareScheduleLinks }
      : {}),
    ...(existing?.custodyStatusLinks ? { custodyStatusLinks: existing.custodyStatusLinks } : {}),
    ...(existing?.welfareDebtAccountingLinks
      ? { welfareDebtAccountingLinks: existing.welfareDebtAccountingLinks }
      : {}),
    ...(existing?.mentalStateBand !== undefined ? { mentalStateBand: existing.mentalStateBand } : {}),
    ...(existing?.humaneCareRiskScore !== undefined
      ? { humaneCareRiskScore: existing.humaneCareRiskScore }
      : {}),
    ...(existing?.confidence !== undefined ? { confidence: existing.confidence } : {}),
    ...(existing?.unknownFields ? { unknownFields: existing.unknownFields } : {}),
    ...(existing?.redactedFields ? { redactedFields: existing.redactedFields } : {}),
  }

  if (!validateContainedPersonIntegratedHealthBundle(candidate).valid) {
    return existing ?? candidate
  }

  return Object.freeze(candidate)
}

function stripWiredMedicationLinksFromBundle(
  bundle: ContainedPersonIntegratedHealthBundle
): ContainedPersonIntegratedHealthBundle | undefined {
  const preservedLinks = (bundle.medicationRegimenLinks ?? []).filter(
    (link) => !isWiredMedicationRegimenLink(link)
  )

  const candidateWithoutWiredMedication: ContainedPersonIntegratedHealthBundle = {
    id: bundle.id,
    label: bundle.label,
    subjectRef: bundle.subjectRef,
    ...(preservedLinks.length > 0
      ? { medicationRegimenLinks: sortMedicationRegimenLinks(preservedLinks) }
      : {}),
    ...(bundle.therapeuticCareScheduleLinks
      ? { therapeuticCareScheduleLinks: bundle.therapeuticCareScheduleLinks }
      : {}),
    ...(bundle.custodyStatusLinks ? { custodyStatusLinks: bundle.custodyStatusLinks } : {}),
    ...(bundle.welfareDebtAccountingLinks
      ? { welfareDebtAccountingLinks: bundle.welfareDebtAccountingLinks }
      : {}),
    ...(bundle.mentalStateBand !== undefined ? { mentalStateBand: bundle.mentalStateBand } : {}),
    ...(bundle.humaneCareRiskScore !== undefined
      ? { humaneCareRiskScore: bundle.humaneCareRiskScore }
      : {}),
    ...(bundle.confidence !== undefined ? { confidence: bundle.confidence } : {}),
    ...(bundle.unknownFields ? { unknownFields: bundle.unknownFields } : {}),
    ...(bundle.redactedFields ? { redactedFields: bundle.redactedFields } : {}),
  }

  if (
    preservedLinks.length === 0 &&
    !bundleHasAuthoredFields(candidateWithoutWiredMedication) &&
    (candidateWithoutWiredMedication.therapeuticCareScheduleLinks?.length ?? 0) === 0 &&
    candidateWithoutWiredMedication.mentalStateBand === undefined &&
    candidateWithoutWiredMedication.humaneCareRiskScore === undefined
  ) {
    return undefined
  }

  if (!validateContainedPersonIntegratedHealthBundle(candidateWithoutWiredMedication).valid) {
    return bundle
  }

  return Object.freeze(candidateWithoutWiredMedication)
}

/**
 * Merges medication-regimen-derived bundle fragments into persisted integrated health bundles.
 * Empty bundle map with empty fragments is a no-op without throw.
 */
export function composeMedicationRegimenIntoIntegratedHealthBundles(
  bundles: ContainedPersonIntegratedHealthBundleRecordsMap | null | undefined,
  fragments: readonly DerivedMedicationRegimenBundleFragment[]
): ContainedPersonIntegratedHealthBundleRecordsMap {
  const safeBundles = bundles ?? {}
  const fragmentBySubject = new Map(
    fragments.map((fragment) => [fragment.subjectRef, fragment] as const)
  )
  const subjectRefs = new Set([
    ...Object.keys(safeBundles),
    ...fragments.map((fragment) => fragment.subjectRef),
  ])

  if (subjectRefs.size === 0) {
    return safeBundles
  }

  const next: ContainedPersonIntegratedHealthBundleRecordsMap = { ...safeBundles }
  let changed = false

  for (const subjectRef of [...subjectRefs].sort((left, right) => left.localeCompare(right))) {
    const existing = safeBundles[subjectRef]
    const fragment = fragmentBySubject.get(subjectRef)

    if (fragment) {
      const composed = composeBundleWithMedicationFragment(existing, fragment)
      if (!existing || !bundlesDeepEqual(existing, composed)) {
        next[subjectRef] = composed
        changed = true
      }
      continue
    }

    if (!existing) {
      continue
    }

    const hasWiredMedicationLinks = (existing.medicationRegimenLinks ?? []).some(
      isWiredMedicationRegimenLink
    )

    if (!hasWiredMedicationLinks) {
      continue
    }

    const stripped = stripWiredMedicationLinksFromBundle(existing)
    if (stripped === undefined) {
      delete next[subjectRef]
      changed = true
      continue
    }

    if (stripped !== existing) {
      next[subjectRef] = stripped
      changed = true
    }
  }

  return changed ? next : safeBundles
}

function sortCustodyStatusLinks(
  links: readonly CustodyStatusLink[]
): readonly CustodyStatusLink[] {
  return Object.freeze(
    [...links].sort((left, right) => {
      const custodyCompare = left.custodyRef.localeCompare(right.custodyRef)
      if (custodyCompare !== 0) {
        return custodyCompare
      }

      return left.wiredRef.localeCompare(right.wiredRef)
    })
  )
}

function mergeCustodyStatusLinks(
  existing: readonly CustodyStatusLink[] | undefined,
  derived: readonly CustodyStatusLink[]
): readonly CustodyStatusLink[] {
  const preserved = (existing ?? []).filter((link) => !isWiredCustodyStatusLink(link))
  return sortCustodyStatusLinks([...preserved, ...derived])
}

function composeBundleWithCustodyFragment(
  existing: ContainedPersonIntegratedHealthBundle | undefined,
  fragment: DerivedCustodyStatusBundleFragment
): ContainedPersonIntegratedHealthBundle {
  const mergedLinks = mergeCustodyStatusLinks(
    existing?.custodyStatusLinks,
    fragment.custodyStatusLinks
  )

  const candidate: ContainedPersonIntegratedHealthBundle = {
    id: fragment.subjectRef,
    label: existing?.label ?? fragment.label,
    subjectRef: fragment.subjectRef,
    custodyStatusLinks: mergedLinks,
    ...(existing?.therapeuticCareScheduleLinks
      ? { therapeuticCareScheduleLinks: existing.therapeuticCareScheduleLinks }
      : {}),
    ...(existing?.medicationRegimenLinks
      ? { medicationRegimenLinks: existing.medicationRegimenLinks }
      : {}),
    ...(existing?.welfareDebtAccountingLinks
      ? { welfareDebtAccountingLinks: existing.welfareDebtAccountingLinks }
      : {}),
    ...(existing?.mentalStateBand !== undefined ? { mentalStateBand: existing.mentalStateBand } : {}),
    ...(existing?.humaneCareRiskScore !== undefined
      ? { humaneCareRiskScore: existing.humaneCareRiskScore }
      : {}),
    ...(existing?.confidence !== undefined ? { confidence: existing.confidence } : {}),
    ...(existing?.unknownFields ? { unknownFields: existing.unknownFields } : {}),
    ...(existing?.redactedFields ? { redactedFields: existing.redactedFields } : {}),
  }

  if (!validateContainedPersonIntegratedHealthBundle(candidate).valid) {
    return existing ?? candidate
  }

  return Object.freeze(candidate)
}

function stripWiredCustodyLinksFromBundle(
  bundle: ContainedPersonIntegratedHealthBundle
): ContainedPersonIntegratedHealthBundle | undefined {
  const preservedLinks = (bundle.custodyStatusLinks ?? []).filter(
    (link) => !isWiredCustodyStatusLink(link)
  )

  const candidateWithoutWiredCustody: ContainedPersonIntegratedHealthBundle = {
    id: bundle.id,
    label: bundle.label,
    subjectRef: bundle.subjectRef,
    ...(preservedLinks.length > 0
      ? { custodyStatusLinks: sortCustodyStatusLinks(preservedLinks) }
      : {}),
    ...(bundle.therapeuticCareScheduleLinks
      ? { therapeuticCareScheduleLinks: bundle.therapeuticCareScheduleLinks }
      : {}),
    ...(bundle.medicationRegimenLinks
      ? { medicationRegimenLinks: bundle.medicationRegimenLinks }
      : {}),
    ...(bundle.welfareDebtAccountingLinks
      ? { welfareDebtAccountingLinks: bundle.welfareDebtAccountingLinks }
      : {}),
    ...(bundle.mentalStateBand !== undefined ? { mentalStateBand: bundle.mentalStateBand } : {}),
    ...(bundle.humaneCareRiskScore !== undefined
      ? { humaneCareRiskScore: bundle.humaneCareRiskScore }
      : {}),
    ...(bundle.confidence !== undefined ? { confidence: bundle.confidence } : {}),
    ...(bundle.unknownFields ? { unknownFields: bundle.unknownFields } : {}),
    ...(bundle.redactedFields ? { redactedFields: bundle.redactedFields } : {}),
  }

  if (
    preservedLinks.length === 0 &&
    !bundleHasAuthoredFields(candidateWithoutWiredCustody) &&
    (candidateWithoutWiredCustody.therapeuticCareScheduleLinks?.length ?? 0) === 0 &&
    (candidateWithoutWiredCustody.medicationRegimenLinks?.length ?? 0) === 0 &&
    candidateWithoutWiredCustody.mentalStateBand === undefined &&
    candidateWithoutWiredCustody.humaneCareRiskScore === undefined
  ) {
    return undefined
  }

  if (!validateContainedPersonIntegratedHealthBundle(candidateWithoutWiredCustody).valid) {
    return bundle
  }

  return Object.freeze(candidateWithoutWiredCustody)
}

/**
 * Merges custody-status-derived bundle fragments into persisted integrated health bundles.
 * Empty bundle map with empty fragments is a no-op without throw.
 */
export function composeCustodyStatusIntoIntegratedHealthBundles(
  bundles: ContainedPersonIntegratedHealthBundleRecordsMap | null | undefined,
  fragments: readonly DerivedCustodyStatusBundleFragment[]
): ContainedPersonIntegratedHealthBundleRecordsMap {
  const safeBundles = bundles ?? {}
  const fragmentBySubject = new Map(
    fragments.map((fragment) => [fragment.subjectRef, fragment] as const)
  )
  const subjectRefs = new Set([
    ...Object.keys(safeBundles),
    ...fragments.map((fragment) => fragment.subjectRef),
  ])

  if (subjectRefs.size === 0) {
    return safeBundles
  }

  const next: ContainedPersonIntegratedHealthBundleRecordsMap = { ...safeBundles }
  let changed = false

  for (const subjectRef of [...subjectRefs].sort((left, right) => left.localeCompare(right))) {
    const existing = safeBundles[subjectRef]
    const fragment = fragmentBySubject.get(subjectRef)

    if (fragment) {
      const composed = composeBundleWithCustodyFragment(existing, fragment)
      if (!existing || !bundlesDeepEqual(existing, composed)) {
        next[subjectRef] = composed
        changed = true
      }
      continue
    }

    if (!existing) {
      continue
    }

    const hasWiredCustodyLinks = (existing.custodyStatusLinks ?? []).some(isWiredCustodyStatusLink)

    if (!hasWiredCustodyLinks) {
      continue
    }

    const stripped = stripWiredCustodyLinksFromBundle(existing)
    if (stripped === undefined) {
      delete next[subjectRef]
      changed = true
      continue
    }

    if (stripped !== existing) {
      next[subjectRef] = stripped
      changed = true
    }
  }

  return changed ? next : safeBundles
}
