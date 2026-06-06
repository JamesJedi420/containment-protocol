/**
 * SPE-1889 slice 5: compose therapeutic-care-derived fragments into persisted
 * contained-person integrated health bundles.
 *
 * Pure deterministic merge — strips prior wired links by therapeutic-care ref
 * prefix, preserves authored bundle fields, and updates wired mental-state markers.
 */

import {
  validateContainedPersonIntegratedHealthBundle,
  type ContainedPersonIntegratedHealthBundle,
  type ContainedPersonIntegratedHealthBundleRecordsMap,
  type TherapeuticCareScheduleLink,
} from './containedPersonIntegratedHealthBundleRegistry'
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

function bundleHasAuthoredFields(bundle: ContainedPersonIntegratedHealthBundle): boolean {
  return (
    bundle.confidence !== undefined ||
    (bundle.unknownFields?.length ?? 0) > 0 ||
    (bundle.redactedFields?.length ?? 0) > 0 ||
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
