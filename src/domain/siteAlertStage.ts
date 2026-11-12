/**
 * SPE-3008 — one canonical full-mobilization / full-site-alert stage.
 *
 * `readFullSiteAlertStage` returns `full_site_alert` only for that exact id.
 * Any other input returns null. This module does not receive a zone-spanning
 * record, and it does not persist GameState or register week-close.
 */

export const FULL_SITE_ALERT_STAGE = 'full_site_alert' as const
export type FullSiteAlertStage = typeof FULL_SITE_ALERT_STAGE

/**
 * Qualify the canonical full-site-alert stage.
 * A missing or non-matching value returns null.
 */
export function readFullSiteAlertStage(value: unknown): FullSiteAlertStage | null {
  return value === FULL_SITE_ALERT_STAGE ? FULL_SITE_ALERT_STAGE : null
}
