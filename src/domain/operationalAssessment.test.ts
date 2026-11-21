import { describe, expect, it } from 'vitest'
import {
  collectAssessments,
  isIndependentCorroboration,
  normalizeAssessment,
  type OperationalAssessmentRecord,
} from './operationalAssessment'

describe('SPE-3025 operational assessment record', () => {
  const staff: unknown = {
    id: 'a1',
    subjectId: 'event-x',
    claim: 'door was open',
    provenance: [{ sourceType: 'staff-recollection', sourceRef: 'staff-42' }],
    confidence: 'uncertain',
  }
  const institutional: unknown = {
    id: 'a2',
    subjectId: 'event-x',
    claim: 'door was sealed',
    provenance: [{ sourceType: 'institutional-record', sourceRef: 'log-17' }],
    confidence: 'confirmed',
    contradictionIds: ['a1'],
  }
  const machine: unknown = {
    id: 'a3',
    subjectId: 'event-x',
    claim: 'sensor reports closed',
    provenance: [{ sourceType: 'machine-observation', sourceRef: 'sensor-9', originRef: 'obs-1' }],
    confidence: 'supported',
  }
  const derivative: unknown = {
    id: 'a4',
    subjectId: 'event-x',
    claim: 'report of closed',
    provenance: [{ sourceType: 'institutional-record', sourceRef: 'summary-3', originRef: 'obs-1' }],
    confidence: 'supported',
    corroborationIds: ['a3'],
  }

  it('normalizes a valid record and rejects malformed', () => {
    const ok = normalizeAssessment(staff)
    expect(ok.status).toBe('ok')
    if (ok.status === 'ok') {
      expect(ok.record.id).toBe('a1')
      expect(Object.isFrozen(ok.record)).toBe(true)
    }
    expect(normalizeAssessment({ id: 'bad' }).status).toBe('invalid')
  })

  it('collects three parallel assessments with contradiction preserved', () => {
    const result = collectAssessments([staff, institutional, machine])
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.records).toHaveLength(3)
      expect(result.relationships.some((r) => r.type === 'contradiction')).toBe(true)
      expect(result.records.map((r) => r.id)).toEqual(['a1', 'a2', 'a3'])
    }
  })

  it('supports independent corroboration check and shared-origin non-independence', () => {
    const a3 = normalizeAssessment(machine)
    const a4 = normalizeAssessment(derivative)
    if (a3.status === 'ok' && a4.status === 'ok') {
      expect(isIndependentCorroboration(a3.record, a4.record)).toBe(false)
      expect(isIndependentCorroboration(a3.record, (normalizeAssessment(staff) as { status: 'ok'; record: OperationalAssessmentRecord }).record)).toBe(true)
    }
  })

  it('mixed-source fixture preserves distinct provenance', () => {
    const result = collectAssessments([staff, institutional, machine])
    if (result.status === 'ok') {
      const types = result.records.flatMap((r) => r.provenance.map((p) => p.sourceType))
      expect(types).toContain('staff-recollection')
      expect(types).toContain('institutional-record')
      expect(types).toContain('machine-observation')
    }
  })
})
