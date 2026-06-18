/**
 * Static path segments registered under AppShell in App.tsx.
 * Used by route/nav parity tests; update when adding or removing shell routes.
 */
export const APP_SHELL_STATIC_ROUTE_PATHS = [
  '',
  'contracts',
  'agents',
  'recruitment',
  'cards',
  'registry',
  'cases',
  'teams',
  'training-division',
  'equipment',
  'fabrication',
  'containment-site',
  'markets-suppliers',
  'factions',
  'rankings',
  'agency',
  'help',
  'report',
  'intel',
  'pattern-source-series',
  'publish-queue',
  'self-censoring-information',
  'public-disclosure-state',
  'campaign/public-disclosure',
  'truth-layer-records',
  'cover-story-records',
  'mass-anomalous-population-emergence',
  'visual-trigger-hazard',
  'entity-welfare-reclassification',
  'contained-person-therapeutic-care',
  'contained-person-integrated-health-bundle',
  'welfare-debt-accounting',
] as const

export function navPathToShellSegment(path: string): string {
  if (path === '/') {
    return ''
  }

  return path.startsWith('/') ? path.slice(1) : path
}
