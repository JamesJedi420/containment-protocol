import { describe, expect, it } from 'vitest'
import { createSeededRng } from '../../domain/math'
import {
  buildRecruitmentGenerationState,
  generateCandidates,
} from '../../domain/sim/candidateGenerator'
import { buildRecruitmentState } from './fixtures'

describe('recruitment determinism', () => {
  it('generates the same candidate pool for the same seed and state', () => {
    const stateA = buildRecruitmentState()
    const stateB = buildRecruitmentState()

    stateA.week = 5
    stateA.rngSeed = 20260326
    stateA.rngState = 20260326
    stateB.week = 5
    stateB.rngSeed = 20260326
    stateB.rngState = 20260326

    const generatedA = generateCandidates(
      buildRecruitmentGenerationState(stateA),
      createSeededRng(stateA.rngState).next
    )
    const generatedB = generateCandidates(
      buildRecruitmentGenerationState(stateB),
      createSeededRng(stateB.rngState).next
    )

    expect(generatedA).toEqual(generatedB)
  })
})
