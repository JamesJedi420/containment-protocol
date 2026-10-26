import {
  readEnumParam,
  readStringParam,
  writeEnumParam,
  writeStringParam,
} from '../../app/searchParams'

export const CASE_STATUS_FILTERS = ['all', 'open', 'in_progress', 'resolved'] as const
export const CASE_MODE_FILTERS = ['all', 'threshold', 'probability', 'deterministic'] as const
export const CASE_STAGE_FILTERS = ['all', '1', '2', '3', '4', '5'] as const
export const CASE_SORTS = ['priority', 'deadline', 'success', 'title'] as const
export const CASE_TRIAGE_TABS = [
  'all',
  'incidents',
  'contracts',
  'leads',
  'escalating',
  'assigned',
] as const

export type CaseStatusFilter = (typeof CASE_STATUS_FILTERS)[number]
export type CaseModeFilter = (typeof CASE_MODE_FILTERS)[number]
export type CaseStageFilter = (typeof CASE_STAGE_FILTERS)[number]
export type CaseSort = (typeof CASE_SORTS)[number]
export type CaseTriageTab = (typeof CASE_TRIAGE_TABS)[number]

export interface CaseListFilters {
  q: string
  status: CaseStatusFilter
  mode: CaseModeFilter
  stage: CaseStageFilter
  sort: CaseSort
  risk: boolean
  tab: CaseTriageTab
  selectedCaseId: string
}

export const DEFAULT_CASE_LIST_FILTERS: CaseListFilters = {
  q: '',
  status: 'all',
  mode: 'all',
  stage: 'all',
  sort: 'priority',
  risk: false,
  tab: 'all',
  selectedCaseId: '',
}

export function readCaseListFilters(searchParams: URLSearchParams): CaseListFilters {
  return {
    q: readStringParam(searchParams, 'q'),
    status: readEnumParam(
      searchParams,
      'status',
      CASE_STATUS_FILTERS,
      DEFAULT_CASE_LIST_FILTERS.status
    ),
    mode: readEnumParam(searchParams, 'mode', CASE_MODE_FILTERS, DEFAULT_CASE_LIST_FILTERS.mode),
    stage: readEnumParam(
      searchParams,
      'stage',
      CASE_STAGE_FILTERS,
      DEFAULT_CASE_LIST_FILTERS.stage
    ),
    sort: readEnumParam(searchParams, 'sort', CASE_SORTS, DEFAULT_CASE_LIST_FILTERS.sort),
    risk: searchParams.get('risk') === '1',
    tab: readEnumParam(searchParams, 'tab', CASE_TRIAGE_TABS, DEFAULT_CASE_LIST_FILTERS.tab),
    selectedCaseId: readStringParam(searchParams, 'case'),
  }
}

export function writeCaseListFilters(filters: CaseListFilters, baseSearchParams?: URLSearchParams) {
  const nextSearchParams = new URLSearchParams(baseSearchParams)

  writeStringParam(nextSearchParams, 'q', filters.q)
  writeEnumParam(nextSearchParams, 'status', filters.status, DEFAULT_CASE_LIST_FILTERS.status)
  writeEnumParam(nextSearchParams, 'mode', filters.mode, DEFAULT_CASE_LIST_FILTERS.mode)
  writeEnumParam(nextSearchParams, 'stage', filters.stage, DEFAULT_CASE_LIST_FILTERS.stage)
  writeEnumParam(nextSearchParams, 'sort', filters.sort, DEFAULT_CASE_LIST_FILTERS.sort)

  if (filters.risk) {
    nextSearchParams.set('risk', '1')
  } else {
    nextSearchParams.delete('risk')
  }

  writeEnumParam(nextSearchParams, 'tab', filters.tab, DEFAULT_CASE_LIST_FILTERS.tab)
  writeStringParam(nextSearchParams, 'case', filters.selectedCaseId)

  return nextSearchParams
}
