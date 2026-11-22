import { readRecruitmentListFilters, writeRecruitmentListFilters } from './recruitmentListView'
import type { RecruitmentListFilters } from './recruitmentListView'

export const RECRUITMENT_LIST_PREFERENCES_KEY = 'containment-protocol-recruitment-list-v1'
const MAX_SAVED_QUERY_LENGTH = 2048

export function readRecruitmentListPreferences(): RecruitmentListFilters | undefined {
  try {
    const saved = window.localStorage.getItem(RECRUITMENT_LIST_PREFERENCES_KEY)
    if (saved && saved.length <= MAX_SAVED_QUERY_LENGTH) {
      const filters = readRecruitmentListFilters(new URLSearchParams(saved))
      return writeRecruitmentListFilters(filters).size > 0 ? filters : undefined
    }
  } catch {
    // Browser storage can be disabled. The board still works through its URL.
  }
}

export function saveRecruitmentListPreferences(filters: RecruitmentListFilters): void {
  const saved = writeRecruitmentListFilters(filters).toString()
  try {
    if (saved) {
      window.localStorage.setItem(RECRUITMENT_LIST_PREFERENCES_KEY, saved)
    } else {
      window.localStorage.removeItem(RECRUITMENT_LIST_PREFERENCES_KEY)
    }
  } catch {
    // Browser storage can be disabled. The board still works through its URL.
  }
}
