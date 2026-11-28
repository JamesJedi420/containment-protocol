/**
 * SPE-1320 — Department operational entity schema (slice 1).
 *
 * Pure registry for department records supporting leadership, membership,
 * communications, budgets, spaces, and duties. Callers own persistence and
 * routing. This module does not implement deployable-unit handoff, week-close,
 * or capability resolvers.
 */

export const DEPARTMENT_TYPES = [
  'research',
  'containment',
  'security',
  'logistics',
  'medical',
  'administration',
  'intelligence',
] as const
export type DepartmentType = (typeof DEPARTMENT_TYPES)[number]

export const DEPARTMENT_LEADERSHIP_ROLES = [
  'director',
  'deputy_director',
  'section_chief',
  'duty_officer',
] as const
export type DepartmentLeadershipRole = (typeof DEPARTMENT_LEADERSHIP_ROLES)[number]

export const DEPARTMENT_MEMBERSHIP_STATUSES = [
  'active',
  'on_leave',
  'transferred',
  'retired',
] as const
export type DepartmentMembershipStatus = (typeof DEPARTMENT_MEMBERSHIP_STATUSES)[number]

export interface DepartmentLeadership {
  role: DepartmentLeadershipRole
  actorRef: string
  appointedAt?: string
}

export interface DepartmentMembership {
  actorRef: string
  status: DepartmentMembershipStatus
  joinedAt?: string
  clearanceLevel?: number
}

export interface DepartmentDuty {
  id: string
  description: string
  requiredCapability?: string
  frequency?: 'continuous' | 'weekly' | 'on_demand'
}

export interface DepartmentRecord {
  id: string
  name: string
  type: DepartmentType
  leadership: DepartmentLeadership[]
  membership: DepartmentMembership[]
  communications: string[]
  budgets: { code: string; amount?: number }[]
  spaces: string[]
  duties: DepartmentDuty[]
  notes?: string
}

const REGISTRY = new Map<string, DepartmentRecord>()

export function registerDepartment(record: DepartmentRecord): void {
  if (REGISTRY.has(record.id)) {
    throw new Error(`department_already_registered:${record.id}`)
  }
  if (!DEPARTMENT_TYPES.includes(record.type)) {
    throw new Error(`unknown_department_type:${record.type}`)
  }
  REGISTRY.set(record.id, structuredClone(record))
}

export function getDepartment(id: string): DepartmentRecord | undefined {
  const found = REGISTRY.get(id)
  return found ? structuredClone(found) : undefined
}

export function listDepartments(): DepartmentRecord[] {
  return Array.from(REGISTRY.values()).map((r) => structuredClone(r))
}

export function clearDepartmentRegistryForTests(): void {
  REGISTRY.clear()
}

export function validateDepartmentRecord(record: DepartmentRecord): string[] {
  const errors: string[] = []
  if (!record.id) errors.push('missing_id')
  if (!record.name) errors.push('missing_name')
  if (!DEPARTMENT_TYPES.includes(record.type)) errors.push('invalid_type')
  for (const lead of record.leadership) {
    if (!DEPARTMENT_LEADERSHIP_ROLES.includes(lead.role)) errors.push(`invalid_leadership_role:${lead.role}`)
    if (!lead.actorRef) errors.push('missing_leadership_actor')
  }
  for (const mem of record.membership) {
    if (!DEPARTMENT_MEMBERSHIP_STATUSES.includes(mem.status)) errors.push(`invalid_membership_status:${mem.status}`)
    if (!mem.actorRef) errors.push('missing_membership_actor')
  }
  return errors
}
