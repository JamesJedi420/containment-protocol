import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_BELIEF_LOCK_WISDOM_THRESHOLD,
  createEnvironmentalIllusion,
  createIllusionActor,
  enterEnvironmentalIllusion,
  forceExtractFromIllusion,
  isBeliefLocked,
  refusesContradictoryAction,
  type EnvironmentalIllusion,
  type IllusionActor,
} from '../domain/beliefLockIllusion'

describe('SPE-470 belief-lock environmental illusion states', () => {
  let setpiece: EnvironmentalIllusion
  let lowWisdom: IllusionActor
  let highWisdom: IllusionActor

  beforeEach(() => {
    setpiece = createEnvironmentalIllusion({
      id: 'ballroom-false',
      scale: 'environment_belief_lock',
      wisdomThreshold: DEFAULT_BELIEF_LOCK_WISDOM_THRESHOLD,
    })
    lowWisdom = createIllusionActor({ id: 'op-a', wisdom: 5, vulnerable: false })
    highWisdom = createIllusionActor({ id: 'op-b', wisdom: 14, vulnerable: false })
  })

  it('locks low-wisdom actors through belief, not concealment alone', () => {
    const locked = enterEnvironmentalIllusion(setpiece, lowWisdom)
    expect(isBeliefLocked(locked)).toBe(true)
    expect(refusesContradictoryAction(locked, 'leave_setpiece')).toBe(true)
    expect(refusesContradictoryAction(locked, 'attack_illusion_source')).toBe(true)
    expect(refusesContradictoryAction(locked, 'report_false_environment')).toBe(true)

    const clear = enterEnvironmentalIllusion(setpiece, highWisdom)
    expect(isBeliefLocked(clear)).toBe(false)
    expect(refusesContradictoryAction(clear, 'leave_setpiece')).toBe(false)
  })

  it('locks at the wisdom threshold and unlocks just above it', () => {
    const at = createIllusionActor({ id: 'op-t', wisdom: 8, vulnerable: false })
    const above = createIllusionActor({ id: 'op-u', wisdom: 9, vulnerable: false })
    expect(isBeliefLocked(enterEnvironmentalIllusion(setpiece, at))).toBe(true)
    expect(isBeliefLocked(enterEnvironmentalIllusion(setpiece, above))).toBe(false)
  })

  it('does not belief-lock cosmetic concealment overlays', () => {
    const cosmetic = createEnvironmentalIllusion({
      id: 'glamour',
      scale: 'cosmetic_concealment',
      wisdomThreshold: DEFAULT_BELIEF_LOCK_WISDOM_THRESHOLD,
    })
    const state = enterEnvironmentalIllusion(cosmetic, lowWisdom)
    expect(isBeliefLocked(state)).toBe(false)
    expect(refusesContradictoryAction(state, 'leave_setpiece')).toBe(false)
  })

  it('locks vulnerable actors even above the wisdom threshold', () => {
    const vulnerable = createIllusionActor({ id: 'op-v', wisdom: 16, vulnerable: true })
    const state = enterEnvironmentalIllusion(setpiece, vulnerable)
    expect(isBeliefLocked(state)).toBe(true)
    expect(state.lockedVulnerable).toBe(true)
  })

  it('produces post-removal collapse or incap from entry snapshot', () => {
    const locked = enterEnvironmentalIllusion(setpiece, lowWisdom)
    const after = forceExtractFromIllusion(locked)
    expect(after.extracted).toBe(true)
    expect(after.beliefLocked).toBe(false)
    expect(after.extractionImpairment).toBe('collapse')
    expect(isBeliefLocked(after)).toBe(false)

    const vulnerable = createIllusionActor({ id: 'op-v', wisdom: 16, vulnerable: true })
    const lockedV = enterEnvironmentalIllusion(setpiece, vulnerable)
    expect(forceExtractFromIllusion(lockedV).extractionImpairment).toBe('incap')
  })

  it('extracts unlocked actors without impairment', () => {
    const clear = enterEnvironmentalIllusion(setpiece, highWisdom)
    const after = forceExtractFromIllusion(clear)
    expect(after.extractionImpairment).toBe('none')
    expect(after.extracted).toBe(true)
  })

  it('fail-closes malformed inputs and illegal transitions', () => {
    expect(() =>
      createEnvironmentalIllusion({
        id: 'x',
        scale: 'not-a-scale' as 'cosmetic_concealment',
        wisdomThreshold: 8,
      })
    ).toThrow(/scale/)
    expect(() => createIllusionActor({ id: 'x', wisdom: 0, vulnerable: false })).toThrow(/wisdom/)
    expect(() =>
      createIllusionActor({ id: 'x', wisdom: 5, vulnerable: 'yes' as unknown as boolean })
    ).toThrow(/vulnerable/)
    expect(() =>
      createEnvironmentalIllusion({
        id: 'x',
        scale: 'environment_belief_lock',
        wisdomThreshold: 21,
      })
    ).toThrow(/wisdomThreshold/)

    const locked = enterEnvironmentalIllusion(setpiece, lowWisdom)
    expect(() => refusesContradictoryAction(locked, 'teleport' as 'leave_setpiece')).toThrow(
      /contradictory action/
    )
    const extracted = forceExtractFromIllusion(locked)
    expect(() => refusesContradictoryAction(extracted, 'leave_setpiece')).toThrow(
      /already extracted/
    )
    expect(() => forceExtractFromIllusion(extracted)).toThrow(/already extracted/)
    expect(() =>
      refusesContradictoryAction({ ...locked, owner: 'SPE-000' as 'SPE-470' }, 'leave_setpiece')
    ).toThrow(/owner mismatch/)
  })

  it('is deterministic and does not mutate inputs', () => {
    const illusion = {
      id: 'chapel',
      scale: 'environment_belief_lock' as const,
      wisdomThreshold: 8,
    }
    const actor = { id: 'op-c', wisdom: 6, vulnerable: false }
    const beforeI = structuredClone(illusion)
    const beforeA = structuredClone(actor)
    const first = enterEnvironmentalIllusion(illusion, actor)
    const second = enterEnvironmentalIllusion(illusion, actor)
    expect(first).toEqual(second)
    expect(Object.isFrozen(first)).toBe(true)
    expect(illusion).toEqual(beforeI)
    expect(actor).toEqual(beforeA)
  })
})
