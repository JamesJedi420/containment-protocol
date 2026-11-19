/**
 * Bounded compendium consistency checks (SPE-755).
 *
 * Deterministic lint-style validation for anomaly compendium records:
 * - missing required fields
 * - invalid scale usage
 * - terminology drift / jargon leak / label-to-intent mismatch signals
 *
 * Pure domain helper. Does not mutate state or introduce new engines.
 */

export type CompendiumScale = 'low' | 'medium' | 'high' | 'extreme';

export interface CompendiumRecord {
  id: string;
  family: string;
  scale: CompendiumScale;
  statusTerm: string; // player-facing status language
  confidenceTerm: string;
  actionTerm: string;
  blockerMessage?: string;
}

const CANONICAL_STATUS = new Set(['blocked', 'unavailable', 'unsafe', 'disputed', 'stale', 'known', 'suspected', 'confirmed']);
const CANONICAL_CONFIDENCE = new Set(['low', 'medium', 'high', 'verified']);
const CANONICAL_ACTION = new Set(['contain', 'observe', 'evacuate', 'report', 'escalate']);

const JARGON_LEAKS = ['GameState', 'hydrate', 'reducer', 'slice', 'registry.ts'];

export interface ConsistencyIssue {
  code: 'missing-field' | 'invalid-scale' | 'terminology-drift' | 'jargon-leak' | 'non-actionable-blocker';
  field: string;
  message: string;
}

export function validateCompendiumRecord(record: Partial<CompendiumRecord>): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];

  if (!record.id) issues.push({ code: 'missing-field', field: 'id', message: 'Record id is required' });
  if (!record.family) issues.push({ code: 'missing-field', field: 'family', message: 'Family is required' });
  if (!record.scale) issues.push({ code: 'missing-field', field: 'scale', message: 'Scale is required' });

  if (record.scale && !['low', 'medium', 'high', 'extreme'].includes(record.scale)) {
    issues.push({ code: 'invalid-scale', field: 'scale', message: `Invalid scale: ${record.scale}` });
  }

  if (record.statusTerm && !CANONICAL_STATUS.has(record.statusTerm)) {
    issues.push({ code: 'terminology-drift', field: 'statusTerm', message: `Non-canonical status term: ${record.statusTerm}` });
  }
  if (record.confidenceTerm && !CANONICAL_CONFIDENCE.has(record.confidenceTerm)) {
    issues.push({ code: 'terminology-drift', field: 'confidenceTerm', message: `Non-canonical confidence term: ${record.confidenceTerm}` });
  }
  if (record.actionTerm && !CANONICAL_ACTION.has(record.actionTerm)) {
    issues.push({ code: 'terminology-drift', field: 'actionTerm', message: `Non-canonical action term: ${record.actionTerm}` });
  }

  const text = [record.statusTerm, record.confidenceTerm, record.actionTerm, record.blockerMessage].filter(Boolean).join(' ');
  for (const jargon of JARGON_LEAKS) {
    if (text.includes(jargon)) {
      issues.push({ code: 'jargon-leak', field: 'text', message: `Internal jargon leaked: ${jargon}` });
    }
  }

  if (record.blockerMessage && !/(next|recover|retry|contact|escalate|report)/i.test(record.blockerMessage)) {
    issues.push({ code: 'non-actionable-blocker', field: 'blockerMessage', message: 'Blocked-action message lacks recoverable next step' });
  }

  return issues;
}

export function hasBlockingIssues(issues: ConsistencyIssue[]): boolean {
  return issues.some(i => i.code === 'missing-field' || i.code === 'invalid-scale');
}
