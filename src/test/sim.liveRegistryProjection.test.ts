import { describe, expect, it } from 'vitest'
import {
  projectAnomalyToRegistryEntry,
  projectStaffToRegistryEntry,
  projectExternalActorToRegistryEntry,
  buildRegistryFromSources,
  attachContextLink,
  type AnomalySourceInput,
  type StaffSourceInput,
  type ExternalSourceInput,
  type DetectionContext,
  type RegistrySourceSet,
} from '../domain/liveRegistryProjection'

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const PHYSICAL_ANOMALY: AnomalySourceInput = {
  entityId: 'anom-physical-1',
  label: 'Stone Golem Alpha',
  actorClass: 'construct',
  physicality: 'physical',
  behaviorState: 'hunting',
  locationTag: 'sector-7',
  linkedCaseIds: ['case-alpha'],
}

const NONPHYSICAL_ANOMALY: AnomalySourceInput = {
  entityId: 'anom-spirit-1',
  label: 'Whisper Shade',
  actorClass: 'spirit_manifestation',
  physicality: 'nonphysical',
  behaviorState: 'hiding',
  locationTag: 'sector-3',
  linkedCaseIds: ['case-beta'],
}

const PROJECTED_ANOMALY: AnomalySourceInput = {
  entityId: 'anom-proj-1',
  label: 'Echo Projection',
  actorClass: 'spirit_manifestation',
  physicality: 'projected',
  behaviorState: 'dormant',
}

const STAFF_MEMBER: StaffSourceInput = {
  entityId: 'agent-017',
  label: 'Agent 017',
  currentAssignment: 'idle',
  locationTag: 'hq',
  linkedCaseIds: [],
}

const EXTERNAL_ACTOR: ExternalSourceInput = {
  entityId: 'ext-rival-1',
  label: 'Rival Operative',
  inferenceStrength: 0.7,
  locationTag: 'sector-7',
  linkedCaseIds: ['case-alpha'],
}

const DIRECT_DETECTION: DetectionContext = {
  detectionStrength: 0.95,
  detectionMethod: 'direct',
}

const WEAK_INFERENCE: DetectionContext = {
  detectionStrength: 0.3,
  detectionMethod: 'inference',
}

const UNDETECTED: DetectionContext = {
  detectionStrength: 0,
  detectionMethod: 'undetected',
}

// ---------------------------------------------------------------------------
// Physical anomaly projection
// ---------------------------------------------------------------------------

describe('projectAnomalyToRegistryEntry (physical)', () => {
  it('direct detection → confirmed active anomaly entry', () => {
    const entry = projectAnomalyToRegistryEntry(PHYSICAL_ANOMALY, DIRECT_DETECTION, 10)
    expect(entry).not.toBeNull()
    expect(entry!.entityClass).toBe('anomaly')
    expect(entry!.truthState).toBe('confirmed')
    expect(entry!.operationalState).toBe('active')
    expect(entry!.entityId).toBe(PHYSICAL_ANOMALY.entityId)
    expect(entry!.locationTag).toBe('sector-7')
    expect(entry!.linkedCaseIds).toContain('case-alpha')
    expect(entry!.confidence).toBeCloseTo(0.95, 3)
  })

  it('inference detection → suspected entry (below confirmed threshold)', () => {
    const partialDetection: DetectionContext = {
      detectionStrength: 0.6,
      detectionMethod: 'inference',
    }
    const entry = projectAnomalyToRegistryEntry(PHYSICAL_ANOMALY, partialDetection, 10)
    expect(entry).not.toBeNull()
    expect(entry!.entityClass).toBe('anomaly')
    expect(entry!.truthState).toBe('suspected')
  })

  it('undetected → returns null (actor invisible)', () => {
    const entry = projectAnomalyToRegistryEntry(PHYSICAL_ANOMALY, UNDETECTED, 10)
    expect(entry).toBeNull()
  })

  it('contained behavior state → contained operational state', () => {
    const contained: AnomalySourceInput = { ...PHYSICAL_ANOMALY, behaviorState: 'contained' }
    const entry = projectAnomalyToRegistryEntry(contained, DIRECT_DETECTION, 10)
    expect(entry).not.toBeNull()
    expect(entry!.operationalState).toBe('contained')
  })
})

// ---------------------------------------------------------------------------
// Nonphysical anomaly projection
// ---------------------------------------------------------------------------

describe('projectAnomalyToRegistryEntry (nonphysical)', () => {
  it('weak inference → inferred signature entry (not full anomaly entry)', () => {
    const entry = projectAnomalyToRegistryEntry(NONPHYSICAL_ANOMALY, WEAK_INFERENCE, 10)
    expect(entry).not.toBeNull()
    expect(entry!.entityClass).toBe('signature')
    expect(entry!.truthState).toBe('inferred')
    expect(entry!.label).toContain('Unresolved signature')
  })

  it('strong direct detection → confirmed anomaly entry', () => {
    const entry = projectAnomalyToRegistryEntry(NONPHYSICAL_ANOMALY, DIRECT_DETECTION, 10)
    expect(entry).not.toBeNull()
    expect(entry!.entityClass).toBe('anomaly')
    expect(entry!.truthState).toBe('confirmed')
  })

  it('above suspected threshold but below confirmed with non-direct method → suspected anomaly', () => {
    const detection: DetectionContext = {
      detectionStrength: 0.65,
      detectionMethod: 'inference',
    }
    const entry = projectAnomalyToRegistryEntry(NONPHYSICAL_ANOMALY, detection, 10)
    expect(entry).not.toBeNull()
    expect(entry!.entityClass).toBe('anomaly')
    expect(entry!.truthState).toBe('suspected')
  })

  it('undetected nonphysical → returns null', () => {
    const entry = projectAnomalyToRegistryEntry(NONPHYSICAL_ANOMALY, UNDETECTED, 10)
    expect(entry).toBeNull()
  })

  it('projected physicality uses same nonphysical rules', () => {
    const weakEntry = projectAnomalyToRegistryEntry(PROJECTED_ANOMALY, WEAK_INFERENCE, 5)
    expect(weakEntry).not.toBeNull()
    expect(weakEntry!.entityClass).toBe('signature')

    const strongEntry = projectAnomalyToRegistryEntry(PROJECTED_ANOMALY, DIRECT_DETECTION, 5)
    expect(strongEntry).not.toBeNull()
    expect(strongEntry!.entityClass).toBe('anomaly')
  })
})

// ---------------------------------------------------------------------------
// Staff projection
// ---------------------------------------------------------------------------

describe('projectStaffToRegistryEntry', () => {
  it('staff always produces confirmed entry at confidence 1', () => {
    const entry = projectStaffToRegistryEntry(STAFF_MEMBER, 10)
    expect(entry.entityClass).toBe('staff')
    expect(entry.truthState).toBe('confirmed')
    expect(entry.confidence).toBe(1)
    expect(entry.operationalState).toBe('active') // idle → active
    expect(entry.locationTag).toBe('hq')
  })

  it('assigned staff maps to assigned operational state', () => {
    const assignedStaff: StaffSourceInput = { ...STAFF_MEMBER, currentAssignment: 'assigned' }
    const entry = projectStaffToRegistryEntry(assignedStaff, 10)
    expect(entry.operationalState).toBe('assigned')
  })

  it('staff with no assignment defaults to active operational state', () => {
    const unassigned: StaffSourceInput = { entityId: 'agent-x', label: 'Unnamed Agent' }
    const entry = projectStaffToRegistryEntry(unassigned, 10)
    expect(entry.operationalState).toBe('active')
    expect(entry.truthState).toBe('confirmed')
  })
})

// ---------------------------------------------------------------------------
// External actor projection
// ---------------------------------------------------------------------------

describe('projectExternalActorToRegistryEntry', () => {
  it('moderate inference → suspected external entry', () => {
    const entry = projectExternalActorToRegistryEntry(EXTERNAL_ACTOR, 10)
    expect(entry).not.toBeNull()
    expect(entry!.entityClass).toBe('external')
    expect(entry!.truthState).toBe('suspected')
    expect(entry!.locationTag).toBe('sector-7')
  })

  it('very low inference → returns null (below minimum threshold)', () => {
    const low: ExternalSourceInput = { ...EXTERNAL_ACTOR, inferenceStrength: 0.05 }
    const entry = projectExternalActorToRegistryEntry(low, 10)
    expect(entry).toBeNull()
  })

  it('low-but-valid inference → inferred entry', () => {
    const lowValid: ExternalSourceInput = { ...EXTERNAL_ACTOR, inferenceStrength: 0.3 }
    const entry = projectExternalActorToRegistryEntry(lowValid, 10)
    expect(entry).not.toBeNull()
    expect(entry!.truthState).toBe('inferred')
  })
})

// ---------------------------------------------------------------------------
// Aggregate projection (buildRegistryFromSources)
// ---------------------------------------------------------------------------

describe('buildRegistryFromSources', () => {
  it('produces anomaly, staff, and external entries from a mixed source set', () => {
    const sources: RegistrySourceSet = {
      anomalies: [PHYSICAL_ANOMALY],
      staff: [STAFF_MEMBER],
      externalActors: [EXTERNAL_ACTOR],
    }

    const detections = new Map<string, DetectionContext>([
      [PHYSICAL_ANOMALY.entityId, DIRECT_DETECTION],
    ])

    const entries = buildRegistryFromSources(sources, detections, 12)

    const classes = entries.map((e) => e.entityClass)
    expect(classes).toContain('anomaly')
    expect(classes).toContain('staff')
    expect(classes).toContain('external')
    expect(entries).toHaveLength(3)
  })

  it('hidden anomaly with no detection does not appear in the registry', () => {
    const sources: RegistrySourceSet = {
      anomalies: [NONPHYSICAL_ANOMALY],
      staff: [STAFF_MEMBER],
    }

    const detections = new Map<string, DetectionContext>([
      [NONPHYSICAL_ANOMALY.entityId, UNDETECTED],
    ])

    const entries = buildRegistryFromSources(sources, detections, 12)
    expect(entries.some((e) => e.entityId === NONPHYSICAL_ANOMALY.entityId)).toBe(false)
    // Staff still appears
    expect(entries.some((e) => e.entityClass === 'staff')).toBe(true)
  })

  it('missing detection entry treated as undetected (non-omniscient)', () => {
    const sources: RegistrySourceSet = {
      anomalies: [NONPHYSICAL_ANOMALY],
    }
    // No detection map entry at all
    const entries = buildRegistryFromSources(sources, new Map(), 5)
    expect(entries).toHaveLength(0)
  })

  it('below-threshold external actor is excluded from output', () => {
    const lowExternal: ExternalSourceInput = { ...EXTERNAL_ACTOR, inferenceStrength: 0.01 }
    const sources: RegistrySourceSet = {
      externalActors: [lowExternal],
    }
    const entries = buildRegistryFromSources(sources, new Map(), 5)
    expect(entries).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Context link / live-vs-historical attachment
// ---------------------------------------------------------------------------

describe('attachContextLink', () => {
  it('attaches a case id to an existing entry', () => {
    const base = projectStaffToRegistryEntry(STAFF_MEMBER, 8)
    const linked = attachContextLink(base, { caseId: 'case-alpha' })
    expect(linked.linkedCaseIds).toContain('case-alpha')
    // Other fields unchanged
    expect(linked.entityId).toBe(base.entityId)
    expect(linked.truthState).toBe('confirmed')
  })

  it('attaches an archive reference as a tagged marker', () => {
    const base = projectStaffToRegistryEntry(STAFF_MEMBER, 8)
    const linked = attachContextLink(base, { archiveRef: 'arc-0042' })
    expect(linked.linkedCaseIds.some((id) => id.includes('arc-0042'))).toBe(true)
  })

  it('attaches both case id and archive ref without duplication', () => {
    const base = projectAnomalyToRegistryEntry(PHYSICAL_ANOMALY, DIRECT_DETECTION, 10)!
    const linked = attachContextLink(base, { caseId: 'case-alpha', archiveRef: 'arc-001' })
    // case-alpha was already in linkedCaseIds; must not be duplicated
    const caseAlphaCount = linked.linkedCaseIds.filter((id) => id === 'case-alpha').length
    expect(caseAlphaCount).toBe(1)
    expect(linked.linkedCaseIds.some((id) => id.includes('arc-001'))).toBe(true)
  })

  it('is a pure update — original entry is not mutated', () => {
    const base = projectStaffToRegistryEntry(STAFF_MEMBER, 8)
    const originalLength = base.linkedCaseIds.length
    attachContextLink(base, { caseId: 'new-case' })
    expect(base.linkedCaseIds).toHaveLength(originalLength)
  })
})

// ---------------------------------------------------------------------------
// Determinism / repeatability
// ---------------------------------------------------------------------------

describe('determinism', () => {
  it('same inputs produce identical outputs on repeated calls', () => {
    const a = projectAnomalyToRegistryEntry(PHYSICAL_ANOMALY, DIRECT_DETECTION, 7)
    const b = projectAnomalyToRegistryEntry(PHYSICAL_ANOMALY, DIRECT_DETECTION, 7)
    expect(a).toEqual(b)
  })

  it('buildRegistryFromSources is deterministic', () => {
    const sources: RegistrySourceSet = {
      anomalies: [PHYSICAL_ANOMALY, NONPHYSICAL_ANOMALY],
      staff: [STAFF_MEMBER],
      externalActors: [EXTERNAL_ACTOR],
    }
    const detections = new Map<string, DetectionContext>([
      [PHYSICAL_ANOMALY.entityId, DIRECT_DETECTION],
      [NONPHYSICAL_ANOMALY.entityId, WEAK_INFERENCE],
    ])

    const run1 = buildRegistryFromSources(sources, detections, 15)
    const run2 = buildRegistryFromSources(sources, detections, 15)
    expect(run1).toEqual(run2)
  })
})
