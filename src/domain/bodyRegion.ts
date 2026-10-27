/**
 * SPE-120 — canonical body / exposure region vocabulary (identifiers only).
 *
 * Owns stable region IDs and authored coverage-group expansion used by wearable
 * compatibility (SPE-3394) and later localized damage/protection resolution.
 * Does not implement hit selection, armor mitigation, injury outcomes, or
 * medical aftermath — those remain inside the SPE-120 parent boundary.
 */

export const BODY_REGION_OWNER = 'SPE-120' as const

export const BODY_REGION_IDS = [
  'head',
  'torso',
  'arm_left',
  'arm_right',
  'leg_left',
  'leg_right',
] as const

export type BodyRegionId = (typeof BODY_REGION_IDS)[number]

const BODY_REGION_ID_SET = new Set<string>(BODY_REGION_IDS)

/** Authored coverage-group shorthand → canonical SPE-120 region IDs (C916). */
export const BODY_REGION_COVERAGE_GROUPS = {
  upper_body: ['head', 'torso', 'arm_left', 'arm_right'],
  lower_body: ['leg_left', 'leg_right'],
  full_body: [...BODY_REGION_IDS],
} as const satisfies Record<string, readonly BodyRegionId[]>

export type BodyRegionCoverageGroupId = keyof typeof BODY_REGION_COVERAGE_GROUPS

export function isBodyRegionId(value: string): value is BodyRegionId {
  return BODY_REGION_ID_SET.has(value)
}

export function isBodyRegionCoverageGroupId(value: string): value is BodyRegionCoverageGroupId {
  return Object.prototype.hasOwnProperty.call(BODY_REGION_COVERAGE_GROUPS, value)
}

/**
 * Expand authored coverage refs (canonical IDs and/or coverage groups) into a
 * deterministic deduplicated BodyRegionId list. Unknown refs fail closed.
 */
export function expandCoveredRegionRefs(
  refs: readonly string[]
):
  | { ok: true; regions: BodyRegionId[] }
  | { ok: false; unknownRefs: string[] } {
  const unknownRefs: string[] = []
  const seen = new Set<BodyRegionId>()
  const regions: BodyRegionId[] = []

  for (const raw of refs) {
    const ref = typeof raw === 'string' ? raw.trim() : ''
    if (!ref) {
      unknownRefs.push(String(raw))
      continue
    }

    if (isBodyRegionId(ref)) {
      if (!seen.has(ref)) {
        seen.add(ref)
        regions.push(ref)
      }
      continue
    }

    if (isBodyRegionCoverageGroupId(ref)) {
      for (const region of BODY_REGION_COVERAGE_GROUPS[ref]) {
        if (!seen.has(region)) {
          seen.add(region)
          regions.push(region)
        }
      }
      continue
    }

    unknownRefs.push(ref)
  }

  if (unknownRefs.length > 0) {
    return { ok: false, unknownRefs }
  }

  return { ok: true, regions }
}
