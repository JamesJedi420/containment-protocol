import type { DomainStats } from '../agent/models'

export type CandidateCategory = 'agent' | 'staff' | 'specialist' | 'fieldTech' | 'analyst' | 'instructor'

export type CandidatePipelineStatus = 'available' | 'reserved' | 'expired' | 'candidate'

export type CandidateCostEstimate = 'low' | 'moderate' | 'high' | 'unknown'

export type CandidateRevealLevel = 0 | 1 | 2

export type CandidatePotentialTier = 'low' | 'mid' | 'high'

export type AgentCandidateRole =
  | 'field'
  | 'analyst'
  | 'containment'
  | 'support'
  | 'combat'
  | 'investigation'

export interface CandidateLegacyStats {
  combat: number
  investigation: number
  utility: number
  social: number
}

export interface CandidateBase {
  id: string
  name: string
  age: number
  portraitId?: string

  category: CandidateCategory
  hireStatus: CandidatePipelineStatus

  weeklyCost?: number
  weeklyWage?: number
  costEstimate?: CandidateCostEstimate

  revealLevel: CandidateRevealLevel
  expiryWeek: number
}

export interface CandidateEvaluation {
  overallVisible: boolean
  overall?: number
  overallValue?: number

  potentialVisible: boolean
  potentialTier?: CandidatePotentialTier

  rumorTags: string[]
  impression?: string
  teamwork?: string
  outlook?: string
}

export interface AgentCandidateData {
  role: AgentCandidateRole
  specialization: string
  domainStats?: Partial<DomainStats>
  visibleDomainStats?: Partial<DomainStats>
  traits: string[]
  growthProfile?: string

  // Compatibility bridge for the existing flat-stat recruitment UI/tests.
  stats?: CandidateLegacyStats
  visibleStats?: Partial<CandidateLegacyStats>
}

export type StaffCandidateSpecialty =
  | 'intel'
  | 'logistics'
  | 'fabrication'
  | 'analysis'
  | 'intelligence'

export interface StaffCandidateData {
  specialty: StaffCandidateSpecialty
  efficiency?: number
  visibleEfficiency?: number
  assignmentType?: string
  passiveBonuses?: Record<string, number>
}

export interface SpecialistCandidateData {
  specialty: string
  efficiency?: number
  focus?: string
}

export type InstructorStatKey = 'combat' | 'investigation' | 'utility' | 'social'

export interface InstructorCandidateData {
  instructorSpecialty: InstructorStatKey
  efficiency: number
  visibleEfficiency?: number
}

export type Candidate =
  | (CandidateBase & {
      category: 'agent'
      evaluation: CandidateEvaluation
      agentData: AgentCandidateData
      staffData?: undefined
      specialistData?: undefined
      instructorData?: undefined
    })
  | (CandidateBase & {
      category: 'staff'
      evaluation: CandidateEvaluation
      agentData?: undefined
      staffData: StaffCandidateData
      specialistData?: undefined
      instructorData?: undefined
    })
  | (CandidateBase & {
      category: 'specialist' | 'fieldTech' | 'analyst'
      evaluation: CandidateEvaluation
      agentData?: undefined
      staffData?: undefined
      specialistData?: SpecialistCandidateData
      instructorData?: undefined
    })
  | (CandidateBase & {
      category: 'instructor'
      evaluation: CandidateEvaluation
      agentData?: undefined
      staffData?: undefined
      specialistData?: undefined
      instructorData: InstructorCandidateData
    })
