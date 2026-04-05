import { SIM_NOTES } from '../../data/copy'
import type { ReportNote } from '../models'

export interface StructuredReportNote {
  content: string
  type: NonNullable<ReportNote['type']>
  metadata: NonNullable<ReportNote['metadata']>
}

function buildStructuredReportNote(
  content: string,
  type: StructuredReportNote['type'],
  metadata: StructuredReportNote['metadata']
): StructuredReportNote {
  return {
    content,
    type,
    metadata,
  }
}

export const EVENT_NOTE_BUILDERS = {
  resolved(caseId: string, caseTitle: string, stage: number): StructuredReportNote {
    return buildStructuredReportNote(SIM_NOTES.resolved(caseTitle), 'case.resolved', {
      caseId,
      caseTitle,
      stage,
    })
  },
  partial(
    caseId: string,
    caseTitle: string,
    fromStage: number,
    toStage: number
  ): StructuredReportNote {
    return buildStructuredReportNote(SIM_NOTES.partial(caseTitle), 'case.partially_resolved', {
      caseId,
      caseTitle,
      fromStage,
      toStage,
    })
  },
  failed(
    caseId: string,
    caseTitle: string,
    fromStage: number,
    toStage: number
  ): StructuredReportNote {
    return buildStructuredReportNote(SIM_NOTES.failed(caseTitle, toStage), 'case.failed', {
      caseId,
      caseTitle,
      fromStage,
      toStage,
    })
  },
  escalated(
    caseId: string,
    caseTitle: string,
    fromStage: number,
    toStage: number,
    trigger: 'deadline' | 'failure'
  ): StructuredReportNote {
    return buildStructuredReportNote(SIM_NOTES.deadline(caseTitle, toStage), 'case.escalated', {
      caseId,
      caseTitle,
      fromStage,
      toStage,
      trigger,
    })
  },
  weekDelta(delta: number): StructuredReportNote {
    return buildStructuredReportNote(SIM_NOTES.weekDelta(delta), 'system.week_delta', {
      delta,
    })
  },
  recruitmentExpired(count: number): StructuredReportNote {
    return buildStructuredReportNote(
      `Recruitment pipeline expired ${count} candidate(s).`,
      'system.recruitment_expired',
      { count }
    )
  },
  recruitmentGenerated(count: number): StructuredReportNote {
    return buildStructuredReportNote(
      `Recruitment pipeline generated ${count} candidate(s).`,
      'system.recruitment_generated',
      { count }
    )
  },
  spawnFollowUp(
    sourceCaseId: string,
    sourceCaseTitle: string,
    count: number
  ): StructuredReportNote {
    return buildStructuredReportNote(
      `${sourceCaseTitle}: ${SIM_NOTES.spawnFollowUp(count)}`,
      'case.spawned',
      {
        sourceCaseId,
        sourceCaseTitle,
        count,
      }
    )
  },
  raidConverted(sourceCaseId: string, sourceCaseTitle: string): StructuredReportNote {
    return buildStructuredReportNote(
      `${sourceCaseTitle}: ${SIM_NOTES.convertedToRaid()}`,
      'case.raid_converted',
      {
        sourceCaseId,
        sourceCaseTitle,
      }
    )
  },
} as const
