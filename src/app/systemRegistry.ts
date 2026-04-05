import { NAVIGATION_ROUTES } from '../data/copy'

export type AppSystemId =
  | 'operationsDesk'
  | 'agents'
  | 'cards'
  | 'recruitment'
  | 'cases'
  | 'registry'
  | 'teams'
  | 'trainingDivision'
  | 'equipment'
  | 'fabrication'
  | 'containmentSite'
  | 'marketsSuppliers'
  | 'factions'
  | 'rankings'
  | 'agency'
  | 'report'
  | 'intel'

export type AppSystemPhase = 'mvp' | 'future'
export type AppSystemSurface = 'primary' | 'secondary'

export interface AppSystemDefinition {
  id: AppSystemId
  to: string
  label: string
  phase: AppSystemPhase
  surface: AppSystemSurface
}

export const APP_SYSTEM_REGISTRY: Record<AppSystemId, AppSystemDefinition> = {
  operationsDesk: {
    id: 'operationsDesk',
    ...NAVIGATION_ROUTES.operationsDesk,
    phase: 'mvp',
    surface: 'primary',
  },
  cases: {
    id: 'cases',
    ...NAVIGATION_ROUTES.cases,
    phase: 'mvp',
    surface: 'primary',
  },
  agents: {
    id: 'agents',
    ...NAVIGATION_ROUTES.agents,
    phase: 'mvp',
    surface: 'primary',
  },
  recruitment: {
    id: 'recruitment',
    ...NAVIGATION_ROUTES.recruitment,
    phase: 'mvp',
    surface: 'primary',
  },
  cards: {
    id: 'cards',
    ...NAVIGATION_ROUTES.cards,
    phase: 'mvp',
    surface: 'secondary',
  },
  teams: {
    id: 'teams',
    ...NAVIGATION_ROUTES.teams,
    phase: 'mvp',
    surface: 'secondary',
  },
  equipment: {
    id: 'equipment',
    ...NAVIGATION_ROUTES.equipment,
    phase: 'mvp',
    surface: 'secondary',
  },
  fabrication: {
    id: 'fabrication',
    ...NAVIGATION_ROUTES.fabrication,
    phase: 'mvp',
    surface: 'secondary',
  },
  report: {
    id: 'report',
    ...NAVIGATION_ROUTES.report,
    phase: 'mvp',
    surface: 'secondary',
  },
  registry: {
    id: 'registry',
    ...NAVIGATION_ROUTES.registry,
    phase: 'future',
    surface: 'secondary',
  },
  trainingDivision: {
    id: 'trainingDivision',
    ...NAVIGATION_ROUTES.trainingDivision,
    phase: 'mvp',
    surface: 'secondary',
  },
  containmentSite: {
    id: 'containmentSite',
    ...NAVIGATION_ROUTES.containmentSite,
    phase: 'future',
    surface: 'secondary',
  },
  marketsSuppliers: {
    id: 'marketsSuppliers',
    ...NAVIGATION_ROUTES.marketsSuppliers,
    phase: 'future',
    surface: 'secondary',
  },
  factions: {
    id: 'factions',
    ...NAVIGATION_ROUTES.factions,
    phase: 'future',
    surface: 'secondary',
  },
  rankings: {
    id: 'rankings',
    ...NAVIGATION_ROUTES.rankings,
    phase: 'future',
    surface: 'secondary',
  },
  agency: {
    id: 'agency',
    ...NAVIGATION_ROUTES.agency,
    phase: 'future',
    surface: 'secondary',
  },
  intel: {
    id: 'intel',
    ...NAVIGATION_ROUTES.intel,
    phase: 'future',
    surface: 'secondary',
  },
}

export const PRIMARY_APP_SYSTEMS = [
  APP_SYSTEM_REGISTRY.operationsDesk,
  APP_SYSTEM_REGISTRY.cases,
  APP_SYSTEM_REGISTRY.agents,
  APP_SYSTEM_REGISTRY.recruitment,
] as const

export const SECONDARY_MVP_APP_SYSTEMS = [
  APP_SYSTEM_REGISTRY.cards,
  APP_SYSTEM_REGISTRY.teams,
  APP_SYSTEM_REGISTRY.trainingDivision,
  APP_SYSTEM_REGISTRY.equipment,
  APP_SYSTEM_REGISTRY.fabrication,
  APP_SYSTEM_REGISTRY.report,
] as const

export const FUTURE_EXPANSION_APP_SYSTEMS = [
  APP_SYSTEM_REGISTRY.registry,
  APP_SYSTEM_REGISTRY.containmentSite,
  APP_SYSTEM_REGISTRY.marketsSuppliers,
  APP_SYSTEM_REGISTRY.factions,
  APP_SYSTEM_REGISTRY.rankings,
  APP_SYSTEM_REGISTRY.agency,
  APP_SYSTEM_REGISTRY.intel,
] as const
