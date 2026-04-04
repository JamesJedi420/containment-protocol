// Zod schemas for OperationEvent payloads and event validation utilities
import { z } from 'zod'
import type { OperationEventType } from './types'

// Zod schemas for all OperationEventPayloadMap event types (strict)
export const assignmentTeamAssignedSchema = z
  .object({
    week: z.number(),
    caseId: z.string(),
    caseTitle: z.string(),
    caseKind: z.string(),
    teamId: z.string(),
    teamName: z.string(),
    assignedTeamCount: z.number(),
    maxTeams: z.number(),
  })
  .strict()

export const assignmentTeamUnassignedSchema = z
  .object({
    week: z.number(),
    caseId: z.string(),
    caseTitle: z.string(),
    teamId: z.string(),
    teamName: z.string(),
    remainingTeamCount: z.number(),
  })
  .strict()

export const caseResolvedSchema = z
  .object({
    week: z.number(),
    caseId: z.string(),
    caseTitle: z.string(),
    mode: z.string(),
    kind: z.string(),
    stage: z.number(),
    teamIds: z.array(z.string()),
    performanceSummary: z.any().optional(),
    rewardBreakdown: z.any().optional(),
  })
  .strict()

export const casePartiallyResolvedSchema = z
  .object({
    week: z.number(),
    caseId: z.string(),
    caseTitle: z.string(),
    mode: z.string(),
    kind: z.string(),
    fromStage: z.number(),
    toStage: z.number(),
    teamIds: z.array(z.string()),
    performanceSummary: z.any().optional(),
    rewardBreakdown: z.any().optional(),
  })
  .strict()

export const caseFailedSchema = z
  .object({
    week: z.number(),
    caseId: z.string(),
    caseTitle: z.string(),
    mode: z.string(),
    kind: z.string(),
    fromStage: z.number(),
    toStage: z.number(),
    teamIds: z.array(z.string()),
    performanceSummary: z.any().optional(),
    rewardBreakdown: z.any().optional(),
  })
  .strict()

// ... (Add schemas for all other event types in OperationEventPayloadMap)

export const operationEventPayloadSchemas: Partial<Record<OperationEventType, z.ZodTypeAny>> = {
  'assignment.team_assigned': assignmentTeamAssignedSchema,
  'assignment.team_unassigned': assignmentTeamUnassignedSchema,
  'case.resolved': caseResolvedSchema,
  'case.partially_resolved': casePartiallyResolvedSchema,
  'case.failed': caseFailedSchema,
  // ... (Add all other event type schemas here)
}

export function validateOperationEventPayload<TType extends OperationEventType>(
  type: TType,
  payload: unknown
): { success: boolean; error?: string } {
  const schema = operationEventPayloadSchemas[type]
  if (!schema) return { success: true } // No schema: skip validation
  const result = schema.safeParse(payload)
  if (result.success) return { success: true }
  return { success: false, error: result.error.message }
}
