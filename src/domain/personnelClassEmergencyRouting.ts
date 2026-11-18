/**
 * SPE-2081: Personnel-class emergency routing graph (slice 1)
 * Pure deterministic domain helper.
 * Routes staff cohorts by personnel class and policy during site emergencies.
 * Does not replace SPE-1023 tactical deployment or implement full alert networks.
 */

export type PersonnelClass =
  | 'strategic_essential'
  | 'combat_specialist'
  | 'support_staff'
  | 'non_combatant'
  | 'contractor';

export type ExposureRiskClass = 'none' | 'low' | 'medium' | 'high' | 'prohibited';

export type EmergencyRouteDecision =
  | 'evacuate_offsite'
  | 'secure_lockdown'
  | 'discretionary_hold'
  | 'quarantine_pipeline';

export interface EmergencyRoutingInput {
  breachSeverity: 'minor' | 'moderate' | 'major' | 'critical';
  zone: string;
  personnelClass: PersonnelClass;
  exposureRiskClass: ExposureRiskClass;
  combatRole?: string;
  ethicsPolicyFlags: {
    allowStrategicEvac: boolean;
    lockdownNonCombatants: boolean;
    quarantineHighExposure: boolean;
  };
}

export interface EmergencyRoutingResult {
  decision: EmergencyRouteDecision;
  auditTrail: string[];
  reason: string;
}

/**
 * Deterministic personnel-class emergency route resolver.
 * At least two classes receive different routes under the same incident parameters.
 * Respects exposure prohibition for strategic-essential staff.
 */
export function resolvePersonnelClassEmergencyRoute(
  input: EmergencyRoutingInput
): EmergencyRoutingResult {
  const audit: string[] = [];
  audit.push(`breach=${input.breachSeverity} zone=${input.zone} class=${input.personnelClass}`);

  // Exposure prohibition: strategic-essential with prohibited exposure cannot evacuate freely
  if (
    input.personnelClass === 'strategic_essential' &&
    input.exposureRiskClass === 'prohibited'
  ) {
    audit.push('exposure_prohibition_applied');
    return {
      decision: 'secure_lockdown',
      auditTrail: audit,
      reason: 'strategic_essential_prohibited_exposure',
    };
  }

  // Strategic essential prefer offsite if policy allows and not prohibited
  if (
    input.personnelClass === 'strategic_essential' &&
    input.ethicsPolicyFlags.allowStrategicEvac &&
    input.exposureRiskClass !== 'prohibited'
  ) {
    audit.push('strategic_evac_authorized');
    return {
      decision: 'evacuate_offsite',
      auditTrail: audit,
      reason: 'strategic_essential_offsite',
    };
  }

  // Non-combatants under lockdown policy
  if (
    input.personnelClass === 'non_combatant' &&
    input.ethicsPolicyFlags.lockdownNonCombatants
  ) {
    audit.push('noncombatant_lockdown');
    return {
      decision: 'secure_lockdown',
      auditTrail: audit,
      reason: 'non_combatant_lockdown_policy',
    };
  }

  // High exposure quarantine
  if (
    input.exposureRiskClass === 'high' &&
    input.ethicsPolicyFlags.quarantineHighExposure
  ) {
    audit.push('high_exposure_quarantine');
    return {
      decision: 'quarantine_pipeline',
      auditTrail: audit,
      reason: 'high_exposure_quarantine',
    };
  }

  // Default for combat specialists: discretionary hold or evacuate depending on severity
  if (input.personnelClass === 'combat_specialist') {
    if (input.breachSeverity === 'critical' || input.breachSeverity === 'major') {
      audit.push('combat_evac_major');
      return {
        decision: 'evacuate_offsite',
        auditTrail: audit,
        reason: 'combat_specialist_major_breach',
      };
    }
    audit.push('combat_hold');
    return {
      decision: 'discretionary_hold',
      auditTrail: audit,
      reason: 'combat_specialist_hold',
    };
  }

  // Fallback
  audit.push('default_lockdown');
  return {
    decision: 'secure_lockdown',
    auditTrail: audit,
    reason: 'default_secure',
  };
}
