import { describe, expect, it } from 'vitest'
import {
  CASE_UI_LABELS,
  DASHBOARD_PRESET_LABELS,
  INTEL_UI_TEXT,
  REPORT_UI_TEXT,
  SHELL_UI_TEXT,
  TEAM_UI_LABELS,
  TOOLTIPS,
} from '../data/copy'

const REQUIRED_TOOLTIP_KEYS = [
  'mode.threshold',
  'mode.probability',
  'mode.deterministic',
  'case.stage',
  'case.deadline',
  'case.duration',
  'case.weeksRemaining',
  'case.bestOdds',
  'team.fatigue',
  'agent.role',
  'case.lore',
  'report.notes',
] as const

describe('copy contracts', () => {
  it('defines all tooltip keys used by feature views', () => {
    for (const key of REQUIRED_TOOLTIP_KEYS) {
      expect(TOOLTIPS).toHaveProperty(key)
      expect(TOOLTIPS[key]).toBeTypeOf('string')
      expect(TOOLTIPS[key].trim().length).toBeGreaterThan(0)
    }
  })

  it('defines dashboard preset labels used by simulation controls', () => {
    for (const key of ['forgiving', 'standard', 'nightmare'] as const) {
      expect(DASHBOARD_PRESET_LABELS).toHaveProperty(key)
      expect(DASHBOARD_PRESET_LABELS[key]).toBeTypeOf('string')
      expect(DASHBOARD_PRESET_LABELS[key].trim().length).toBeGreaterThan(0)
    }
  })

  it('defines shell and detail fallback labels used across detail routes', () => {
    for (const key of [
      'caseNotFoundTitle',
      'teamNotFoundTitle',
      'reportNotFoundTitle',
      'caseNotFoundMessage',
      'teamNotFoundMessage',
      'reportNotFoundMessage',
      'intelNotFoundTitle',
      'intelNotFoundMessage',
      'backToTemplate',
      'none',
    ] as const) {
      expect(SHELL_UI_TEXT).toHaveProperty(key)
      expect(SHELL_UI_TEXT[key]).toBeTypeOf('string')
      expect(SHELL_UI_TEXT[key].trim().length).toBeGreaterThan(0)
    }

    for (const key of [
      'caseDossier',
      'kind',
      'kindCase',
      'kindRaid',
      'teamsRequired',
      'notStarted',
      'stagePrefix',
      'noAssignedTeam',
      'assignedTeams',
      'operationalTags',
      'availableTeamOdds',
      'raidAtCapacityHint',
      'eligibleTeamsHint',
      'noEligibleResponseUnits',
      'resolvedNoNewAssignments',
      'noArchivedLoreStub',
    ] as const) {
      expect(CASE_UI_LABELS).toHaveProperty(key)
      expect(CASE_UI_LABELS[key]).toBeTypeOf('string')
      expect(CASE_UI_LABELS[key].trim().length).toBeGreaterThan(0)
    }

    for (const key of [
      'pageHeading',
      'pageSubtitle',
      'searchLabel',
      'searchPlaceholder',
      'modeLabel',
      'kindLabel',
      'pressureLabel',
      'requiredTagLabel',
      'raidCapableLabel',
      'allModes',
      'allKinds',
      'allPressure',
      'allRequiredTags',
      'noMatches',
      'showingResults',
      'templateId',
      'family',
      'threatRating',
      'likelyPressure',
      'overview',
      'loreStub',
      'noLoreStub',
      'escalationOnFail',
      'escalationOnUnresolved',
      'incomingSignals',
      'noEscalationTargets',
      'noIncomingSignals',
      'stageDelta',
      'spawnCount',
      'convertsAt',
      'directRaidTemplate',
      'starterCoverage',
      'starterCoverageHint',
      'starterCoverageReady',
      'starterCoverageBlocked',
      'dominantStats',
    ] as const) {
      expect(INTEL_UI_TEXT).toHaveProperty(key)
      expect(INTEL_UI_TEXT[key]).toBeTypeOf('string')
      expect(INTEL_UI_TEXT[key].trim().length).toBeGreaterThan(0)
    }

    for (const key of [
      'agents',
      'coreCoverage',
      'currentAssignment',
      'capabilitySummary',
      'derivedFromRosterOnly',
      'noActiveAgentsAssigned',
      'noTagCoverage',
    ] as const) {
      expect(TEAM_UI_LABELS).toHaveProperty(key)
      expect(TEAM_UI_LABELS[key]).toBeTypeOf('string')
      expect(TEAM_UI_LABELS[key].trim().length).toBeGreaterThan(0)
    }

    for (const key of [
      'noNotesWeek',
      'spawnedCasesHeader',
      'resolvedCasesHeader',
      'failedCasesHeader',
      'unresolvedCasesHeader',
      'noSpawnedCases',
      'noResolvedCases',
      'noFailedCases',
      'noUnresolvedCases',
    ] as const) {
      expect(REPORT_UI_TEXT).toHaveProperty(key)
      expect(REPORT_UI_TEXT[key]).toBeTypeOf('string')
      expect(REPORT_UI_TEXT[key].trim().length).toBeGreaterThan(0)
    }
  })
})
