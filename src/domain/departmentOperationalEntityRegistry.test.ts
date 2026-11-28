import { describe, expect, it, beforeEach } from 'vitest'
import {
  clearDepartmentRegistryForTests,
  getDepartment,
  listDepartments,
  registerDepartment,
  validateDepartmentRecord,
  type DepartmentRecord,
} from './departmentOperationalEntityRegistry'

describe('SPE-1320 department operational entity registry', () => {
  beforeEach(() => {
    clearDepartmentRegistryForTests()
  })

  const sample: DepartmentRecord = {
    id: 'dept-research-01',
    name: 'Anomaly Research Division',
    type: 'research',
    leadership: [{ role: 'director', actorRef: 'actor-jane-doe' }],
    membership: [{ actorRef: 'actor-jane-doe', status: 'active', clearanceLevel: 4 }],
    communications: ['internal-memo-channel'],
    budgets: [{ code: 'RES-2026', amount: 1500000 }],
    spaces: ['lab-wing-a', 'archive-room-3'],
    duties: [
      { id: 'duty-intake', description: 'Classify incoming anomalies', frequency: 'continuous' },
      { id: 'duty-report', description: 'Weekly containment status', frequency: 'weekly' },
    ],
  }

  it('registers and retrieves a department with leadership, membership, and duties', () => {
    registerDepartment(sample)
    const found = getDepartment('dept-research-01')
    expect(found).toBeDefined()
    expect(found?.leadership[0].role).toBe('director')
    expect(found?.membership[0].status).toBe('active')
    expect(found?.duties).toHaveLength(2)
    expect(listDepartments()).toHaveLength(1)
  })

  it('rejects duplicate registration', () => {
    registerDepartment(sample)
    expect(() => registerDepartment(sample)).toThrow(/department_already_registered/)
  })

  it('validates required fields and enums', () => {
    const invalid = { ...sample, type: 'unknown' as any, leadership: [{ role: 'king' as any, actorRef: '' }] }
    const errors = validateDepartmentRecord(invalid)
    expect(errors).toContain('invalid_type')
    expect(errors.some((e) => e.includes('invalid_leadership_role'))).toBe(true)
    expect(errors).toContain('missing_leadership_actor')
  })

  it('returns undefined for unknown department', () => {
    expect(getDepartment('missing')).toBeUndefined()
  })
})
