import type { Agent, AgentRole, FatigueBand } from '../../domain/models'

/** Query facts supplied by a player-visible personnel projection. */
export interface PersonnelQueryRecord {
  readonly id: string
  readonly name: string
  readonly role: AgentRole
  readonly status: Agent['status']
  readonly teamId: string | undefined
  readonly fatigue: FatigueBand
  readonly training: 'training' | 'available'
  readonly searchText: string
}

export interface PersonnelQueryFilters {
  q: string
  role: 'all' | PersonnelQueryRecord['role']
  status: 'all' | PersonnelQueryRecord['status']
  team: string
  fatigue: 'all' | PersonnelQueryRecord['fatigue']
  training: 'all' | PersonnelQueryRecord['training']
}

type PersonnelSortKey = 'name' | 'role' | 'status'

export interface PersonnelQuerySort {
  readonly primary: PersonnelSortKey
  readonly secondary?: PersonnelSortKey
}

type PersonnelFacet = 'role' | 'status' | 'teamId' | 'fatigue' | 'training'

const compareText = (left: string, right: string) => (left < right ? -1 : Number(left > right))

export function evaluatePersonnelQuery(
  records: readonly PersonnelQueryRecord[],
  filters: PersonnelQueryFilters,
  sort?: PersonnelQuerySort
): readonly string[] {
  const query = filters.q.toLowerCase()
  const matches = records.filter(
    (record) =>
      (filters.role === 'all' || record.role === filters.role) &&
      (filters.status === 'all' || record.status === filters.status) &&
      (filters.team === 'all' ||
        (filters.team === 'unassigned'
          ? record.teamId === undefined
          : record.teamId === filters.team)) &&
      (filters.fatigue === 'all' || record.fatigue === filters.fatigue) &&
      (filters.training === 'all' || record.training === filters.training) &&
      record.searchText.includes(query)
  )

  // A missing sort preserves the caller's canonical roster order.
  if (sort) {
    const { primary, secondary } = sort
    matches.sort(
      (left, right) =>
        compareText(left[primary], right[primary]) ||
        (secondary ? compareText(left[secondary], right[secondary]) : 0) ||
        compareText(left.id, right.id)
    )
  }

  return matches.map((record) => record.id)
}

/** Request only the facets the consuming screen exposes, in canonical roster order. */
export function getPersonnelQueryFacet<Key extends PersonnelFacet>(
  records: readonly PersonnelQueryRecord[],
  key: Key
): NonNullable<PersonnelQueryRecord[Key]>[] {
  const values = records.map((record) => record[key]).filter((value) => value != null)
  return [...new Set(values)]
}
