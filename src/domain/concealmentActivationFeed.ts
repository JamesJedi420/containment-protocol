import type { ConcealmentActivationMode } from './hiddenStateActivation'

/**
 * Player-facing one-line summary for concealment activation events.
 * `reason` values come from `resolveConcealmentActivation`.
 */
export function formatConcealmentActivationSummary(
  mode: ConcealmentActivationMode,
  reason: string
): string {
  if (reason.startsWith('authored-trigger:')) {
    const triggerId = reason.slice('authored-trigger:'.length)
    return mode === 'displaced'
      ? `Displaced cover activated (${triggerId}).`
      : `Hidden presence activated (${triggerId}).`
  }

  if (reason.startsWith('global-flag:conceal.displace.')) {
    return 'Displaced cover activated from weekly displacement flag.'
  }

  if (reason.startsWith('global-flag:conceal.case.')) {
    return 'Hidden presence activated from weekly covert posture flag.'
  }

  if (reason.startsWith('global-flag-prefix:')) {
    return 'Hidden presence activated from shared conceal directive.'
  }

  if (reason === 'case-tag') {
    return 'Hidden presence activated from concealment-tagged operation.'
  }

  if (reason === 'recon-hidden-modifiers') {
    return 'Hidden presence activated from recon modifier threshold.'
  }

  return mode === 'displaced'
    ? `Displaced cover activated (${reason}).`
    : `Hidden presence activated (${reason}).`
}

/**
 * Future-tense prep preview — same reason codes as `formatConcealmentActivationSummary`.
 */
export function formatConcealmentActivationPreviewNote(
  mode: ConcealmentActivationMode,
  reason: string
): string {
  if (reason.startsWith('authored-trigger:')) {
    const triggerId = reason.slice('authored-trigger:'.length)
    return mode === 'displaced'
      ? `Next weekly tick will apply displaced cover (${triggerId}).`
      : `Next weekly tick will apply hidden presence (${triggerId}).`
  }

  if (reason.startsWith('global-flag:conceal.displace.')) {
    return 'Next weekly tick will apply displaced cover from the displacement flag.'
  }

  if (reason.startsWith('global-flag:conceal.case.')) {
    return 'Next weekly tick will apply hidden presence from the covert posture flag.'
  }

  if (reason.startsWith('global-flag-prefix:')) {
    return 'Next weekly tick will apply hidden presence from a shared conceal directive.'
  }

  if (reason === 'case-tag') {
    return 'Next weekly tick will apply hidden presence from concealment activation tags.'
  }

  if (reason === 'recon-hidden-modifiers') {
    return 'Next weekly tick will apply hidden presence when recon hidden-modifier threshold is met.'
  }

  return mode === 'displaced'
    ? `Next weekly tick will apply displaced cover (${reason}).`
    : `Next weekly tick will apply hidden presence (${reason}).`
}
