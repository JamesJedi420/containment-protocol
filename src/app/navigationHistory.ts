import { matchRoutes } from 'react-router'
import type { GameState } from '../domain/models'
import { APP_ROUTES, APP_ROUTE_PATTERNS } from './routes'

export interface NavigationEntry {
  key: string
  pathname: string
  search: string
  hash: string
}

export interface NavigationHistory {
  entries: NavigationEntry[]
  index: number
}

export const NAVIGATION_HISTORY_LIMIT = 100

function copyEntry({ key, pathname, search, hash }: NavigationEntry): NavigationEntry {
  return { key, pathname, search, hash }
}

export function startNavigationHistory(entry: NavigationEntry): NavigationHistory {
  return { entries: [copyEntry(entry)], index: 0 }
}

/** Observe router commits; never write browser history or copy arbitrary location.state. */
export function observeNavigation(
  history: NavigationHistory,
  entry: NavigationEntry,
  action: 'PUSH' | 'REPLACE' | 'POP'
): NavigationHistory {
  if (history.entries[history.index]?.key === entry.key) return history
  if (action === 'POP') {
    const index = history.entries.findIndex((candidate) => candidate.key === entry.key)
    // An unseen browser entry has no trustworthy relative position in this session.
    return index < 0 ? startNavigationHistory(entry) : { ...history, index }
  }
  if (action === 'REPLACE') {
    const entries = history.entries.slice()
    entries[history.index] = copyEntry(entry)
    return { entries, index: history.index }
  }
  const entries = [...history.entries.slice(0, history.index + 1), copyEntry(entry)].slice(
    -NAVIGATION_HISTORY_LIMIT
  )
  return { entries, index: entries.length - 1 }
}

export function findNavigationDelta(
  history: NavigationHistory,
  direction: -1 | 1,
  available: (entry: NavigationEntry) => boolean
): number | null {
  for (
    let index = history.index + direction;
    index >= 0 && index < history.entries.length;
    index += direction
  ) {
    if (available(history.entries[index])) return index - history.index
  }
  return null
}

const staticPaths = new Set<string>(
  Object.values(APP_ROUTES).filter((route) => typeof route === 'string')
)
const routeDefinitions = [...staticPaths, ...Object.values(APP_ROUTE_PATTERNS)].map((path) => ({
  path,
}))

/** Use the existing route definitions and the same entity existence checks as detail pages. */
export function isNavigationDestinationAvailable(pathname: string, game: GameState): boolean {
  // Reject malformed encoding without emitting router warnings during an availability check.
  try {
    decodeURIComponent(pathname)
  } catch {
    return false
  }
  const match = matchRoutes(routeDefinitions, { pathname })?.at(-1)
  if (!match) return false
  const { params, route } = match
  switch (route.path) {
    case APP_ROUTE_PATTERNS.agentDetail:
    case APP_ROUTE_PATTERNS.registryDetail:
      return Object.hasOwn(game.agents, params.agentId ?? '')
    case APP_ROUTE_PATTERNS.caseDetail:
      return Object.hasOwn(game.cases, params.caseId ?? '')
    case APP_ROUTE_PATTERNS.teamDetail:
      return Object.hasOwn(game.teams, params.teamId ?? '')
    case APP_ROUTE_PATTERNS.intelDetail:
      return Object.hasOwn(game.templates, params.templateId ?? '')
    case APP_ROUTE_PATTERNS.reportDetail: {
      const week = Number(params.week)
      return Number.isInteger(week) && game.reports.some((report) => report.week === week)
    }
    default:
      return true
  }
}
