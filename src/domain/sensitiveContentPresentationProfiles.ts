/**
 * SPE-3742: Bounded sensitive-content presentation profiles.
 * Projects the same authoritative bodily/incident state through different
 * presentation treatments without mutating simulation truth or operational meaning.
 */

export type SensitiveContentProfile = 'explicit' | 'clinical' | 'symbolic'

export interface CanonicalBodilyState {
  readonly id: string
  readonly injurySeverity: 'minor' | 'moderate' | 'critical'
  readonly transformationCue: string
  readonly warningRequired: boolean
}

export interface PresentationCue {
  readonly profile: SensitiveContentProfile
  readonly operationalFact: string
  readonly warningText: string | null
  readonly mechanicalSeverity: CanonicalBodilyState['injurySeverity']
}

const PROFILE_MAP: Record<SensitiveContentProfile, (state: CanonicalBodilyState) => Omit<PresentationCue, 'profile'>> = {
  explicit: (state) => ({
    operationalFact: state.transformationCue,
    warningText: state.warningRequired ? `CRITICAL: ${state.transformationCue}` : null,
    mechanicalSeverity: state.injurySeverity,
  }),
  clinical: (state) => ({
    operationalFact: `Clinical observation: ${state.transformationCue} (severity ${state.injurySeverity})`,
    warningText: state.warningRequired ? `Mandatory clinical alert: severity ${state.injurySeverity}` : null,
    mechanicalSeverity: state.injurySeverity,
  }),
  symbolic: (state) => ({
    operationalFact: `Symbolic cue for ${state.injurySeverity} injury: operational fact preserved`,
    warningText: state.warningRequired ? `Alert: actionable hazard present (${state.injurySeverity})` : null,
    mechanicalSeverity: state.injurySeverity,
  }),
}

export function projectSensitiveContentPresentation(
  state: CanonicalBodilyState,
  profile: SensitiveContentProfile | unknown
): PresentationCue {
  const safeProfile: SensitiveContentProfile =
    profile === 'explicit' || profile === 'clinical' || profile === 'symbolic' ? profile : 'clinical'
  const projected = PROFILE_MAP[safeProfile](state)
  return { profile: safeProfile, ...projected }
}

export function profilesPreserveMechanicalEquivalence(
  state: CanonicalBodilyState
): boolean {
  const profiles: SensitiveContentProfile[] = ['explicit', 'clinical', 'symbolic']
  const results = profiles.map((p) => projectSensitiveContentPresentation(state, p))
  const severity = results[0].mechanicalSeverity
  return results.every((r) => r.mechanicalSeverity === severity)
}
