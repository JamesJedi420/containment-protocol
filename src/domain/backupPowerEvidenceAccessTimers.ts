/**
 * SPE-1431 — backup-power evidence access timers (slice 1).
 *
 * Pure deterministic contract for short-horizon crisis backup-power windows.
 * Consumes caller-owned reserve time and system dependency flags. Does not
 * own facility energy, evidence custody, door control, or refrigeration state.
 *
 * Degradation bands: full | degraded | inaccessible.
 * Evidence integrity loss is reported as a boolean threshold crossing.
 */

export const BACKUP_POWER_TIMERS_OWNER = 'SPE-1431' as const

export type AccessBand = 'full' | 'degraded' | 'inaccessible'

export interface PoweredSurface {
  readonly surfaceId: string
  readonly label: string
  /** Minutes of reserve this surface consumes per unit time when powered. */
  readonly drainPerMinute: number
  /** Minutes remaining on this surface's private reserve when selective. */
  readonly selectiveReserveMinutes?: number
  /** Threshold (minutes remaining) below which access degrades. */
  readonly degradeBelowMinutes: number
  /** Threshold (minutes remaining) below which access is lost. */
  readonly failBelowMinutes: number
  /** Whether this surface loses evidence integrity when power fails. */
  readonly evidenceIntegrityLossOnFail: boolean
}

export interface BackupPowerResolutionInput {
  readonly surfaces: readonly PoweredSurface[]
  /** Shared reserve minutes available to non-selective surfaces. */
  readonly sharedReserveMinutes: number
  /** Optional ordered list of surfaceIds the operator wants to preserve longest. */
  readonly priorityOrder?: readonly string[]
  /** Elapsed minutes to advance the countdown. */
  readonly elapsedMinutes: number
}

export interface SurfaceAccessResult {
  readonly surfaceId: string
  readonly remainingMinutes: number
  readonly accessBand: AccessBand
  readonly evidenceIntegrityLost: boolean
  readonly preservedByPriority: boolean
}

export interface BackupPowerResolution {
  readonly sharedReserveRemaining: number
  readonly surfaces: readonly SurfaceAccessResult[]
}

function requireNonEmpty(value: string, label: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new Error(`backup power ${label} is required`)
  return trimmed
}

function requireNonNegative(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`backup power ${label} must be a non-negative finite number`)
  }
  return value
}

export function createPoweredSurface(input: PoweredSurface): PoweredSurface {
  const surfaceId = requireNonEmpty(input.surfaceId, 'surfaceId')
  const label = requireNonEmpty(input.label, 'label')
  const drainPerMinute = requireNonNegative(input.drainPerMinute, 'drainPerMinute')
  const degradeBelowMinutes = requireNonNegative(input.degradeBelowMinutes, 'degradeBelowMinutes')
  const failBelowMinutes = requireNonNegative(input.failBelowMinutes, 'failBelowMinutes')
  if (failBelowMinutes > degradeBelowMinutes) {
    throw new Error('backup power failBelowMinutes must not exceed degradeBelowMinutes')
  }
  const selective = input.selectiveReserveMinutes
  if (selective !== undefined) {
    requireNonNegative(selective, 'selectiveReserveMinutes')
  }

  return Object.freeze({
    surfaceId,
    label,
    drainPerMinute,
    ...(selective !== undefined ? { selectiveReserveMinutes: selective } : {}),
    degradeBelowMinutes,
    failBelowMinutes,
    evidenceIntegrityLossOnFail: input.evidenceIntegrityLossOnFail === true,
  })
}

function accessBandFor(remaining: number, surface: PoweredSurface): AccessBand {
  if (remaining <= surface.failBelowMinutes) return 'inaccessible'
  if (remaining <= surface.degradeBelowMinutes) return 'degraded'
  return 'full'
}

/**
 * Advance the shared and selective reserves by elapsedMinutes, applying
 * priority preference only as a report flag (does not reallocate drain).
 * Deterministic; same inputs always yield the same results.
 */
export function resolveBackupPowerAccess(
  input: BackupPowerResolutionInput,
): BackupPowerResolution {
  const elapsed = requireNonNegative(input.elapsedMinutes, 'elapsedMinutes')
  const sharedStart = requireNonNegative(input.sharedReserveMinutes, 'sharedReserveMinutes')
  const priority = new Set((input.priorityOrder ?? []).map((id) => id.trim()).filter(Boolean))

  let sharedRemaining = sharedStart
  const results: SurfaceAccessResult[] = []

  for (const surface of input.surfaces) {
    const created = createPoweredSurface(surface)
    let remaining: number
    if (created.selectiveReserveMinutes !== undefined) {
      remaining = Math.max(0, created.selectiveReserveMinutes - created.drainPerMinute * elapsed)
    } else {
      const drain = created.drainPerMinute * elapsed
      remaining = Math.max(0, sharedRemaining - drain)
      sharedRemaining = remaining
    }

    const band = accessBandFor(remaining, created)
    const integrityLost =
      created.evidenceIntegrityLossOnFail && band === 'inaccessible'

    results.push(
      Object.freeze({
        surfaceId: created.surfaceId,
        remainingMinutes: remaining,
        accessBand: band,
        evidenceIntegrityLost: integrityLost,
        preservedByPriority: priority.has(created.surfaceId),
      }),
    )
  }

  return Object.freeze({
    sharedReserveRemaining: sharedRemaining,
    surfaces: Object.freeze(results),
  })
}
