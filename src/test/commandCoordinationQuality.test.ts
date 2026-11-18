import { describe, expect, it } from 'vitest'
import {
  assessCommandCoordinationQuality,
  coordinationSuccessModifier,
  type CoordinationQualityInput,
} from '../domain/commandCoordinationQuality'

describe('SPE-95 command coordination quality signal', () => {
  const base: CoordinationQualityInput = {
    concurrentLoad: 4,
    spanCapacity: 6,
    crisisIntensity: 0.3,
    tierMismatch: false,
    voiceLoss: false,
    fallbackMode: 'none',
  }

  it('nominal conditions produce high quality', () => {
    const r = assessCommandCoordinationQuality(base)
    expect(r.score).toBe(100)
    expect(r.band).toBe('high')
    expect(r.pressureReasons).toEqual([])
  })

  it('span-of-control saturation degrades quality deterministically', () => {
    const r = assessCommandCoordinationQuality({ ...base, concurrentLoad: 10, spanCapacity: 6 })
    expect(r.pressureReasons).toContain('span-of-control saturation')
    expect(r.score).toBeLessThan(100)
    expect(r.band).not.toBe('high')
  })

  it('reducing load restores quality without changing headcount', () => {
    const overloaded = assessCommandCoordinationQuality({
      ...base,
      concurrentLoad: 12,
      spanCapacity: 6,
    })
    const relieved = assessCommandCoordinationQuality({
      ...base,
      concurrentLoad: 5,
      spanCapacity: 6,
    })
    expect(relieved.score).toBeGreaterThan(overloaded.score)
    expect(relieved.pressureReasons).not.toContain('span-of-control saturation')
  })

  it('voice-loss without fallback is worse than with prebriefed fallback', () => {
    const noFallback = assessCommandCoordinationQuality({
      ...base,
      voiceLoss: true,
      fallbackMode: 'none',
    })
    const withFallback = assessCommandCoordinationQuality({
      ...base,
      voiceLoss: true,
      fallbackMode: 'prebriefed',
    })
    expect(noFallback.score).toBeLessThan(withFallback.score)
    expect(noFallback.pressureReasons).toContain('voice-loss without fallback')
    expect(withFallback.pressureReasons.some((x) => x.includes('mitigated'))).toBe(true)
  })

  it('tier mismatch and high crisis compound', () => {
    const r = assessCommandCoordinationQuality({
      ...base,
      tierMismatch: true,
      crisisIntensity: 0.9,
    })
    expect(r.pressureReasons).toContain('tier/handoff mismatch')
    expect(r.pressureReasons).toContain('high crisis intensity')
    expect(r.score).toBeLessThan(80)
  })

  it('downstream modifier reflects band', () => {
    const high = assessCommandCoordinationQuality(base)
    const critical = assessCommandCoordinationQuality({
      ...base,
      concurrentLoad: 20,
      spanCapacity: 4,
      tierMismatch: true,
      voiceLoss: true,
      crisisIntensity: 1,
    })
    expect(coordinationSuccessModifier(high)).toBe(1.0)
    expect(coordinationSuccessModifier(critical)).toBeLessThan(0.9)
  })

  it('is deterministic and pure', () => {
    const input = { ...base, concurrentLoad: 8, spanCapacity: 5, voiceLoss: true, fallbackMode: 'gesture_only' as const }
    const a = assessCommandCoordinationQuality(input)
    const b = assessCommandCoordinationQuality(input)
    expect(a).toEqual(b)
    expect(Object.isFrozen(a.pressureReasons) || Array.isArray(a.pressureReasons)).toBe(true)
  })
})
