import {
  readEnumParam,
  readStringParam,
  writeEnumParam,
  writeStringParam,
} from '../../app/searchParams'
import { CASE_LORE_STUBS } from '../../data/copy'
import { createStartingState } from '../../data/startingState'
import {
  type CaseInstance,
  type CaseTemplate,
  type GameState,
  type StatKey,
  type TeamCoverageRole,
} from '../../domain/models'
import { inferCasePressureValue, inferCaseRegionTag } from '../../domain/pressure'
import {
  buildResolutionPreviewState,
  estimateOutcomeOdds,
  type OutcomeOdds,
} from '../../domain/sim/resolve'
import { caseTemplateMap } from '../../domain/templates/caseTemplates'
import { getCapabilitySummary } from '../teams/teamView'

const STAT_KEYS: StatKey[] = ['combat', 'investigation', 'utility', 'social']

export const INTEL_MODE_FILTERS = ['all', 'threshold', 'probability', 'deterministic'] as const
export const INTEL_KIND_FILTERS = ['all', 'case', 'raid'] as const
export const INTEL_PRESSURE_FILTERS = ['all', 'routine', 'elevated', 'severe', 'critical'] as const

export type IntelModeFilter = (typeof INTEL_MODE_FILTERS)[number]
export type IntelKindFilter = (typeof INTEL_KIND_FILTERS)[number]
export type IntelPressureFilter = (typeof INTEL_PRESSURE_FILTERS)[number]
export type IntelPressure = Exclude<IntelPressureFilter, 'all'>
export type ThreatRating = 1 | 2 | 3 | 4 | 5

export interface IntelFilters {
  q: string
  mode: IntelModeFilter
  kind: IntelKindFilter
  pressure: IntelPressureFilter
  requiredTag: string
  raidCapable: boolean
}

export interface TemplateStarterTeamView {
  teamId: string
  teamName: string
  strongestStat: StatKey
  matchingRequiredRoles: TeamCoverageRole[]
  matchingRequiredTags: string[]
  matchingPreferredTags: string[]
  odds: OutcomeOdds
}

export interface TemplateLinkView {
  templateId: string
  title: string
  trigger: 'fail' | 'unresolved' | 'incoming'
  sourceTemplateId?: string
  sourceTitle?: string
}

export interface TemplateIntelView {
  family: string
  template: CaseTemplate
  loreStub: string
  requiredRoles: TeamCoverageRole[]
  requiredTags: string[]
  preferredTags: string[]
  dominantStats: StatKey[]
  threatRating: ThreatRating
  likelyPressure: IntelPressure
  pressureSignals: string[]
  isRaidCapable: boolean
  failTargets: TemplateLinkView[]
  unresolvedTargets: TemplateLinkView[]
  incomingSignals: TemplateLinkView[]
  starterTeams: TemplateStarterTeamView[]
  starterReadyCount: number
  bestStarterSuccess: number
}

export const DEFAULT_INTEL_FILTERS: IntelFilters = {
  q: '',
  mode: 'all',
  kind: 'all',
  pressure: 'all',
  requiredTag: '',
  raidCapable: false,
}

const starterIntelGame = createIntelStartingGame()
const starterIntelPreviewState = buildResolutionPreviewState(starterIntelGame)

export function getAllIntelViews(templates: Record<string, CaseTemplate> = caseTemplateMap) {
  return Object.values(templates)
    .map((template) => getTemplateIntelView(template.templateId, templates)!)
    .sort(compareIntelViews)
}

export function getTemplateIntelView(
  templateId: string,
  templates: Record<string, CaseTemplate> = caseTemplateMap
) {
  const template = templates[templateId]

  if (!template) {
    return undefined
  }

  const previewCase = createTemplatePreviewCase(template)
  const starterTeams = Object.values(starterIntelGame.teams)
    .map((team) => {
      const capability = getCapabilitySummary(team, starterIntelGame)
      const odds = estimateOutcomeOdds(previewCase, starterIntelPreviewState, [team.id])

      return {
        teamId: team.id,
        teamName: team.name,
        strongestStat: capability.strongestStat,
        matchingRequiredRoles:
          template.requiredRoles?.filter((role) => capability.roleCoverage.includes(role)) ?? [],
        matchingRequiredTags:
          template.requiredTags?.filter((tag) => capability.coverageTags.includes(tag)) ?? [],
        matchingPreferredTags:
          template.preferredTags?.filter((tag) => capability.coverageTags.includes(tag)) ?? [],
        odds,
      }
    })
    .sort(
      (left, right) =>
        Number(left.odds.blockedByRequiredTags || left.odds.blockedByRequiredRoles) -
          Number(right.odds.blockedByRequiredTags || right.odds.blockedByRequiredRoles) ||
        right.odds.success - left.odds.success ||
        left.teamName.localeCompare(right.teamName)
    )

  return {
    family: getTemplateFamily(template.templateId),
    template,
    loreStub: CASE_LORE_STUBS[template.templateId],
    requiredRoles: [...(template.requiredRoles ?? [])],
    requiredTags: [...(template.requiredTags ?? [])],
    preferredTags: [...(template.preferredTags ?? [])],
    dominantStats: getDominantStats(template),
    threatRating: getThreatRating(template),
    likelyPressure: getLikelyPressure(template),
    pressureSignals: getPressureSignals(template),
    isRaidCapable: isRaidCapableTemplate(template),
    failTargets: mapRuleTargets(template, 'fail', template.onFail.spawnTemplateIds, templates),
    unresolvedTargets: mapRuleTargets(
      template,
      'unresolved',
      template.onUnresolved.spawnTemplateIds,
      templates
    ),
    incomingSignals: getIncomingSignals(template, templates),
    starterTeams,
    starterReadyCount: starterTeams.filter(
      (entry) => !entry.odds.blockedByRequiredTags && !entry.odds.blockedByRequiredRoles
    ).length,
    bestStarterSuccess: starterTeams.reduce((best, entry) => Math.max(best, entry.odds.success), 0),
  }
}

export function getFilteredIntelViews(
  templates: Record<string, CaseTemplate>,
  filters: IntelFilters
) {
  return getAllIntelViews(templates).filter((view) => matchesIntelFilters(view, filters))
}

export function getIntelRequiredTagOptions(views: TemplateIntelView[]) {
  return [...new Set(views.flatMap((view) => view.requiredTags))].sort((left, right) =>
    left.localeCompare(right)
  )
}

export function readIntelFilters(searchParams: URLSearchParams): IntelFilters {
  return {
    q: readStringParam(searchParams, 'q'),
    mode: readEnumParam(searchParams, 'mode', INTEL_MODE_FILTERS, DEFAULT_INTEL_FILTERS.mode),
    kind: readEnumParam(searchParams, 'kind', INTEL_KIND_FILTERS, DEFAULT_INTEL_FILTERS.kind),
    pressure: readEnumParam(
      searchParams,
      'pressure',
      INTEL_PRESSURE_FILTERS,
      DEFAULT_INTEL_FILTERS.pressure
    ),
    requiredTag: readStringParam(searchParams, 'requiredTag', 40),
    raidCapable: searchParams.get('raidCapable') === '1',
  }
}

export function writeIntelFilters(filters: IntelFilters, baseSearchParams?: URLSearchParams) {
  const nextSearchParams = new URLSearchParams(baseSearchParams)

  writeStringParam(nextSearchParams, 'q', filters.q)
  writeEnumParam(nextSearchParams, 'mode', filters.mode, DEFAULT_INTEL_FILTERS.mode)
  writeEnumParam(nextSearchParams, 'kind', filters.kind, DEFAULT_INTEL_FILTERS.kind)
  writeEnumParam(nextSearchParams, 'pressure', filters.pressure, DEFAULT_INTEL_FILTERS.pressure)
  writeStringParam(nextSearchParams, 'requiredTag', filters.requiredTag)

  if (filters.raidCapable) {
    nextSearchParams.set('raidCapable', '1')
  } else {
    nextSearchParams.delete('raidCapable')
  }

  return nextSearchParams
}

export function getTemplateFamily(templateId: string) {
  const [family] = templateId.split(/[-_]/)
  return family
}

function createIntelStartingGame(): GameState {
  const game = createStartingState()

  game.cases = {}
  game.reports = []

  Object.values(game.teams).forEach((team) => {
    if (team.status) {
      team.status.assignedCaseId = null
    }
  })

  return game
}

function createTemplatePreviewCase(template: CaseTemplate): CaseInstance {
  return {
    id: `preview:${template.templateId}`,
    templateId: template.templateId,
    title: template.title,
    description: template.description,
    mode: template.mode,
    kind: template.kind,
    status: 'open',
    difficulty: { ...template.difficulty },
    weights: { ...template.weights },
    tags: [...template.tags],
    requiredRoles: [...(template.requiredRoles ?? [])],
    requiredTags: [...(template.requiredTags ?? [])],
    preferredTags: [...(template.preferredTags ?? [])],
    stage: 1,
    durationWeeks: template.durationWeeks,
    weeksRemaining: undefined,
    deadlineWeeks: template.deadlineWeeks,
    deadlineRemaining: template.deadlineWeeks,
    pressureValue: template.pressureValue ?? inferCasePressureValue(template),
    regionTag: template.regionTag ?? inferCaseRegionTag(template),
    assignedTeamIds: [],
    onFail: {
      ...template.onFail,
      spawnCount: { ...template.onFail.spawnCount },
      spawnTemplateIds: [...template.onFail.spawnTemplateIds],
    },
    onUnresolved: {
      ...template.onUnresolved,
      spawnCount: { ...template.onUnresolved.spawnCount },
      spawnTemplateIds: [...template.onUnresolved.spawnTemplateIds],
    },
    raid: template.raid ? { ...template.raid } : undefined,
  }
}

function mapRuleTargets(
  template: CaseTemplate,
  trigger: 'fail' | 'unresolved',
  templateIds: string[],
  templates: Record<string, CaseTemplate>
) {
  return [...new Set(templateIds)]
    .map<TemplateLinkView | undefined>((targetId) => {
      const target = templates[targetId]

      if (!target) {
        return undefined
      }

      return {
        templateId: target.templateId,
        title: target.title,
        trigger,
        sourceTemplateId: template.templateId,
        sourceTitle: template.title,
      }
    })
    .filter(isDefined)
    .sort((left, right) => left.title.localeCompare(right.title))
}

function getIncomingSignals(template: CaseTemplate, templates: Record<string, CaseTemplate>) {
  return Object.values(templates)
    .flatMap((candidate) => {
      const links: TemplateLinkView[] = []

      if (candidate.onFail.spawnTemplateIds.includes(template.templateId)) {
        links.push({
          templateId: candidate.templateId,
          title: candidate.title,
          trigger: 'incoming',
          sourceTemplateId: candidate.templateId,
          sourceTitle: `${candidate.title} (fail)`,
        })
      }

      if (candidate.onUnresolved.spawnTemplateIds.includes(template.templateId)) {
        links.push({
          templateId: candidate.templateId,
          title: candidate.title,
          trigger: 'incoming',
          sourceTemplateId: candidate.templateId,
          sourceTitle: `${candidate.title} (unresolved)`,
        })
      }

      return links
    })
    .sort((left, right) => left.title.localeCompare(right.title))
}

function getRulePressureScore(rule: CaseTemplate['onFail']) {
  return rule.stageDelta * 2 + rule.spawnCount.max + (rule.convertToRaidAtStage ? 2 : 0)
}

function getLikelyPressure(template: CaseTemplate): IntelPressure {
  const unresolvedBias = template.deadlineWeeks <= 2 ? 2 : template.deadlineWeeks <= 3 ? 1 : 0
  const score = Math.max(
    getRulePressureScore(template.onFail),
    getRulePressureScore(template.onUnresolved) + unresolvedBias
  )

  if (score >= 9) {
    return 'critical'
  }

  if (score >= 6) {
    return 'severe'
  }

  if (score >= 4) {
    return 'elevated'
  }

  return 'routine'
}

function getPressureSignals(template: CaseTemplate) {
  const signals = [
    `Deadline ${template.deadlineWeeks} week${template.deadlineWeeks === 1 ? '' : 's'}`,
  ]

  if (template.onFail.stageDelta > 0) {
    signals.push(`Fail adds ${template.onFail.stageDelta} stage`)
  }

  if (template.onUnresolved.stageDelta > 0) {
    signals.push(`Unresolved adds ${template.onUnresolved.stageDelta} stage`)
  }

  if (template.onUnresolved.spawnCount.max > 0) {
    signals.push(
      `Unresolved can spawn up to ${template.onUnresolved.spawnCount.max} follow-up cases`
    )
  }

  const convertStage =
    template.onUnresolved.convertToRaidAtStage ?? template.onFail.convertToRaidAtStage

  if (convertStage !== undefined) {
    signals.push(`Raid conversion at Stage ${convertStage}`)
  } else if (template.kind === 'raid') {
    signals.push('Starts as a raid template')
  }

  return signals
}

function getThreatRating(template: CaseTemplate): ThreatRating {
  const weightedDifficulty = STAT_KEYS.reduce(
    (sum, key) => sum + template.difficulty[key] * Math.max(template.weights[key], 0.4),
    0
  )
  const escalationPressure = Math.max(
    getRulePressureScore(template.onFail),
    getRulePressureScore(template.onUnresolved)
  )
  const score =
    weightedDifficulty / 85 +
    template.durationWeeks * 0.35 +
    Math.max(0, 4 - template.deadlineWeeks) * 0.6 +
    (template.kind === 'raid' ? 1 : 0) +
    (template.requiredRoles?.length ?? 0) * 0.55 +
    (template.requiredTags?.length ?? 0) * 0.45 +
    escalationPressure * 0.2

  if (score >= 8.8) {
    return 5
  }

  if (score >= 7) {
    return 4
  }

  if (score >= 5.4) {
    return 3
  }

  if (score >= 3.8) {
    return 2
  }

  return 1
}

function getDominantStats(template: CaseTemplate) {
  const ordered = [...STAT_KEYS].sort((left, right) => {
    const leftScore = template.difficulty[left] * template.weights[left]
    const rightScore = template.difficulty[right] * template.weights[right]
    return rightScore - leftScore
  })

  return ordered.filter((key, index) => {
    if (index === 0) {
      return true
    }

    const previousKey = ordered[index - 1]!
    const previousScore = template.difficulty[previousKey] * template.weights[previousKey]
    const currentScore = template.difficulty[key] * template.weights[key]

    return previousScore - currentScore <= 10
  })
}

function isRaidCapableTemplate(template: CaseTemplate) {
  return (
    template.kind === 'raid' ||
    template.onFail.convertToRaidAtStage !== undefined ||
    template.onUnresolved.convertToRaidAtStage !== undefined
  )
}

function matchesIntelFilters(view: TemplateIntelView, filters: IntelFilters) {
  if (filters.mode !== 'all' && view.template.mode !== filters.mode) {
    return false
  }

  if (filters.kind !== 'all' && view.template.kind !== filters.kind) {
    return false
  }

  if (filters.pressure !== 'all' && view.likelyPressure !== filters.pressure) {
    return false
  }

  if (filters.requiredTag && !view.requiredTags.includes(filters.requiredTag)) {
    return false
  }

  if (filters.raidCapable && !view.isRaidCapable) {
    return false
  }

  if (!filters.q) {
    return true
  }

  const normalized = filters.q.toLowerCase()
  const haystack = [
    view.template.templateId,
    view.template.title,
    view.template.description,
    view.family,
    view.loreStub ?? '',
    view.template.tags.join(' '),
    view.requiredRoles.join(' '),
    view.requiredTags.join(' '),
    view.preferredTags.join(' '),
    view.failTargets.map((entry) => `${entry.templateId} ${entry.title}`).join(' '),
    view.unresolvedTargets.map((entry) => `${entry.templateId} ${entry.title}`).join(' '),
    view.incomingSignals.map((entry) => `${entry.templateId} ${entry.title}`).join(' '),
  ]
    .join(' ')
    .toLowerCase()

  return haystack.includes(normalized)
}

function compareIntelViews(left: TemplateIntelView, right: TemplateIntelView) {
  return (
    right.threatRating - left.threatRating ||
    pressureOrder(right.likelyPressure) - pressureOrder(left.likelyPressure) ||
    right.bestStarterSuccess - left.bestStarterSuccess ||
    left.template.title.localeCompare(right.template.title)
  )
}

function pressureOrder(pressure: IntelPressure) {
  if (pressure === 'critical') {
    return 4
  }

  if (pressure === 'severe') {
    return 3
  }

  if (pressure === 'elevated') {
    return 2
  }

  return 1
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined
}
