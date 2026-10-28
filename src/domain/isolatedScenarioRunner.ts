/**
 * SPE-3459 — configurable isolated scenario runner under SPE-77.
 *
 * Launches validated SPE-3397 scenario definitions into an isolated run
 * packet that never commits outcomes into ordinary campaign progression.
 * Does not broaden SPE-3091 Event Sandbox or Academy SPE-3286.
 */

import {
  resolveScenarioInitialization,
  type ResolvedScenarioInitialization,
  type ScenarioDefinitionBinding,
  type ScenarioDiagnostic,
} from './scenarioDefinitionResolver'

export const ISOLATED_SCENARIO_RUNNER_OWNER = 'SPE-3459' as const
export const ISOLATED_SCENARIO_RUN_SCHEMA_VERSION = 'spe-3459.v1' as const
export const ISOLATED_SCENARIO_MODE_ID = 'cp_isolated_scenario' as const

export const ISOLATED_RUN_PHASES = [
  'active',
  'finished',
  'aborted',
] as const
export type IsolatedRunPhase = (typeof ISOLATED_RUN_PHASES)[number]

export type IsolatedScenarioSourceChannel =
  | 'authored_preset'
  | 'custom_definition'
  /** SPE-561-shaped generator output still uses SPE-3397 custom contract. */
  | 'generator_backed'

export interface IsolatedScenarioProvenance {
  readonly modeId: typeof ISOLATED_SCENARIO_MODE_ID
  readonly ownerIssueId: typeof ISOLATED_SCENARIO_RUNNER_OWNER
  /** Explicit non-campaign isolation flag — must remain true for all phases. */
  readonly isolatesFromCampaign: true
  readonly sourceChannel: IsolatedScenarioSourceChannel
  /** SPE-3091 remains a distinct event-sandbox mode; never set here. */
  readonly eventSandboxMode: false
  readonly academyTrainingMode: false
}

export interface IsolatedScenarioRunState {
  readonly version: typeof ISOLATED_SCENARIO_RUN_SCHEMA_VERSION
  readonly runId: string
  readonly phase: IsolatedRunPhase
  readonly binding: ScenarioDefinitionBinding
  readonly runSeed: number
  readonly resolved: ResolvedScenarioInitialization
  readonly provenance: IsolatedScenarioProvenance
  /** Terminal outcome notes stay isolated — never campaign ledger writes. */
  readonly terminalReason?: string
}

export type IsolatedScenarioLaunchResult =
  | { readonly ok: true; readonly run: IsolatedScenarioRunState }
  | { readonly ok: false; readonly diagnostics: readonly ScenarioDiagnostic[]; readonly reason: string }

export type IsolatedScenarioCommandResult =
  | { readonly ok: true; readonly run: IsolatedScenarioRunState }
  | { readonly ok: false; readonly reason: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

function sourceChannelFor(binding: ScenarioDefinitionBinding): IsolatedScenarioSourceChannel {
  if (binding.sourceKind === 'preset') return 'authored_preset'
  return 'custom_definition'
}

function buildProvenance(
  sourceChannel: IsolatedScenarioSourceChannel
): IsolatedScenarioProvenance {
  return Object.freeze({
    modeId: ISOLATED_SCENARIO_MODE_ID,
    ownerIssueId: ISOLATED_SCENARIO_RUNNER_OWNER,
    isolatesFromCampaign: true as const,
    sourceChannel,
    eventSandboxMode: false as const,
    academyTrainingMode: false as const,
  })
}

function makeRunId(binding: ScenarioDefinitionBinding, runSeed: number): string {
  return `iso:${binding.definitionId}:v${binding.definitionVersion}:s${runSeed}`
}

/** Launch a validated SPE-3397 scenario as an isolated run (no campaign commit). */
export function launchIsolatedScenario(input: {
  readonly binding: ScenarioDefinitionBinding
  readonly runSeed: number
  readonly sourceChannel?: IsolatedScenarioSourceChannel
}): IsolatedScenarioLaunchResult {
  const resolved = resolveScenarioInitialization({
    binding: input.binding,
    runSeed: input.runSeed,
  })
  if (!resolved.ok) {
    return {
      ok: false,
      diagnostics: resolved.diagnostics,
      reason: resolved.diagnostics[0]?.message ?? 'scenario resolution failed',
    }
  }

  const sourceChannel = input.sourceChannel ?? sourceChannelFor(input.binding)
  const run: IsolatedScenarioRunState = Object.freeze({
    version: ISOLATED_SCENARIO_RUN_SCHEMA_VERSION,
    runId: makeRunId(input.binding, input.runSeed),
    phase: 'active',
    binding: input.binding,
    runSeed: input.runSeed,
    resolved: resolved.configuration,
    provenance: buildProvenance(sourceChannel),
  })
  return { ok: true, run }
}

export function finishIsolatedScenario(
  run: IsolatedScenarioRunState,
  terminalReason = 'finished'
): IsolatedScenarioCommandResult {
  if (run.phase === 'finished') {
    return { ok: true, run }
  }
  if (run.phase === 'aborted') {
    return { ok: false, reason: 'run already aborted' }
  }
  return {
    ok: true,
    run: Object.freeze({
      ...run,
      phase: 'finished' as const,
      terminalReason,
    }),
  }
}

export function abortIsolatedScenario(
  run: IsolatedScenarioRunState,
  terminalReason = 'aborted'
): IsolatedScenarioCommandResult {
  if (run.phase === 'aborted') {
    return { ok: true, run }
  }
  if (run.phase === 'finished') {
    return { ok: false, reason: 'run already finished' }
  }
  return {
    ok: true,
    run: Object.freeze({
      ...run,
      phase: 'aborted' as const,
      terminalReason,
    }),
  }
}

/**
 * Restore from persisted packet. Re-resolves against the bound definition/version
 * and fails visibly on mismatch — never silently upgrades to a newer live preset.
 */
export function restoreIsolatedScenario(
  raw: unknown
): IsolatedScenarioCommandResult {
  const sanitized = sanitizeIsolatedScenarioRun(raw)
  if (sanitized == null) {
    return { ok: false, reason: 'malformed isolated scenario run' }
  }
  const resolved = resolveScenarioInitialization({
    binding: sanitized.binding,
    runSeed: sanitized.runSeed,
  })
  if (!resolved.ok) {
    return {
      ok: false,
      reason: `restore failed: ${resolved.diagnostics[0]?.message ?? 'resolution error'}`,
    }
  }
  if (
    resolved.configuration.definitionId !== sanitized.resolved.definitionId ||
    resolved.configuration.definitionVersion !== sanitized.resolved.definitionVersion
  ) {
    return { ok: false, reason: 'restore failed: resolved definition identity mismatch' }
  }
  return {
    ok: true,
    run: Object.freeze({
      ...sanitized,
      resolved: resolved.configuration,
    }),
  }
}

/** Isolated runs never write campaign progression/economy/unlocks/history. */
export function isolatedRunCommitsToCampaign(
  run: IsolatedScenarioRunState
): false {
  void run
  return false
}

export function sanitizeIsolatedScenarioRun(
  raw: unknown
): IsolatedScenarioRunState | undefined {
  if (!isRecord(raw)) return undefined
  if (raw.version !== ISOLATED_SCENARIO_RUN_SCHEMA_VERSION) return undefined
  if (typeof raw.runId !== 'string' || raw.runId.trim().length === 0) return undefined
  if (typeof raw.runSeed !== 'number' || !Number.isFinite(raw.runSeed)) return undefined
  if (
    raw.phase !== 'active' &&
    raw.phase !== 'finished' &&
    raw.phase !== 'aborted'
  ) {
    return undefined
  }
  if (!isRecord(raw.binding) || !isRecord(raw.provenance) || !isRecord(raw.resolved)) {
    return undefined
  }
  if (raw.provenance.modeId !== ISOLATED_SCENARIO_MODE_ID) return undefined
  if (raw.provenance.isolatesFromCampaign !== true) return undefined
  if (raw.provenance.eventSandboxMode !== false) return undefined
  if (raw.provenance.academyTrainingMode !== false) return undefined

  const binding: ScenarioDefinitionBinding = {
    definitionId: String(raw.binding.definitionId ?? ''),
    definitionVersion: String(raw.binding.definitionVersion ?? ''),
    sourceKind: raw.binding.sourceKind === 'custom' ? 'custom' : 'preset',
    ...(Array.isArray(raw.binding.components)
      ? { components: raw.binding.components as ScenarioDefinitionBinding['components'] }
      : {}),
  }
  if (binding.definitionId.length === 0 || binding.definitionVersion.length === 0) {
    return undefined
  }

  const sourceChannel =
    raw.provenance.sourceChannel === 'generator_backed'
      ? 'generator_backed'
      : raw.provenance.sourceChannel === 'custom_definition'
        ? 'custom_definition'
        : 'authored_preset'

  const resolvedCheck = resolveScenarioInitialization({
    binding,
    runSeed: raw.runSeed,
  })
  // Active/finished/aborted packets may retain a historically bound version that
  // no longer resolves against live presets — keep structural packet only when
  // resolution still succeeds; otherwise fail closed (undefined).
  if (!resolvedCheck.ok) return undefined

  return Object.freeze({
    version: ISOLATED_SCENARIO_RUN_SCHEMA_VERSION,
    runId: raw.runId.trim(),
    phase: raw.phase,
    binding,
    runSeed: raw.runSeed,
    resolved: resolvedCheck.configuration,
    provenance: buildProvenance(sourceChannel),
    ...(typeof raw.terminalReason === 'string'
      ? { terminalReason: raw.terminalReason }
      : {}),
  })
}
