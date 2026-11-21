/**
 * SPE-3067: Deterministic incident triage priority resolver (slice).
 *
 * Pure ranking of active incidents using agency-known signals only.
 * No hidden truth, no capacity model duplication, no direct deployment.
 *
 * Score weights are provisional for this bounded slice and documented here;
 * later slices may refine precedence once full intake contracts are wired.
 */

export interface IncidentTriageInput {
  id: string;
  /** Agency-known urgency 0-100 */
  urgency: number;
  /** Agency-known threat severity 0-100 */
  threatSeverity: number;
  /** Agency-known escalation pressure 0-100 */
  escalationPressure: number;
  /** Agency-known strategic value 0-100 */
  strategicValue: number;
  /** Agency-known deferral consequence 0-100 (higher = worse to delay) */
  deferralConsequence: number;
  /** Agency-known confidence 0-1 */
  confidence: number;
  /** Hard routing blockers (jurisdiction, authorization, etc.). Non-empty blocks routing. */
  blockers: readonly string[];
  /** Optional resource-pressure sensitivity 0-100; higher means more affected by capacity pressure. */
  resourcePressureSensitivity?: number;
}

export interface IncidentTriageResult {
  id: string;
  score: number;
  recommendation: 'queue' | 'defer' | 'escalate' | 'manual-review' | 'blocked';
  reasonCodes: readonly string[];
  contributors: ReadonlyArray<{ factor: string; weight: number; value: number }>;
  confidence: number;
  blockers: readonly string[];
}

export interface TriageContext {
  /** 0-100 organization-wide capacity pressure; higher reduces effective priority for sensitive cases. */
  capacityPressure?: number;
}

const WEIGHTS = {
  urgency: 0.3,
  threatSeverity: 0.2,
  escalationPressure: 0.15,
  strategicValue: 0.15,
  deferralConsequence: 0.2,
} as const;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function resolveIncidentTriagePriority(
  incidents: readonly IncidentTriageInput[],
  context: TriageContext = {},
): IncidentTriageResult[] {
  const capacityPressure = clamp(context.capacityPressure ?? 0, 0, 100);

  const scored = incidents.map((inc) => {
    const conf = clamp(inc.confidence, 0, 1);
    const base =
      clamp(inc.urgency, 0, 100) * WEIGHTS.urgency +
      clamp(inc.threatSeverity, 0, 100) * WEIGHTS.threatSeverity +
      clamp(inc.escalationPressure, 0, 100) * WEIGHTS.escalationPressure +
      clamp(inc.strategicValue, 0, 100) * WEIGHTS.strategicValue +
      clamp(inc.deferralConsequence, 0, 100) * WEIGHTS.deferralConsequence;

    const sensitivity = clamp(inc.resourcePressureSensitivity ?? 50, 0, 100);
    const pressurePenalty = (capacityPressure / 100) * (sensitivity / 100) * 15;
    const rawScore = Math.max(0, base * conf - pressurePenalty);

    const hasBlockers = inc.blockers.length > 0;
    let recommendation: IncidentTriageResult['recommendation'] = 'queue';
    const reasonCodes: string[] = [];

    if (hasBlockers) {
      recommendation = 'blocked';
      reasonCodes.push('routing-blocker');
    } else if (rawScore >= 70) {
      recommendation = 'escalate';
      reasonCodes.push('high-priority');
    } else if (rawScore >= 40) {
      recommendation = 'queue';
      reasonCodes.push('standard-priority');
    } else if (rawScore >= 20) {
      recommendation = 'defer';
      reasonCodes.push('low-priority');
    } else {
      recommendation = 'manual-review';
      reasonCodes.push('insufficient-signal');
    }

    if (capacityPressure > 60 && sensitivity > 40) {
      reasonCodes.push('capacity-pressure');
    }
    if (conf < 0.5) {
      reasonCodes.push('low-confidence');
    }

    const contributors = [
      { factor: 'urgency', weight: WEIGHTS.urgency, value: inc.urgency },
      { factor: 'threatSeverity', weight: WEIGHTS.threatSeverity, value: inc.threatSeverity },
      { factor: 'escalationPressure', weight: WEIGHTS.escalationPressure, value: inc.escalationPressure },
      { factor: 'strategicValue', weight: WEIGHTS.strategicValue, value: inc.strategicValue },
      { factor: 'deferralConsequence', weight: WEIGHTS.deferralConsequence, value: inc.deferralConsequence },
    ];

    return {
      id: inc.id,
      score: Math.round(rawScore * 100) / 100,
      recommendation,
      reasonCodes,
      contributors,
      confidence: conf,
      blockers: [...inc.blockers],
    };
  });

  // Stable sort: score desc, then id asc for deterministic tie-break
  return scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.id.localeCompare(b.id);
  });
}
