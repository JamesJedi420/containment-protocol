import { describe, expect, it } from 'vitest'
import {
  FUTURE_EXPANSION_APP_SYSTEMS,
  PRIMARY_APP_SYSTEMS,
  SECONDARY_MVP_APP_SYSTEMS,
} from './systemRegistry'
import { APP_SHELL_STATIC_ROUTE_PATHS, navPathToShellSegment } from './appShellRoutePaths'

const NAV_VISIBLE_APP_SYSTEMS = [
  ...PRIMARY_APP_SYSTEMS,
  ...SECONDARY_MVP_APP_SYSTEMS,
  ...FUTURE_EXPANSION_APP_SYSTEMS,
] as const

describe('app route nav parity', () => {
  it.each(NAV_VISIBLE_APP_SYSTEMS.map((system) => [system.label, system.to] as const))(
    'registers an App shell route for nav-visible system %s (%s)',
    (_label, to) => {
      const segment = navPathToShellSegment(to)
      expect(APP_SHELL_STATIC_ROUTE_PATHS).toContain(segment)
    }
  )
})
