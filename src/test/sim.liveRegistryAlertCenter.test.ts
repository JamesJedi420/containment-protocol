import { describe, expect, it } from 'vitest'
import {
  deriveAppearanceAlert,
  deriveDisappearanceAlert,
  deduplicateAlerts,
  suppressAlerts,
  escalateAlert,
  alertToWorkItem,
  buildAlertWorklist,
  buildEntryIndex,
} from '../domain/liveRegistryAlertCenter'
import { createLiveRegistryEntry, updateLiveRegistryEntry } from '../domain/liveRegistry'
import type { LiveRegistryEntry, LiveRegistryAlert } from '../domain/liveRegistry'

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

function makeEntry(overrides: Partial<Parameters<typeof createLiveRegistryEntry>[0]> & { id: string }): LiveRegistryEntry {
  return createLiveRegistryEntry({
    entityId: overrides.id,
    entityClass: 'anomaly',
    label: `Label-${overrides.id}`,
    operationalState: 'active',
    truthState: 'confirmed',
    confidence: 0.8,
    week: 10,
    ...overrides,
  })
}

const ACTIVE_ANOMALY = makeEntry({
  id: 'reg-anom-active',
  entityClass: 'anomaly',
  operationalState: 'active',
  truthState: 'confirmed',
  confidence: 0.85,
})

const LOOSE_ANOMALY = makeEntry({
  id: 'reg-anom-loose',
  entityClass: 'anomaly',
  operationalState: 'loose',
  truthState: 'confirmed',
  confidence: 0.9,
  locationTag: 'sector-7',
})

const COMPROMISED_STAFF = makeEntry({
  id: 'reg-staff-compromised',
  entityClass: 'staff',
  operationalState: 'compromised',
  truthState: 'confirmed',
  confidence: 1.0,
})

const INFERRED_SIGNATURE = makeEntry({
  id: 'reg-sig-inferred',
  entityClass: 'signature',
  operationalState: 'active',
  truthState: 'inferred',
  confidence: 0.35,
})

const FALSE_POSITIVE_ENTRY = makeEntry({
  id: 'reg-fp-1',
  entityClass: 'anomaly',
  operationalState: 'active',
  truthState: 'false_positive',
  confidence: 0.1,
})

const MISSING_ANOMALY = makeEntry({
  id: 'reg-anom-missing',
  entityClass: 'anomaly',
  operationalState: 'active',
  truthState: 'missing',
  confidence: 0.0,
})

const CONTAINED_CONFIRMED_ANOMALY = makeEntry({
  id: 'reg-anom-contained',
  entityClass: 'anomaly',
  operationalState: 'contained',
  truthState: 'confirmed',
  confidence: 0.99,
})

const EXTERNAL_SUSPECTED = makeEntry({
  id: 'reg-ext-suspected',
  entityClass: 'external',
  operationalState: 'active',
  truthState: 'suspected',
  confidence: 0.65,
})

// ---------------------------------------------------------------------------
// AC 3 coverage: multiple tracked state transitions on one entry
// ---------------------------------------------------------------------------

describe('multiple tracked state transitions', () => {
  it('records sequential state transitions on the same entry', () => {
    // Start: active / confirmed
    const initial = makeEntry({ id: 'reg-tracked', operationalState: 'active', truthState: 'confirmed' })
    expect(initial.transitionLog).toHaveLength(0)

    // Transition 1: active → loose
    const afterLoose = updateLiveRegistryEntry(initial, {
      operationalState: 'loose',
      week: 11,
      reasonCode: 'escaped-perimeter',
    })
    expect(afterLoose.transitionLog).toHaveLength(1)
    expect(afterLoose.transitionLog[0].toOperationalState).toBe('loose')

    // Transition 2: loose → contained
    const afterContained = updateLiveRegistryEntry(afterLoose, {
      operationalState: 'contained',
      week: 13,
      reasonCode: 'recaptured',
    })
    expect(afterContained.transitionLog).toHaveLength(2)
    expect(afterContained.transitionLog[1].fromOperationalState).toBe('loose')
    expect(afterContained.transitionLog[1].toOperationalState).toBe('contained')

    // Transition 3: truth state inferred → confirmed
    const afterConfirmed = updateLiveRegistryEntry(
      makeEntry({ id: 'reg-tracked-2', operationalState: 'active', truthState: 'inferred' }),
      { truthState: 'confirmed', week: 15, reasonCode: 'positive-id' }
    )
    expect(afterConfirmed.transitionLog).toHaveLength(1)
    expect(afterConfirmed.transitionLog[0].fromTruthState).toBe('inferred')
    expect(afterConfirmed.transitionLog[0].toTruthState).toBe('confirmed')
  })
})

// ---------------------------------------------------------------------------
// deriveAppearanceAlert
// ---------------------------------------------------------------------------

describe('deriveAppearanceAlert', () => {
  it('fires an appearance alert for a new active anomaly', () => {
    const alert = deriveAppearanceAlert(ACTIVE_ANOMALY, 10)
    expect(alert).not.toBeNull()
    expect(alert!.type).toBe('appearance')
    expect(alert!.entryId).toBe(ACTIVE_ANOMALY.id)
    expect(alert!.week).toBe(10)
    expect(alert!.reasonCode).toBe('new-registry-entry')
  })

  it('fires critical severity for a loose anomaly appearance', () => {
    const alert = deriveAppearanceAlert(LOOSE_ANOMALY, 10)
    expect(alert).not.toBeNull()
    expect(alert!.severity).toBe('critical')
  })

  it('fires warning severity for a non-loose anomaly appearance', () => {
    const alert = deriveAppearanceAlert(ACTIVE_ANOMALY, 10)
    expect(alert!.severity).toBe('warning')
  })

  it('fires info severity for an external actor appearance', () => {
    const alert = deriveAppearanceAlert(EXTERNAL_SUSPECTED, 10)
    expect(alert).not.toBeNull()
    expect(alert!.severity).toBe('info')
  })

  it('returns null for a false_positive entry — no actionable appearance', () => {
    const alert = deriveAppearanceAlert(FALSE_POSITIVE_ENTRY, 10)
    expect(alert).toBeNull()
  })

  it('fires for a signature/inferred entry', () => {
    const alert = deriveAppearanceAlert(INFERRED_SIGNATURE, 10)
    expect(alert).not.toBeNull()
    expect(alert!.type).toBe('appearance')
  })

  it('is deterministic', () => {
    const a = deriveAppearanceAlert(ACTIVE_ANOMALY, 10)
    const b = deriveAppearanceAlert(ACTIVE_ANOMALY, 10)
    expect(a).toEqual(b)
  })
})

// ---------------------------------------------------------------------------
// deriveDisappearanceAlert
// ---------------------------------------------------------------------------

describe('deriveDisappearanceAlert', () => {
  it('fires a disappearance alert for a missing-state entry', () => {
    const alert = deriveDisappearanceAlert(MISSING_ANOMALY, 10)
    expect(alert).not.toBeNull()
    expect(alert!.type).toBe('disappearance')
    expect(alert!.entryId).toBe(MISSING_ANOMALY.id)
    expect(alert!.severity).toBe('high') // anomaly class → high
  })

  it('returns null when entry truth state is not missing', () => {
    const alert = deriveDisappearanceAlert(ACTIVE_ANOMALY, 10)
    expect(alert).toBeNull()
  })

  it('fires warning severity for non-anomaly missing entry', () => {
    const missingStaff = makeEntry({
      id: 'staff-missing',
      entityClass: 'staff',
      operationalState: 'active',
      truthState: 'missing',
      confidence: 0,
    })
    const alert = deriveDisappearanceAlert(missingStaff, 10)
    expect(alert).not.toBeNull()
    expect(alert!.severity).toBe('warning')
  })

  it('is deterministic', () => {
    const a = deriveDisappearanceAlert(MISSING_ANOMALY, 10)
    const b = deriveDisappearanceAlert(MISSING_ANOMALY, 10)
    expect(a).toEqual(b)
  })
})

// ---------------------------------------------------------------------------
// deduplicateAlerts
// ---------------------------------------------------------------------------

describe('deduplicateAlerts', () => {
  it('collapses duplicate alerts with same entryId + type + week', () => {
    const alertA: LiveRegistryAlert = {
      entryId: 'entry-1',
      type: 'appearance',
      severity: 'warning',
      week: 10,
      summary: 'first',
      reasonCode: 'new-registry-entry',
    }
    const alertB: LiveRegistryAlert = { ...alertA, summary: 'duplicate' }
    const result = deduplicateAlerts([alertA, alertB])
    expect(result.size).toBe(1)
    const record = result.get('entry-1|appearance|10')!
    expect(record.suppressionCount).toBe(1)
    expect(record.alert.summary).toBe('first') // first one survives
  })

  it('preserves distinct alerts (different type)', () => {
    const a1: LiveRegistryAlert = { entryId: 'e1', type: 'appearance', severity: 'warning', week: 10, summary: '', reasonCode: 'r' }
    const a2: LiveRegistryAlert = { entryId: 'e1', type: 'escape', severity: 'critical', week: 10, summary: '', reasonCode: 'r' }
    const result = deduplicateAlerts([a1, a2])
    expect(result.size).toBe(2)
  })

  it('preserves distinct alerts (different week)', () => {
    const a1: LiveRegistryAlert = { entryId: 'e1', type: 'appearance', severity: 'warning', week: 10, summary: '', reasonCode: 'r' }
    const a2: LiveRegistryAlert = { ...a1, week: 11 }
    const result = deduplicateAlerts([a1, a2])
    expect(result.size).toBe(2)
  })

  it('is deterministic', () => {
    const alerts: LiveRegistryAlert[] = [
      { entryId: 'e1', type: 'escape', severity: 'critical', week: 10, summary: '', reasonCode: 'r' },
    ]
    const a = deduplicateAlerts(alerts)
    const b = deduplicateAlerts(alerts)
    expect([...a.entries()]).toEqual([...b.entries()])
  })
})

// ---------------------------------------------------------------------------
// suppressAlerts
// ---------------------------------------------------------------------------

describe('suppressAlerts', () => {
  it('suppresses appearance alert for false_positive entry', () => {
    const alert: LiveRegistryAlert = {
      entryId: FALSE_POSITIVE_ENTRY.id,
      type: 'appearance',
      severity: 'warning',
      week: 10,
      summary: '',
      reasonCode: 'new-registry-entry',
    }
    const deduped = deduplicateAlerts([alert])
    const index = buildEntryIndex([FALSE_POSITIVE_ENTRY])
    const surviving = suppressAlerts(deduped, index)
    expect(surviving).toHaveLength(0)
  })

  it('suppresses confidence_drop alert for contained+confirmed entry', () => {
    const alert: LiveRegistryAlert = {
      entryId: CONTAINED_CONFIRMED_ANOMALY.id,
      type: 'confidence_drop',
      severity: 'warning',
      week: 10,
      summary: '',
      reasonCode: 'confidence-drop-threshold',
    }
    const deduped = deduplicateAlerts([alert])
    const index = buildEntryIndex([CONTAINED_CONFIRMED_ANOMALY])
    const surviving = suppressAlerts(deduped, index)
    expect(surviving).toHaveLength(0)
  })

  it('allows escape alert for loose entry through', () => {
    const alert: LiveRegistryAlert = {
      entryId: LOOSE_ANOMALY.id,
      type: 'escape',
      severity: 'critical',
      week: 10,
      summary: '',
      reasonCode: 'contained-to-loose',
    }
    const deduped = deduplicateAlerts([alert])
    const index = buildEntryIndex([LOOSE_ANOMALY])
    const surviving = suppressAlerts(deduped, index)
    expect(surviving).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// escalateAlert
// ---------------------------------------------------------------------------

describe('escalateAlert', () => {
  it('promotes severity to critical for loose entry', () => {
    const alert: LiveRegistryAlert = {
      entryId: LOOSE_ANOMALY.id,
      type: 'appearance',
      severity: 'warning',
      week: 10,
      summary: '',
      reasonCode: 'new-registry-entry',
    }
    const { alert: escalated, escalated: flag } = escalateAlert(alert, LOOSE_ANOMALY)
    expect(escalated.severity).toBe('critical')
    expect(escalated.reasonCode).toContain('escalated')
    expect(flag).toBe(true)
  })

  it('promotes severity to critical for compromised staff', () => {
    const alert: LiveRegistryAlert = {
      entryId: COMPROMISED_STAFF.id,
      type: 'compromise',
      severity: 'high',
      week: 10,
      summary: '',
      reasonCode: 'state-compromised',
    }
    const { alert: escalated, escalated: flag } = escalateAlert(alert, COMPROMISED_STAFF)
    expect(escalated.severity).toBe('critical')
    expect(flag).toBe(true)
  })

  it('does not escalate for active (non-loose, non-compromised) entry', () => {
    const alert: LiveRegistryAlert = {
      entryId: ACTIVE_ANOMALY.id,
      type: 'appearance',
      severity: 'warning',
      week: 10,
      summary: '',
      reasonCode: 'new-registry-entry',
    }
    const { alert: result, escalated: flag } = escalateAlert(alert, ACTIVE_ANOMALY)
    expect(result.severity).toBe('warning')
    expect(flag).toBe(false)
  })

  it('does not re-tag already-critical alerts', () => {
    const alert: LiveRegistryAlert = {
      entryId: LOOSE_ANOMALY.id,
      type: 'escape',
      severity: 'critical',
      week: 10,
      summary: '',
      reasonCode: 'contained-to-loose',
    }
    const { alert: result } = escalateAlert(alert, LOOSE_ANOMALY)
    expect(result).toBe(alert) // same object reference — no mutation
  })

  it('returns unchanged when entry is undefined', () => {
    const alert: LiveRegistryAlert = {
      entryId: 'unknown',
      type: 'appearance',
      severity: 'warning',
      week: 10,
      summary: '',
      reasonCode: 'new-registry-entry',
    }
    const { alert: result, escalated: flag } = escalateAlert(alert, undefined)
    expect(result).toBe(alert)
    expect(flag).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// alertToWorkItem
// ---------------------------------------------------------------------------

describe('alertToWorkItem', () => {
  it('maps appearance alert → investigate work item', () => {
    const alert: LiveRegistryAlert = {
      entryId: ACTIVE_ANOMALY.id,
      type: 'appearance',
      severity: 'warning',
      week: 10,
      summary: '',
      reasonCode: 'new-registry-entry',
    }
    const item = alertToWorkItem(alert, ACTIVE_ANOMALY, 0, false)
    expect(item.kind).toBe('investigate')
    expect(item.priority).toBe('normal') // warning → normal
    expect(item.id).toBe(`wi-${ACTIVE_ANOMALY.id}-appearance`)
    expect(item.escalated).toBe(false)
    expect(item.suppressionCount).toBe(0)
  })

  it('maps escape alert → respond work item', () => {
    const alert: LiveRegistryAlert = {
      entryId: LOOSE_ANOMALY.id,
      type: 'escape',
      severity: 'critical',
      week: 10,
      summary: '',
      reasonCode: 'contained-to-loose',
    }
    const item = alertToWorkItem(alert, LOOSE_ANOMALY, 0, true)
    expect(item.kind).toBe('respond')
    expect(item.priority).toBe('critical')
    expect(item.escalated).toBe(true)
  })

  it('maps confirmation alert on staff → monitor (not contain)', () => {
    const alert: LiveRegistryAlert = {
      entryId: COMPROMISED_STAFF.id,
      type: 'confirmation',
      severity: 'info',
      week: 10,
      summary: '',
      reasonCode: 'inferred-to-confirmed',
    }
    const item = alertToWorkItem(alert, COMPROMISED_STAFF, 0, false)
    expect(item.kind).toBe('monitor') // staff confirmation is routine, not containment
  })

  it('records suppression count in work item', () => {
    const alert: LiveRegistryAlert = {
      entryId: ACTIVE_ANOMALY.id,
      type: 'appearance',
      severity: 'warning',
      week: 10,
      summary: '',
      reasonCode: 'new-registry-entry',
    }
    const item = alertToWorkItem(alert, ACTIVE_ANOMALY, 3, false)
    expect(item.suppressionCount).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// buildAlertWorklist — full pipeline
// ---------------------------------------------------------------------------

describe('buildAlertWorklist', () => {
  const appearanceAlert: LiveRegistryAlert = {
    entryId: ACTIVE_ANOMALY.id,
    type: 'appearance',
    severity: 'warning',
    week: 10,
    summary: '',
    reasonCode: 'new-registry-entry',
  }
  const escapeAlert: LiveRegistryAlert = {
    entryId: LOOSE_ANOMALY.id,
    type: 'escape',
    severity: 'critical',
    week: 10,
    summary: '',
    reasonCode: 'contained-to-loose',
  }

  it('produces ordered worklist: critical before normal', () => {
    const entries = [ACTIVE_ANOMALY, LOOSE_ANOMALY]
    const index = buildEntryIndex(entries)
    const worklist = buildAlertWorklist([appearanceAlert, escapeAlert], index, 10)
    expect(worklist.items[0].priority).toBe('critical') // escape for loose anomaly
    expect(worklist.items[1].priority).toBe('normal')   // appearance for active anomaly
  })

  it('escalates loose entry appearance to critical in the worklist', () => {
    const looseAppearance: LiveRegistryAlert = {
      entryId: LOOSE_ANOMALY.id,
      type: 'appearance',
      severity: 'warning',
      week: 10,
      summary: '',
      reasonCode: 'new-registry-entry',
    }
    const index = buildEntryIndex([LOOSE_ANOMALY])
    const worklist = buildAlertWorklist([looseAppearance], index, 10)
    expect(worklist.items[0].priority).toBe('critical')
    expect(worklist.items[0].escalated).toBe(true)
    expect(worklist.escalatedCount).toBe(1)
  })

  it('deduplicates repeated alerts for same entry+type+week', () => {
    const dup1: LiveRegistryAlert = { ...appearanceAlert }
    const dup2: LiveRegistryAlert = { ...appearanceAlert, summary: 'duplicate' }
    const index = buildEntryIndex([ACTIVE_ANOMALY])
    const worklist = buildAlertWorklist([dup1, dup2], index, 10)
    expect(worklist.items).toHaveLength(1)
    expect(worklist.items[0].suppressionCount).toBe(1)
  })

  it('suppresses confidence_drop for contained+confirmed entry', () => {
    const confidenceDrop: LiveRegistryAlert = {
      entryId: CONTAINED_CONFIRMED_ANOMALY.id,
      type: 'confidence_drop',
      severity: 'warning',
      week: 10,
      summary: '',
      reasonCode: 'confidence-drop-threshold',
    }
    const index = buildEntryIndex([CONTAINED_CONFIRMED_ANOMALY])
    const worklist = buildAlertWorklist([confidenceDrop], index, 10)
    expect(worklist.items).toHaveLength(0)
    expect(worklist.suppressedAlertCount).toBeGreaterThanOrEqual(0)
  })

  it('skips alerts whose entry is not in the index', () => {
    const orphan: LiveRegistryAlert = {
      entryId: 'nonexistent-entry',
      type: 'appearance',
      severity: 'warning',
      week: 10,
      summary: '',
      reasonCode: 'new-registry-entry',
    }
    const index = buildEntryIndex([])
    const worklist = buildAlertWorklist([orphan], index, 10)
    expect(worklist.items).toHaveLength(0)
  })

  it('raises overloadFlag when escalated count >= threshold (3)', () => {
    const entries = [
      makeEntry({ id: 'loose-1', operationalState: 'loose', truthState: 'confirmed', confidence: 0.9 }),
      makeEntry({ id: 'loose-2', operationalState: 'loose', truthState: 'confirmed', confidence: 0.9 }),
      makeEntry({ id: 'loose-3', operationalState: 'loose', truthState: 'confirmed', confidence: 0.9 }),
    ]
    const alerts: LiveRegistryAlert[] = entries.map((e) => ({
      entryId: e.id,
      type: 'escape' as const,
      severity: 'critical' as const,
      week: 10,
      summary: '',
      reasonCode: 'contained-to-loose',
    }))
    const index = buildEntryIndex(entries)
    const worklist = buildAlertWorklist(alerts, index, 10)
    expect(worklist.escalatedCount).toBeGreaterThanOrEqual(3)
    expect(worklist.overloadFlag).toBe(true)
  })

  it('criticalCount matches critical-priority items in output', () => {
    const index = buildEntryIndex([ACTIVE_ANOMALY, LOOSE_ANOMALY])
    const worklist = buildAlertWorklist([appearanceAlert, escapeAlert], index, 10)
    const criticalInItems = worklist.items.filter((i) => i.priority === 'critical').length
    expect(worklist.criticalCount).toBe(criticalInItems)
  })

  it('empty input produces empty worklist', () => {
    const worklist = buildAlertWorklist([], new Map(), 5)
    expect(worklist.items).toHaveLength(0)
    expect(worklist.criticalCount).toBe(0)
    expect(worklist.overloadFlag).toBe(false)
  })

  it('is deterministic — same inputs produce identical outputs', () => {
    const entries = [ACTIVE_ANOMALY, LOOSE_ANOMALY, INFERRED_SIGNATURE]
    const alerts: LiveRegistryAlert[] = [
      { entryId: ACTIVE_ANOMALY.id, type: 'appearance', severity: 'warning', week: 10, summary: '', reasonCode: 'new-registry-entry' },
      { entryId: LOOSE_ANOMALY.id, type: 'escape', severity: 'critical', week: 10, summary: '', reasonCode: 'contained-to-loose' },
      { entryId: INFERRED_SIGNATURE.id, type: 'appearance', severity: 'warning', week: 10, summary: '', reasonCode: 'new-registry-entry' },
    ]
    const index = buildEntryIndex(entries)
    const run1 = buildAlertWorklist(alerts, index, 10)
    const run2 = buildAlertWorklist(alerts, index, 10)
    expect(run1).toEqual(run2)
  })
})

// ---------------------------------------------------------------------------
// buildEntryIndex
// ---------------------------------------------------------------------------

describe('buildEntryIndex', () => {
  it('builds a map keyed by entry id', () => {
    const index = buildEntryIndex([ACTIVE_ANOMALY, LOOSE_ANOMALY])
    expect(index.get(ACTIVE_ANOMALY.id)).toBe(ACTIVE_ANOMALY)
    expect(index.get(LOOSE_ANOMALY.id)).toBe(LOOSE_ANOMALY)
    expect(index.size).toBe(2)
  })

  it('later entry with duplicate id overwrites earlier', () => {
    const a = makeEntry({ id: 'dup' })
    const b = makeEntry({ id: 'dup' })
    // b is the same shape but a different object reference
    const index = buildEntryIndex([a, b])
    expect(index.get('dup')).toBe(b) // last write wins
    expect(index.size).toBe(1)
  })
})
