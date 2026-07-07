import { describe, it, expect } from 'vitest'
import {
  buildAffiliationFileWorkQueueEvidenceRepairWorkflow,
  buildAffiliationFileWorkQueueEvidenceRepairWorkflowId,
  sanitizeAffiliationFileWorkQueueEvidenceRepairWorkflows,
} from './affiliationFileWorkQueueEvidenceRepairWorkflows'

describe('affiliationFileWorkQueueEvidenceRepairWorkflows', () => {
  describe('buildAffiliationFileWorkQueueEvidenceRepairWorkflowId', () => {
    it('generates deterministic ID from entryId and evidenceType', () => {
      const id1 = buildAffiliationFileWorkQueueEvidenceRepairWorkflowId({
        workQueueEntryId: 'entry-123',
        evidenceType: 'missing_entity_welfare_reclassification_ref',
      })
      const id2 = buildAffiliationFileWorkQueueEvidenceRepairWorkflowId({
        workQueueEntryId: 'entry-123',
        evidenceType: 'missing_entity_welfare_reclassification_ref',
      })
      expect(id1).toBe(id2)
    })

    it('includes both entry ID and evidence type in ID', () => {
      const id = buildAffiliationFileWorkQueueEvidenceRepairWorkflowId({
        workQueueEntryId: 'entry-456',
        evidenceType: 'missing_entity_welfare_reclassification_ref',
      })
      expect(id).toContain('entry-456')
      expect(id).toContain('missing_entity_welfare_reclassification_ref')
    })

    it('produces different IDs for different entry IDs', () => {
      const id1 = buildAffiliationFileWorkQueueEvidenceRepairWorkflowId({
        workQueueEntryId: 'entry-1',
        evidenceType: 'missing_entity_welfare_reclassification_ref',
      })
      const id2 = buildAffiliationFileWorkQueueEvidenceRepairWorkflowId({
        workQueueEntryId: 'entry-2',
        evidenceType: 'missing_entity_welfare_reclassification_ref',
      })
      expect(id1).not.toBe(id2)
    })
  })

  describe('buildAffiliationFileWorkQueueEvidenceRepairWorkflow', () => {
    it('creates frozen repair workflow record with all required fields', () => {
      const input = {
        workQueueEntryId: 'entry-789',
        evidenceType: 'missing_entity_welfare_reclassification_ref' as const,
        subjectId: 'subject-001',
        subjectLabel: 'Test Subject',
        repairLabel: 'Restore minimal welfare evidence',
        recordedWeek: 5,
      }

      const record = buildAffiliationFileWorkQueueEvidenceRepairWorkflow(input)

      expect(record).toBeFrozen()
      expect(record.id).toBeDefined()
      expect(record.workQueueEntryId).toBe('entry-789')
      expect(record.evidenceType).toBe('missing_entity_welfare_reclassification_ref')
      expect(record.subjectId).toBe('subject-001')
      expect(record.subjectLabel).toBe('Test Subject')
      expect(record.repairLabel).toBe('Restore minimal welfare evidence')
      expect(record.recordedWeek).toBe(5)
    })

    it('generates deterministic ID for record', () => {
      const input = {
        workQueueEntryId: 'entry-test',
        evidenceType: 'missing_entity_welfare_reclassification_ref' as const,
        subjectId: 'subject-123',
        subjectLabel: 'Test',
        repairLabel: 'Restore welfare',
        recordedWeek: 3,
      }

      const record1 = buildAffiliationFileWorkQueueEvidenceRepairWorkflow(input)
      const record2 = buildAffiliationFileWorkQueueEvidenceRepairWorkflow(input)

      expect(record1.id).toBe(record2.id)
    })

    it('creates repair reference from entry ID and evidence type', () => {
      const record = buildAffiliationFileWorkQueueEvidenceRepairWorkflow({
        workQueueEntryId: 'entry-ref-test',
        evidenceType: 'missing_entity_welfare_reclassification_ref',
        subjectId: 'subject-abc',
        subjectLabel: 'Test Subject',
        repairLabel: 'Restore welfare evidence',
        recordedWeek: 2,
      })

      expect(record.repairRef).toContain('entry-ref-test')
      expect(record.repairRef).toContain('missing_entity_welfare_reclassification_ref')
    })

    it('handles special characters in labels', () => {
      const record = buildAffiliationFileWorkQueueEvidenceRepairWorkflow({
        workQueueEntryId: 'entry-special',
        evidenceType: 'missing_entity_welfare_reclassification_ref',
        subjectId: 'subject-special-123!@#',
        subjectLabel: 'Subject: "Test" & More',
        repairLabel: 'Restore/Repair Welfare Evidence (Rev 2)',
        recordedWeek: 1,
      })

      expect(record.subjectLabel).toBe('Subject: "Test" & More')
      expect(record.repairLabel).toBe('Restore/Repair Welfare Evidence (Rev 2)')
    })
  })

  describe('sanitizeAffiliationFileWorkQueueEvidenceRepairWorkflows', () => {
    it('returns empty map for non-record input', () => {
      expect(sanitizeAffiliationFileWorkQueueEvidenceRepairWorkflows(null)).toEqual({})
      expect(sanitizeAffiliationFileWorkQueueEvidenceRepairWorkflows(undefined)).toEqual({})
      expect(sanitizeAffiliationFileWorkQueueEvidenceRepairWorkflows([])).toEqual({})
      expect(sanitizeAffiliationFileWorkQueueEvidenceRepairWorkflows('string')).toEqual({})
      expect(sanitizeAffiliationFileWorkQueueEvidenceRepairWorkflows(123)).toEqual({})
    })

    it('keeps valid records', () => {
      const record = buildAffiliationFileWorkQueueEvidenceRepairWorkflow({
        workQueueEntryId: 'entry-valid',
        evidenceType: 'missing_entity_welfare_reclassification_ref',
        subjectId: 'subject-valid',
        subjectLabel: 'Valid Subject',
        repairLabel: 'Restore welfare evidence',
        recordedWeek: 4,
      })

      const input = {
        [record.id]: record,
      }

      const result = sanitizeAffiliationFileWorkQueueEvidenceRepairWorkflows(input)

      expect(result[record.id]).toBeDefined()
      expect(result[record.id]).toEqual(record)
    })

    it('drops records with missing required fields', () => {
      const input = {
        'id-1': {
          id: 'id-1',
          workQueueEntryId: '',  // Empty
          evidenceType: 'missing_entity_welfare_reclassification_ref',
          subjectId: 'subject',
          subjectLabel: 'Label',
          repairLabel: 'Repair',
          repairRef: 'ref',
          recordedWeek: 1,
        },
        'id-2': {
          id: 'id-2',
          workQueueEntryId: 'entry',
          evidenceType: 'invalid_type',  // Invalid
          subjectId: 'subject',
          subjectLabel: 'Label',
          repairLabel: 'Repair',
          repairRef: 'ref',
          recordedWeek: 1,
        },
        'id-3': {
          id: 'id-3',
          workQueueEntryId: 'entry',
          evidenceType: 'missing_entity_welfare_reclassification_ref',
          subjectId: 'subject',
          subjectLabel: 'Label',
          repairLabel: 'Repair',
          repairRef: 'ref',
          recordedWeek: -1,  // Invalid week
        },
      }

      const result = sanitizeAffiliationFileWorkQueueEvidenceRepairWorkflows(input)

      expect(Object.keys(result)).toHaveLength(0)
    })

    it('deduplicates by (workQueueEntryId, evidenceType), keeping first occurrence', () => {
      const record1 = buildAffiliationFileWorkQueueEvidenceRepairWorkflow({
        workQueueEntryId: 'entry-dup',
        evidenceType: 'missing_entity_welfare_reclassification_ref',
        subjectId: 'subject-1',
        subjectLabel: 'Subject 1',
        repairLabel: 'Repair 1',
        recordedWeek: 1,
      })

      const record2 = buildAffiliationFileWorkQueueEvidenceRepairWorkflow({
        workQueueEntryId: 'entry-dup',
        evidenceType: 'missing_entity_welfare_reclassification_ref',
        subjectId: 'subject-2',
        subjectLabel: 'Subject 2',
        repairLabel: 'Repair 2',
        recordedWeek: 2,
      })

      const input = {
        [record1.id]: record1,
        [record2.id]: record2,
      }

      const result = sanitizeAffiliationFileWorkQueueEvidenceRepairWorkflows(input)

      // Should keep first occurrence (record1)
      expect(Object.keys(result)).toHaveLength(1)
      expect(result[record1.id]).toEqual(record1)
    })

    it('handles array input gracefully', () => {
      const result = sanitizeAffiliationFileWorkQueueEvidenceRepairWorkflows([
        { id: 'some-id' },
      ] as unknown)

      expect(result).toEqual({})
    })

    it('trims whitespace from string fields', () => {
      const input = {
        'id-trimmed': {
          id: '  id-trimmed  ',
          workQueueEntryId: '  entry-trim  ',
          evidenceType: 'missing_entity_welfare_reclassification_ref',
          subjectId: '  subject-trim  ',
          subjectLabel: '  Trimmed Subject  ',
          repairLabel: '  Trim Repair  ',
          repairRef: '  ref-trim  ',
          recordedWeek: 1,
        },
      }

      const result = sanitizeAffiliationFileWorkQueueEvidenceRepairWorkflows(input)

      const entry = Object.values(result)[0]
      expect(entry.workQueueEntryId).toBe('entry-trim')
      expect(entry.subjectLabel).toBe('Trimmed Subject')
      expect(entry.repairLabel).toBe('Trim Repair')
    })

    it('validates evidence type strictly', () => {
      const validTypes = ['missing_entity_welfare_reclassification_ref']
      const invalidTypes = ['missing_welfare', 'welfare_ref', 'missing_entity_welfare']

      for (const invalidType of invalidTypes) {
        const input = {
          [invalidType]: {
            id: invalidType,
            workQueueEntryId: 'entry',
            evidenceType: invalidType,
            subjectId: 'subject',
            subjectLabel: 'Label',
            repairLabel: 'Repair',
            repairRef: 'ref',
            recordedWeek: 1,
          },
        }

        const result = sanitizeAffiliationFileWorkQueueEvidenceRepairWorkflows(input)
        expect(Object.keys(result)).toHaveLength(0)
      }
    })

    it('preserves frozen state on sanitized records', () => {
      const record = buildAffiliationFileWorkQueueEvidenceRepairWorkflow({
        workQueueEntryId: 'entry-frozen',
        evidenceType: 'missing_entity_welfare_reclassification_ref',
        subjectId: 'subject-frozen',
        subjectLabel: 'Frozen Subject',
        repairLabel: 'Freeze Repair',
        recordedWeek: 1,
      })

      const result = sanitizeAffiliationFileWorkQueueEvidenceRepairWorkflows({
        [record.id]: record,
      })

      const sanitized = Object.values(result)[0]
      expect(sanitized).toBeFrozen()
    })

    it('requires week to be non-negative integer', () => {
      const input = {
        'float-week': {
          id: 'float-week',
          workQueueEntryId: 'entry',
          evidenceType: 'missing_entity_welfare_reclassification_ref',
          subjectId: 'subject',
          subjectLabel: 'Label',
          repairLabel: 'Repair',
          repairRef: 'ref',
          recordedWeek: 1.5,  // Float, not integer
        },
        'negative-week': {
          id: 'negative-week',
          workQueueEntryId: 'entry',
          evidenceType: 'missing_entity_welfare_reclassification_ref',
          subjectId: 'subject',
          subjectLabel: 'Label',
          repairLabel: 'Repair',
          repairRef: 'ref',
          recordedWeek: -5,
        },
      }

      const result = sanitizeAffiliationFileWorkQueueEvidenceRepairWorkflows(input)
      expect(Object.keys(result)).toHaveLength(0)
    })
  })
})
