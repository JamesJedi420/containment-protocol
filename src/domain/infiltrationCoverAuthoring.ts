/**
 * SPE-521 slice 3: normalize authored infiltration cover profiles for case templates.
 */

import type { InfiltrationCoverProfile, InfiltrationCoverRole } from './infiltrationCover'
import { isInfiltrationCoverRole } from './infiltrationCover'

export interface AuthoredInfiltrationCoverProfile {
  claimedRole?: string
  documentTier?: number
  doctrineBand?: number
  routeViolationTags?: readonly string[]
}

function isAuthoredProfileRecord(value: unknown): value is Partial<AuthoredInfiltrationCoverProfile> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeCoverRole(role: unknown): InfiltrationCoverRole | undefined {
  if (typeof role !== 'string') {
    return undefined
  }

  const trimmed = role.trim() as InfiltrationCoverRole
  return isInfiltrationCoverRole(trimmed) ? trimmed : undefined
}

function normalizeDocumentTier(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined
  }

  const tier = Math.trunc(value)
  return tier >= 0 && tier <= 2 ? tier : undefined
}

function normalizeDoctrineBand(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined
  }

  return value >= 0 && value <= 1 ? value : undefined
}

function normalizeRouteViolationTags(tags: readonly string[] | undefined): readonly string[] | undefined {
  if (!Array.isArray(tags) || tags.length === 0) {
    return undefined
  }

  const normalized = [
    ...new Set(tags.map((tag) => (typeof tag === 'string' ? tag.trim() : '')).filter(Boolean)),
  ]

  return normalized.length > 0 ? normalized : undefined
}

export function buildInfiltrationCoverProfileFromAuthored(
  authored: AuthoredInfiltrationCoverProfile | undefined | null
): InfiltrationCoverProfile | undefined {
  if (authored == null) {
    return undefined
  }

  const claimedRole = normalizeCoverRole(authored.claimedRole)
  const documentTier = normalizeDocumentTier(authored.documentTier)
  const doctrineBand = normalizeDoctrineBand(authored.doctrineBand)
  const routeViolationTags = normalizeRouteViolationTags(authored.routeViolationTags)

  if (claimedRole === undefined) {
    return undefined
  }

  const profile: InfiltrationCoverProfile = { claimedRole }

  if (documentTier !== undefined) {
    profile.documentTier = documentTier
  }
  if (doctrineBand !== undefined) {
    profile.doctrineBand = doctrineBand
  }
  if (routeViolationTags !== undefined) {
    profile.routeViolationTags = routeViolationTags
  }

  return profile
}

export function buildInfiltrationCoverProfileFromAuthoredRecord(
  authored: unknown
): InfiltrationCoverProfile | undefined {
  if (!isAuthoredProfileRecord(authored)) {
    return undefined
  }

  return buildInfiltrationCoverProfileFromAuthored(authored as AuthoredInfiltrationCoverProfile)
}
