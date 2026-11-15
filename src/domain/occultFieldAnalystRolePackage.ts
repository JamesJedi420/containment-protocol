/** SPE-2229 authoring template; references do not grant access or instantiate staff. */
import type { CompetencyDomain } from './competencyFramework'
import { TRAIT_DEFINITIONS } from './traits'

const COMPETENCIES = {
  response: true,
  containment: true,
  technical: true,
  research: true,
  medical: true,
  social: true,
} satisfies Record<CompetencyDomain, true>
const CP_TRAIT_IDS = new Set(TRAIT_DEFINITIONS.map((trait) => trait.id))

export interface OccultFieldAnalystRolePackage {
  readonly id: string
  readonly startingCompetencies: readonly CompetencyDomain[]
  readonly signatureTraits: readonly string[]
  /** Reference to a caller-known access policy, not an authorization. */
  readonly documentAccess: string
}

export type AnalystPackageResult =
  | { readonly ok: true; readonly package: OccultFieldAnalystRolePackage }
  | { readonly ok: false; readonly reason: string }

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function validList(value: unknown, isAllowed: (entry: unknown) => boolean): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    Array.from(value).every(isAllowed) &&
    new Set(value).size === value.length
  )
}

/** Caller supplies known access-policy references; this function does not assess clearance. */
export function validateOccultFieldAnalystRolePackage(
  input: unknown,
  knownDocumentAccess: readonly string[]
): AnalystPackageResult {
  if (!isRecord(input) || !isText(input.id)) return { ok: false, reason: 'invalid-id' }
  if (
    !validList(
      input.startingCompetencies,
      (value) => typeof value === 'string' && Object.hasOwn(COMPETENCIES, value)
    )
  )
    return { ok: false, reason: 'invalid-competencies' }
  if (
    !validList(
      input.signatureTraits,
      (value) => typeof value === 'string' && CP_TRAIT_IDS.has(value)
    )
  ) {
    return { ok: false, reason: 'invalid-traits' }
  }
  if (
    !isText(input.documentAccess) ||
    !Array.isArray(knownDocumentAccess) ||
    !knownDocumentAccess.includes(input.documentAccess)
  ) {
    return { ok: false, reason: 'invalid-document-access' }
  }
  const result: OccultFieldAnalystRolePackage = Object.freeze({
    id: input.id,
    startingCompetencies: Object.freeze(
      [...input.startingCompetencies].sort() as CompetencyDomain[]
    ),
    signatureTraits: Object.freeze([...input.signatureTraits].sort()),
    documentAccess: input.documentAccess,
  })
  return { ok: true, package: result }
}

/** Deterministic lookup rejects duplicate IDs and malformed catalog entries. */
export function lookupOccultFieldAnalystRolePackage(
  catalog: readonly unknown[],
  id: string,
  knownDocumentAccess: readonly string[]
): AnalystPackageResult {
  if (!isText(id) || !Array.isArray(catalog)) return { ok: false, reason: 'invalid-lookup' }
  const matches: OccultFieldAnalystRolePackage[] = []
  const seen = new Set<string>()
  for (const entry of catalog) {
    const result = validateOccultFieldAnalystRolePackage(entry, knownDocumentAccess)
    if (!result.ok) return result
    if (seen.has(result.package.id)) return { ok: false, reason: 'duplicate-id' }
    seen.add(result.package.id)
    if (result.package.id === id) matches.push(result.package)
  }
  if (matches.length === 0) return { ok: false, reason: 'not-found' }
  return { ok: true, package: matches[0] }
}
