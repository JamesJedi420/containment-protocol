import { ROLE_LABELS, ROLE_COVERAGE_LABELS } from '../data/copy'
import { TEAM_COVERAGE_ROLES } from '../domain/models'
import { INPUT_ACTIONS, resolveInputBindingLabel } from './inputActions'
import type { InputPreferences } from './inputActions'
import { NAVIGATION_HISTORY_LIMIT } from './navigationHistory'
import type { ReferenceEntry } from './referenceLibrary'

export interface ReferenceFact {
  id: string
  label: string
  value: string
}
export type ReferenceProjection =
  | { status: 'available'; sourceLabel: string; facts: readonly ReferenceFact[] }
  | { status: 'unavailable' }

/** Public catalogue/configuration adapters only. No GameState or private entity input is accepted. */
export function projectReferenceEntry(
  entry: ReferenceEntry,
  preferences: InputPreferences
): ReferenceProjection {
  if (entry.publication !== 'public') return { status: 'unavailable' }
  let sourceLabel: string
  let facts: ReferenceFact[]
  switch (entry.projection) {
    case 'controls':
      sourceLabel = 'Current controls preferences'
      facts = INPUT_ACTIONS.flatMap((action) =>
        (['keyboard', 'controller'] as const).map((method) => ({
          id: `${action.id}.${method}`,
          label: `${action.label} — ${method}`,
          value: resolveInputBindingLabel(preferences, action.id, method)?.label ?? 'Unassigned',
        }))
      )
      break
    case 'navigation':
      sourceLabel = 'Application navigation history'
      facts = [
        {
          id: 'navigation.limit',
          label: 'Maximum remembered screens',
          value: String(NAVIGATION_HISTORY_LIMIT),
        },
      ]
      break
    case 'specializations':
      sourceLabel = 'Public agent specialization catalogue'
      facts = Object.entries(ROLE_LABELS).map(([id, label]) => ({
        id,
        label: 'Specialization',
        value: label,
      }))
      break
    case 'coverage':
      sourceLabel = 'Team coverage catalogue'
      facts = TEAM_COVERAGE_ROLES.map((id) => ({
        id,
        label: 'Coverage role',
        value: ROLE_COVERAGE_LABELS[id],
      }))
      break
    case 'guidance':
      return { status: 'available', sourceLabel: 'Explanatory reference guidance', facts: [] }
    default:
      return { status: 'unavailable' }
  }
  if (!facts.length || facts.some((fact) => typeof fact.value !== 'string' || !fact.value.trim()))
    return { status: 'unavailable' }
  return { status: 'available', sourceLabel, facts }
}
