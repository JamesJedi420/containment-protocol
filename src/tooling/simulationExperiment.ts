import { createHash } from 'node:crypto'
import { setImmediate } from 'node:timers/promises'
import { createStartingState } from '../data/startingState'
// This existing helper creates fresh state; it does not import gameStore or persistence.
import { createRunFromCurrentConfig } from '../app/store/runTransfer'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { buildCurrentSimulationPressureSummary } from '../domain/sim/validation'
import { ExperimentError, type ExperimentRequest } from './simulationExperimentRequest'

export interface SeedEvidence {
  requestedSeed: number
  executedSeed: number
  weeksExecuted: number
  finalWeek: number
  gameOver: boolean
  rngState: number
  pressure: ReturnType<typeof buildCurrentSimulationPressureSummary>
  stateFingerprint: string
  replayFingerprint: string
  replay: 'matched' | 'unavailable'
}

export interface ExperimentControls {
  signal?: AbortSignal
  startedAt: number
  now?: () => number
  onInitialized?: (seed: number) => void
}

/** No state escapes this call: only existing numeric observations and a state digest. */
export async function executeExperimentSeed(
  request: ExperimentRequest,
  seed: number,
  controls: ExperimentControls
): Promise<SeedEvidence> {
  const now = controls.now ?? (() => performance.now())
  function checkBudget() {
    if (controls.signal?.aborted) throw new ExperimentError('cancelled', 'Experiment cancelled.')
    if (now() - controls.startedAt >= request.budgetMs) {
      throw new ExperimentError('budget_exhausted', 'Experiment time budget exhausted.')
    }
  }

  async function execute() {
    checkBudget()
    let state = createRunFromCurrentConfig(createStartingState().config, seed)
    if (state.rngSeed !== seed || state.rngState !== seed) {
      throw new ExperimentError(
        'invariant_failure',
        'Canonical initializer did not apply the requested seed.'
      )
    }
    controls.onInitialized?.(state.rngSeed)
    let weeksExecuted = 0
    while (weeksExecuted < request.weeks && !state.gameOver) {
      checkBudget()
      const previousWeek = state.week
      // Existing timestamp override removes wall-clock note identity from the proof.
      state = advanceWeek(state, 1_800_000_000 + weeksExecuted)
      if (state.week !== previousWeek + 1 || state.rngSeed !== seed) {
        throw new ExperimentError('invariant_failure', 'Canonical week or seed invariant failed.')
      }
      weeksExecuted += 1
      await setImmediate(undefined, { signal: controls.signal }).catch(() => {
        throw new ExperimentError('cancelled', 'Experiment cancelled.')
      })
    }
    checkBudget()
    const evidence = {
      requestedSeed: seed,
      executedSeed: state.rngSeed,
      weeksExecuted,
      finalWeek: state.week,
      gameOver: state.gameOver,
      rngState: state.rngState,
      pressure: buildCurrentSimulationPressureSummary(state),
      stateFingerprint: createHash('sha256').update(JSON.stringify(state)).digest('hex'),
    }
    checkBudget()
    return evidence
  }

  try {
    const first = await execute()
    const repeat = await execute()
    return {
      ...first,
      replayFingerprint: repeat.stateFingerprint,
      replay: first.stateFingerprint === repeat.stateFingerprint ? 'matched' : 'unavailable',
    }
  } catch (error) {
    if (error instanceof ExperimentError) throw error
    // Domain errors are deterministic failures, never transient retry candidates.
    // Do not forward exception strings containing authored content to the cloud.
    throw new ExperimentError('invariant_failure', 'Canonical simulation execution failed.')
  }
}
