import { describe, expect, it } from 'vitest'
import { resolveExposureEgressClearance } from './exposureEgressDecontaminationClearance'

describe('SPE-3151 exposure egress and decontamination clearance', () => {
  it('rejects malformed input', () => {
    expect(resolveExposureEgressClearance(null)).toBeUndefined()
    expect(resolveExposureEgressClearance({ actorId: '' })).toBeUndefined()
    expect(
      resolveExposureEgressClearance({
        actorId: 'actor:1',
        physicallyExitedZone: 'yes',
        currentlyExposed: true,
        decontaminationComplete: false,
        screeningComplete: false,
        egressPermitted: true,
      })
    ).toBeUndefined()
  })

  it('blocks egress when not permitted, without mutation', () => {
    const result = resolveExposureEgressClearance({
      actorId: 'actor:exposed',
      physicallyExitedZone: false,
      currentlyExposed: true,
      decontaminationComplete: false,
      screeningComplete: false,
      egressPermitted: false,
    })
    expect(result?.disposition).toBe('egress_blocked')
    expect(result?.reasons).toContain('egress_unavailable')
    expect(result?.inventoryUnchanged).toBe(true)
  })

  it('permits physical exit but keeps actor non-cleared when decon incomplete', () => {
    const result = resolveExposureEgressClearance({
      actorId: 'actor:exposed',
      physicallyExitedZone: true,
      currentlyExposed: true,
      decontaminationComplete: false,
      screeningComplete: false,
      egressPermitted: true,
    })
    expect(result?.disposition).toBe('egress_permitted_still_exposed')
    expect(result?.reasons).toContain('still_exposed')
    expect(result?.reasons).toContain('decontamination_incomplete')
    expect(result?.physicalExitDistinct).toBe(true)
  })

  it('advances to awaiting screening after decon without inventing parallel status', () => {
    const result = resolveExposureEgressClearance({
      actorId: 'actor:exposed',
      physicallyExitedZone: true,
      currentlyExposed: false,
      decontaminationComplete: true,
      screeningComplete: false,
      egressPermitted: true,
    })
    expect(result?.disposition).toBe('decontaminated_awaiting_screening')
    expect(result?.reasons).toContain('screening_incomplete')
  })

  it('reaches cleared only when exit, decon and screening are complete', () => {
    const result = resolveExposureEgressClearance({
      actorId: 'actor:exposed',
      physicallyExitedZone: true,
      currentlyExposed: false,
      decontaminationComplete: true,
      screeningComplete: true,
      egressPermitted: true,
    })
    expect(result?.disposition).toBe('cleared')
    expect(result?.reasons).toEqual(['ok'])
  })

  it('is idempotent for repeated processing', () => {
    const input = {
      actorId: 'actor:exposed',
      physicallyExitedZone: true,
      currentlyExposed: true,
      decontaminationComplete: false,
      screeningComplete: false,
      egressPermitted: true,
    }
    const a = resolveExposureEgressClearance(input)
    const b = resolveExposureEgressClearance(input)
    expect(a).toEqual(b)
    expect(a?.disposition).toBe('egress_permitted_still_exposed')
  })

  it('keeps physical exit distinct from clearance', () => {
    const exitedOnly = resolveExposureEgressClearance({
      actorId: 'actor:exposed',
      physicallyExitedZone: true,
      currentlyExposed: true,
      decontaminationComplete: false,
      screeningComplete: false,
      egressPermitted: true,
    })
    const cleared = resolveExposureEgressClearance({
      actorId: 'actor:exposed',
      physicallyExitedZone: true,
      currentlyExposed: false,
      decontaminationComplete: true,
      screeningComplete: true,
      egressPermitted: true,
    })
    expect(exitedOnly?.disposition).not.toBe(cleared?.disposition)
    expect(exitedOnly?.disposition).toBe('egress_permitted_still_exposed')
    expect(cleared?.disposition).toBe('cleared')
  })
})
