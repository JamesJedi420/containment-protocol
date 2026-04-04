export type {
  AgentCandidateData,
  AgentCandidateRole,
  Candidate,
  CandidateBase,
  CandidateCategory,
  CandidateCostEstimate,
  CandidateEvaluation,
  CandidateLegacyStats,
  CandidatePipelineStatus,
  CandidatePotentialTier,
  CandidateRevealLevel,
  CandidateScoutStage,
  CandidateScoutReport,
  InstructorCandidateData,
  InstructorStatKey,
  SpecialistCandidateData,
  StaffCandidateData,
  StaffCandidateSpecialty,
} from './types'

export {
  buildCandidateEvaluation,
  CANDIDATE_REVEAL_THRESHOLDS,
  deriveCandidateCostEstimate,
  getCandidatePool,
  getCandidateOverall,
  getRecruitmentPool,
  getCandidateWeeklyCost,
  isCandidateFieldVisible,
  isCandidateHireable,
  normalizeCandidateCategory,
  normalizeCandidateHireStatus,
  normalizeStaffCandidateSpecialty,
  scoreToCandidatePotentialTier,
  syncCandidatePoolState,
  syncRecruitmentPoolState,
} from './helpers'

export { revealCandidate } from './reveal'
export { getCandidateHireRole, mapRecruitRoleToAgentRole } from './hireOutcome'
export {
  buildCandidateScoutReport,
  getNextCandidateScoutStage,
  getCandidateScoutCost,
  isCandidateScoutable,
  resolveCandidateActualPotentialTier,
} from './scouting'
export type { CandidatePreview } from './preview'
export { previewCandidate } from './preview'
