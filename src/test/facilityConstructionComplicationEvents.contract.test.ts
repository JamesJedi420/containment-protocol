import { describe, expect, it } from 'vitest'
import {
  ANNEX_BUILD_PROJECT_ID,
  authoredAnnexBuildComplicationFixture,
  evaluateConstructionComplicationTrigger,
  projectConstructionComplicationImpact,
  selectConstructionComplication,
} from '../domain/facilityConstructionComplicationEvents'

describe('SPE-1562 facility construction complication events', () => {
  it('triggers a deterministic complication before project completion', () => {
    const fixture = authoredAnnexBuildComplicationFixture()
    expect(fixture.trigger.projectId).toBe(ANNEX_BUILD_PROJECT_ID)
    expect(fixture.trigger.triggerReady).toBe(true)
    expect(fixture.selection.selected).toBe(true)
    expect(fixture.impact.impactApplied).toBe(true)

    expect(
      evaluateConstructionComplicationTrigger({
        projectId: ANNEX_BUILD_PROJECT_ID,
        projectType: 'annex',
        timelineStage: 'foundation',
        siteCondition: 'contaminated',
        staffingBand: 'adequate',
        completed: true,
        weeksElapsed: 2,
      })?.refusalReason
    ).toBe('already_completed')
  })

  it('reveals new site information or hazard rather than only adding delay', () => {
    const fixture = authoredAnnexBuildComplicationFixture()
    expect(fixture.selection.eventType).toBe('revelation')
    expect(fixture.selection.complicationKind).toBe('buried_anomaly_exposure')
    expect(fixture.impact.revealsSiteInformationOrHazard).toBe(true)

    const delayOnly = selectConstructionComplication({
      projectId: ANNEX_BUILD_PROJECT_ID,
      triggerReady: true,
      complicationKind: 'labor_dispute',
      projectType: 'annex',
      siteCondition: 'contested',
    })
    expect(delayOnly?.eventType).toBe('delay')
    expect(
      projectConstructionComplicationImpact({
        projectId: ANNEX_BUILD_PROJECT_ID,
        complicationKind: 'labor_dispute',
        eventType: 'delay',
        selected: true,
      })?.revealsSiteInformationOrHazard
    ).toBe(false)
  })

  it('changes cost, schedule, or legitimacy in a bounded way', () => {
    const fixture = authoredAnnexBuildComplicationFixture()
    expect(fixture.impact.scheduleDeltaWeeks).toBeGreaterThan(0)
    expect(fixture.impact.costDeltaBand).toBe('moderate')
    expect(fixture.impact.legitimacyDelta).toBe('reduced')

    const sabotage = projectConstructionComplicationImpact({
      projectId: ANNEX_BUILD_PROJECT_ID,
      complicationKind: 'sabotage',
      eventType: 'delay',
      selected: true,
    })
    expect(sabotage).toMatchObject({
      scheduleDeltaWeeks: 2,
      costDeltaBand: 'severe',
      legitimacyDelta: 'compromised',
      impactApplied: true,
    })
  })

  it('fails closed on malformed trigger packets and stable builds', () => {
    expect(evaluateConstructionComplicationTrigger(null)).toBeUndefined()
    expect(
      evaluateConstructionComplicationTrigger({
        projectId: ANNEX_BUILD_PROJECT_ID,
        projectType: 'annex',
        timelineStage: 'shell',
        siteCondition: 'cleared',
        staffingBand: 'adequate',
        completed: false,
        weeksElapsed: 3,
      })
    ).toMatchObject({
      triggerReady: false,
      refusalReason: 'stable_site_and_staffing',
    })
  })
})
