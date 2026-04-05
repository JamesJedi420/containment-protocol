import type { AgentData, AgentRole } from '../models'
import type { Candidate } from './types'

export function mapRecruitRoleToAgentRole(
  specialization: string,
  recruitRole: AgentData['role']
): AgentRole {
  const normalizedSpecialization = specialization.trim().toLowerCase()

  if (
    normalizedSpecialization.includes('recon') ||
    normalizedSpecialization.includes('path') ||
    normalizedSpecialization.includes('survey') ||
    normalizedSpecialization.includes('intercept')
  ) {
    return 'field_recon'
  }

  if (recruitRole === 'field' || recruitRole === 'combat') {
    return 'hunter'
  }

  if (recruitRole === 'containment') {
    return specialization.includes('anomaly') || specialization.includes('ward')
      ? 'occultist'
      : 'medium'
  }

  if (recruitRole === 'analyst' || recruitRole === 'investigation') {
    return specialization.includes('signal') ? 'tech' : 'investigator'
  }

  if (specialization.includes('medical')) {
    return 'medic'
  }

  if (specialization.includes('liaison')) {
    return 'negotiator'
  }

  return 'tech'
}

export function getCandidateHireRole(candidate: Candidate): AgentRole | undefined {
  if (candidate.category !== 'agent' || !candidate.agentData) {
    return undefined
  }

  return mapRecruitRoleToAgentRole(candidate.agentData.specialization, candidate.agentData.role)
}
