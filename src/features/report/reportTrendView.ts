import { type GameState, type Id, type WeeklyReport } from '../../domain/models'
import { getTemplateFamily } from '../intel/intelView'

export interface TrendCaseRef {
  caseId: Id
  title: string
  templateId?: string
  family?: string
  isLive: boolean
}

export interface FamilyTrendItem {
  family: string
  count: number
  templateIds: string[]
  caseRefs: TrendCaseRef[]
}

export interface CaseTrendItem {
  title: string
  count: number
  caseRefs: TrendCaseRef[]
  templateIds: string[]
}

export interface TagPressureItem {
  tag: string
  score: number
  requiredCount: number
  preferredCount: number
  caseRefs: TrendCaseRef[]
  templateIds: string[]
}

export interface RunTrendSummary {
  recurringFamilies: FamilyTrendItem[]
  raidConversions: CaseTrendItem[]
  unresolvedHotspots: CaseTrendItem[]
  dominantTags: TagPressureItem[]
}

export function getRunTrendSummary(game: GameState, reports: WeeklyReport[] = game.reports) {
  const familyMap = new Map<string, FamilyTrendItem>()
  const raidMap = new Map<Id, CaseTrendItem>()
  const unresolvedMap = new Map<Id, CaseTrendItem>()
  const tagMap = new Map<string, TagPressureItem>()

  for (const report of reports) {
    const reportCaseIds = new Set([
      ...report.newCases,
      ...report.progressedCases,
      ...report.partialCases,
      ...report.resolvedCases,
      ...report.failedCases,
      ...report.unresolvedTriggers,
      ...report.spawnedCases,
    ])

    for (const caseId of reportCaseIds) {
      const currentCase = game.cases[caseId]
      const snapshot = report.caseSnapshots?.[caseId]
      const isLive = Boolean(currentCase)
      const title = currentCase?.title ?? snapshot?.title ?? caseId
      const templateId = currentCase?.templateId
      const family = currentCase ? getTemplateFamily(currentCase.templateId) : undefined

      const ref: TrendCaseRef = {
        caseId,
        title,
        templateId,
        family,
        isLive,
      }

      if (family) {
        const familyEntry = familyMap.get(family) ?? {
          family,
          count: 0,
          templateIds: [],
          caseRefs: [],
        }

        familyEntry.count += 1
        pushUniqueCaseRef(familyEntry.caseRefs, ref)
        pushUniqueValue(familyEntry.templateIds, templateId)
        familyMap.set(family, familyEntry)
      }

      if ((currentCase?.kind ?? snapshot?.kind) === 'raid') {
        const raidEntry = raidMap.get(caseId) ?? {
          title,
          count: 0,
          caseRefs: [],
          templateIds: [],
        }

        raidEntry.count += 1
        pushUniqueCaseRef(raidEntry.caseRefs, ref)
        pushUniqueValue(raidEntry.templateIds, templateId)
        raidMap.set(caseId, raidEntry)
      }

      if (report.unresolvedTriggers.includes(caseId)) {
        const unresolvedEntry = unresolvedMap.get(caseId) ?? {
          title,
          count: 0,
          caseRefs: [],
          templateIds: [],
        }

        unresolvedEntry.count += 1
        pushUniqueCaseRef(unresolvedEntry.caseRefs, ref)
        pushUniqueValue(unresolvedEntry.templateIds, templateId)
        unresolvedMap.set(caseId, unresolvedEntry)
      }

      if (!currentCase) {
        continue
      }

      for (const tag of currentCase.requiredTags) {
        const tagEntry = tagMap.get(tag) ?? {
          tag,
          score: 0,
          requiredCount: 0,
          preferredCount: 0,
          caseRefs: [],
          templateIds: [],
        }

        tagEntry.score += 2
        tagEntry.requiredCount += 1
        pushUniqueCaseRef(tagEntry.caseRefs, ref)
        pushUniqueValue(tagEntry.templateIds, currentCase.templateId)
        tagMap.set(tag, tagEntry)
      }

      for (const tag of currentCase.preferredTags) {
        const tagEntry = tagMap.get(tag) ?? {
          tag,
          score: 0,
          requiredCount: 0,
          preferredCount: 0,
          caseRefs: [],
          templateIds: [],
        }

        tagEntry.score += 1
        tagEntry.preferredCount += 1
        pushUniqueCaseRef(tagEntry.caseRefs, ref)
        pushUniqueValue(tagEntry.templateIds, currentCase.templateId)
        tagMap.set(tag, tagEntry)
      }
    }
  }

  return {
    recurringFamilies: [...familyMap.values()]
      .filter((item) => item.count > 1)
      .sort((left, right) => right.count - left.count || left.family.localeCompare(right.family))
      .slice(0, 4),
    raidConversions: [...raidMap.values()]
      .sort((left, right) => right.count - left.count || left.title.localeCompare(right.title))
      .slice(0, 4),
    unresolvedHotspots: [...unresolvedMap.values()]
      .sort((left, right) => right.count - left.count || left.title.localeCompare(right.title))
      .slice(0, 4),
    dominantTags: [...tagMap.values()]
      .sort((left, right) => right.score - left.score || left.tag.localeCompare(right.tag))
      .slice(0, 5),
  } satisfies RunTrendSummary
}

function pushUniqueCaseRef(target: TrendCaseRef[], ref: TrendCaseRef) {
  if (target.some((entry) => entry.caseId === ref.caseId)) {
    return
  }

  target.push(ref)
}

function pushUniqueValue(target: string[], value?: string) {
  if (!value || target.includes(value)) {
    return
  }

  target.push(value)
}
