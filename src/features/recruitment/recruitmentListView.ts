import {
  readEnumParam,
  readStringParam,
  writeEnumParam,
  writeStringParam,
} from '../../app/searchParams'
import type { RecruitmentViewFilters } from './recruitmentView'

export const RECRUITMENT_CATEGORY_FILTERS = ['all', 'agent', 'staff', 'specialist'] as const
export const RECRUITMENT_SORT_FILTERS = ['expiry', 'overall', 'wage', 'name'] as const

export type RecruitmentCategoryFilter = (typeof RECRUITMENT_CATEGORY_FILTERS)[number]
export type RecruitmentSortFilter = (typeof RECRUITMENT_SORT_FILTERS)[number]

export interface RecruitmentListFilters {
  q: string
  category: RecruitmentCategoryFilter
  sort: RecruitmentSortFilter
  expiringSoonOnly: boolean
}

export const DEFAULT_RECRUITMENT_LIST_FILTERS: RecruitmentListFilters = {
  q: '',
  category: 'all',
  sort: 'expiry',
  expiringSoonOnly: false,
}

export function readRecruitmentListFilters(searchParams: URLSearchParams): RecruitmentListFilters {
  return {
    q: readStringParam(searchParams, 'q'),
    category: readEnumParam(
      searchParams,
      'category',
      RECRUITMENT_CATEGORY_FILTERS,
      DEFAULT_RECRUITMENT_LIST_FILTERS.category
    ),
    sort: readEnumParam(
      searchParams,
      'sort',
      RECRUITMENT_SORT_FILTERS,
      DEFAULT_RECRUITMENT_LIST_FILTERS.sort
    ),
    expiringSoonOnly: searchParams.get('expiring') === '1',
  }
}

export function writeRecruitmentListFilters(
  filters: RecruitmentListFilters,
  baseSearchParams?: URLSearchParams
) {
  const nextSearchParams = new URLSearchParams(baseSearchParams)

  writeStringParam(nextSearchParams, 'q', filters.q)
  writeEnumParam(
    nextSearchParams,
    'category',
    filters.category,
    DEFAULT_RECRUITMENT_LIST_FILTERS.category
  )
  writeEnumParam(nextSearchParams, 'sort', filters.sort, DEFAULT_RECRUITMENT_LIST_FILTERS.sort)

  if (filters.expiringSoonOnly) {
    nextSearchParams.set('expiring', '1')
  } else {
    nextSearchParams.delete('expiring')
  }

  return nextSearchParams
}

export function toRecruitmentViewFilters(filters: RecruitmentListFilters): RecruitmentViewFilters {
  return {
    search: filters.q,
    category: filters.category === 'all' ? undefined : filters.category,
    expiringSoonOnly: filters.expiringSoonOnly,
    sort: filters.sort,
  }
}
