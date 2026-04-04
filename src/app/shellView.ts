import { matchPath } from 'react-router'
import { calcWeekScore } from '../domain/sim/scoring'
import { getTeamAssignedCaseId, getTeamMemberIds } from '../domain/teamSimulation'
import {
  AGENCY_LABELS,
  CASE_UI_LABELS,
  DASHBOARD_HEADLINE,
  EMPTY_STATES,
  INTEL_UI_TEXT,
  MARKET_UI_TEXT,
  NAVIGATION_ROUTES,
  REPORT_LABELS,
  REPORT_UI_TEXT,
  ROLE_LABELS,
  SHELL_UI_TEXT,
  TEAM_UI_LABELS,
} from '../data/copy'
import { type GameState } from '../domain/models'
import { APP_ROUTES, APP_ROUTE_PATTERNS } from './routes'

export interface ShellMeta {
  title: string
  subtitle?: string
  backTo?: string
  backLabel?: string
}

export function getShellMeta(pathname: string, search: string, game: GameState): ShellMeta {
  const agentMatch = matchPath(APP_ROUTE_PATTERNS.agentDetail, pathname)
  const registryAgentMatch = matchPath(APP_ROUTE_PATTERNS.registryDetail, pathname)

  if (agentMatch) {
    const detailMeta = getAgentDetailMeta(game, agentMatch.params.agentId)

    return {
      title: detailMeta.title,
      subtitle: detailMeta.subtitle,
      backTo: `${APP_ROUTES.agents}${search}`,
      backLabel: createBackLabel(NAVIGATION_ROUTES.agents.label),
    }
  }

  if (registryAgentMatch) {
    const detailMeta = getAgentDetailMeta(game, registryAgentMatch.params.agentId)

    return {
      title: detailMeta.title,
      subtitle: detailMeta.subtitle,
      backTo: `${APP_ROUTES.registry}${search}`,
      backLabel: createBackLabel(NAVIGATION_ROUTES.registry.label),
    }
  }

  const caseMatch = matchPath(APP_ROUTE_PATTERNS.caseDetail, pathname)

  if (caseMatch) {
    const currentCase = game.cases[caseMatch.params.caseId ?? '']
    return {
      title: currentCase ? currentCase.title : SHELL_UI_TEXT.caseNotFoundTitle,
      subtitle: currentCase ? currentCase.description : SHELL_UI_TEXT.caseNotFoundMessage,
      backTo: `${APP_ROUTES.cases}${search}`,
      backLabel: createBackLabel(NAVIGATION_ROUTES.cases.label),
    }
  }

  const teamMatch = matchPath(APP_ROUTE_PATTERNS.teamDetail, pathname)

  if (teamMatch) {
    const team = game.teams[teamMatch.params.teamId ?? '']
    const assignedCaseId = team ? getTeamAssignedCaseId(team) : null
    const assignedCase = assignedCaseId ? game.cases[assignedCaseId] : undefined

    return {
      title: team ? `${AGENCY_LABELS.responseUnit} ${team.name}` : SHELL_UI_TEXT.teamNotFoundTitle,
      subtitle: team
        ? assignedCase
          ? `${CASE_UI_LABELS.assignedTo}: ${assignedCase.title}`
          : EMPTY_STATES.noAssignment
        : SHELL_UI_TEXT.teamNotFoundMessage,
      backTo: `${APP_ROUTES.teams}${search}`,
      backLabel: createBackLabel(NAVIGATION_ROUTES.teams.label),
    }
  }

  const reportMatch = matchPath(APP_ROUTE_PATTERNS.reportDetail, pathname)

  if (reportMatch) {
    const week = Number(reportMatch.params.week)
    const report = Number.isInteger(week)
      ? game.reports.find((entry) => entry.week === week)
      : undefined
    const score = report ? calcWeekScore(report) : undefined

    return {
      title: report ? `${REPORT_LABELS.week} ${report.week}` : SHELL_UI_TEXT.reportNotFoundTitle,
      subtitle: report
        ? `${score! >= 0 ? '+' : ''}${score} ${REPORT_LABELS.points}`
        : SHELL_UI_TEXT.reportNotFoundMessage,
      backTo: `${APP_ROUTES.report}${search}`,
      backLabel: createBackLabel(NAVIGATION_ROUTES.report.label),
    }
  }

  const intelMatch = matchPath(APP_ROUTE_PATTERNS.intelDetail, pathname)

  if (intelMatch) {
    const template = game.templates[intelMatch.params.templateId ?? '']

    return {
      title: template ? template.title : SHELL_UI_TEXT.intelNotFoundTitle,
      subtitle: template ? template.description : SHELL_UI_TEXT.intelNotFoundMessage,
      backTo: `${APP_ROUTES.intel}${search}`,
      backLabel: createBackLabel(NAVIGATION_ROUTES.intel.label),
    }
  }

  if (pathname === APP_ROUTES.cases) {
    return {
      title: NAVIGATION_ROUTES.cases.label,
      subtitle: CASE_UI_LABELS.caseSubtitle,
      backTo: APP_ROUTES.operationsDesk,
      backLabel: createBackLabel(NAVIGATION_ROUTES.operationsDesk.label),
    }
  }

  if (pathname === APP_ROUTES.cards) {
    return {
      title: NAVIGATION_ROUTES.cards.label,
      subtitle: 'Queue and deploy tactical Party-card modifiers for weekly operations.',
      backTo: APP_ROUTES.operationsDesk,
      backLabel: createBackLabel(NAVIGATION_ROUTES.operationsDesk.label),
    }
  }

  if (pathname === APP_ROUTES.agents) {
    return {
      title: NAVIGATION_ROUTES.agents.label,
      subtitle: 'Operational roster view for readiness, traits, fatigue, and training posture.',
      backTo: APP_ROUTES.operationsDesk,
      backLabel: createBackLabel(NAVIGATION_ROUTES.operationsDesk.label),
    }
  }

  if (pathname === APP_ROUTES.teams) {
    return {
      title: NAVIGATION_ROUTES.teams.label,
      subtitle: TEAM_UI_LABELS.teamSubtitle,
      backTo: APP_ROUTES.operationsDesk,
      backLabel: createBackLabel(NAVIGATION_ROUTES.operationsDesk.label),
    }
  }

  if (pathname === APP_ROUTES.recruitment) {
    return {
      title: NAVIGATION_ROUTES.recruitment.label,
      subtitle:
        'Candidate intake, hiring pressure, and expiry windows from the live weekly pipeline.',
      backTo: APP_ROUTES.operationsDesk,
      backLabel: createBackLabel(NAVIGATION_ROUTES.operationsDesk.label),
    }
  }

  if (pathname === APP_ROUTES.registry) {
    return {
      title: NAVIGATION_ROUTES.registry.label,
      subtitle: 'Agent records, traits, and assignment readiness.',
      backTo: APP_ROUTES.operationsDesk,
      backLabel: createBackLabel(NAVIGATION_ROUTES.operationsDesk.label),
    }
  }

  if (pathname === APP_ROUTES.trainingDivision) {
    return {
      title: NAVIGATION_ROUTES.trainingDivision.label,
      subtitle: 'Projected training throughput and assignment coverage.',
      backTo: APP_ROUTES.operationsDesk,
      backLabel: createBackLabel(NAVIGATION_ROUTES.operationsDesk.label),
    }
  }

  if (pathname === APP_ROUTES.equipment) {
    return {
      title: NAVIGATION_ROUTES.equipment.label,
      subtitle: 'Equipment posture from fabrication output and inventory.',
      backTo: APP_ROUTES.operationsDesk,
      backLabel: createBackLabel(NAVIGATION_ROUTES.operationsDesk.label),
    }
  }

  if (pathname === APP_ROUTES.fabrication) {
    return {
      title: NAVIGATION_ROUTES.fabrication.label,
      subtitle: 'Time-based queue for gear crafting and research output.',
      backTo: APP_ROUTES.operationsDesk,
      backLabel: createBackLabel(NAVIGATION_ROUTES.operationsDesk.label),
    }
  }

  if (pathname === APP_ROUTES.containmentSite) {
    return {
      title: NAVIGATION_ROUTES.containmentSite.label,
      subtitle: 'Site pressure and active-case load across containment ops.',
      backTo: APP_ROUTES.operationsDesk,
      backLabel: createBackLabel(NAVIGATION_ROUTES.operationsDesk.label),
    }
  }

  if (pathname === APP_ROUTES.marketsSuppliers) {
    return {
      title: NAVIGATION_ROUTES.marketsSuppliers.label,
      subtitle: MARKET_UI_TEXT.pageSubtitle,
      backTo: APP_ROUTES.operationsDesk,
      backLabel: createBackLabel(NAVIGATION_ROUTES.operationsDesk.label),
    }
  }

  if (pathname === APP_ROUTES.factions) {
    return {
      title: NAVIGATION_ROUTES.factions.label,
      subtitle: 'Watch external actor activity that shifts case pressure.',
      backTo: APP_ROUTES.operationsDesk,
      backLabel: createBackLabel(NAVIGATION_ROUTES.operationsDesk.label),
    }
  }

  if (pathname === APP_ROUTES.rankings) {
    return {
      title: NAVIGATION_ROUTES.rankings.label,
      subtitle: 'Campaign performance and containment stability benchmarks.',
      backTo: APP_ROUTES.operationsDesk,
      backLabel: createBackLabel(NAVIGATION_ROUTES.operationsDesk.label),
    }
  }

  if (pathname === APP_ROUTES.agency) {
    return {
      title: NAVIGATION_ROUTES.agency.label,
      subtitle: 'Agency-wide status, governance, and strategic directives.',
      backTo: APP_ROUTES.operationsDesk,
      backLabel: createBackLabel(NAVIGATION_ROUTES.operationsDesk.label),
    }
  }

  if (pathname === APP_ROUTES.report) {
    return {
      title: NAVIGATION_ROUTES.report.label,
      subtitle: REPORT_UI_TEXT.pageSubtitle,
      backTo: APP_ROUTES.operationsDesk,
      backLabel: createBackLabel(NAVIGATION_ROUTES.operationsDesk.label),
    }
  }

  if (pathname === APP_ROUTES.intel) {
    return {
      title: NAVIGATION_ROUTES.intel.label,
      subtitle: INTEL_UI_TEXT.pageSubtitle,
      backTo: APP_ROUTES.operationsDesk,
      backLabel: createBackLabel(NAVIGATION_ROUTES.operationsDesk.label),
    }
  }

  return {
    title: DASHBOARD_HEADLINE.title,
    subtitle: DASHBOARD_HEADLINE.weekLabel
      .replace('{week}', String(game.week))
      .replace('{cap}', String(game.config.maxActiveCases)),
  }
}

function createBackLabel(label: string) {
  return SHELL_UI_TEXT.backToTemplate.replace('{label}', label)
}

function getAgentDetailMeta(
  game: GameState,
  agentId?: string
): Pick<ShellMeta, 'title' | 'subtitle'> {
  const agent = game.agents[agentId ?? '']
  const team = agent
    ? Object.values(game.teams).find((currentTeam) =>
        getTeamMemberIds(currentTeam).includes(agent.id)
      )
    : undefined
  const assignedCaseId = team ? getTeamAssignedCaseId(team) : null
  const assignedCase = assignedCaseId ? game.cases[assignedCaseId] : undefined

  return {
    title: agent ? agent.name : SHELL_UI_TEXT.agentNotFoundTitle,
    subtitle: agent
      ? assignedCase
        ? `${CASE_UI_LABELS.assignedTo}: ${assignedCase.title}`
        : `${ROLE_LABELS[agent.role]} / Fatigue ${agent.fatigue}`
      : SHELL_UI_TEXT.agentNotFoundMessage,
  }
}
