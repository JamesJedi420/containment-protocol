import { describe, expect, it } from 'vitest';
import {
  resolvePersonnelClassEmergencyRoute,
  type EmergencyRoutingInput,
} from '../domain/personnelClassEmergencyRouting';

describe('SPE-2081 personnel-class emergency routing', () => {
  const baseInput: Omit<EmergencyRoutingInput, 'personnelClass' | 'exposureRiskClass'> = {
    breachSeverity: 'major',
    zone: 'secure-lab-3',
    ethicsPolicyFlags: {
      allowStrategicEvac: true,
      lockdownNonCombatants: true,
      quarantineHighExposure: true,
    },
  };

  it('routes strategic essential to offsite and non-combatant to lockdown under same incident', () => {
    const strategic = resolvePersonnelClassEmergencyRoute({
      ...baseInput,
      personnelClass: 'strategic_essential',
      exposureRiskClass: 'none',
    });
    const nonCombatant = resolvePersonnelClassEmergencyRoute({
      ...baseInput,
      personnelClass: 'non_combatant',
      exposureRiskClass: 'none',
    });

    expect(strategic.decision).toBe('evacuate_offsite');
    expect(nonCombatant.decision).toBe('secure_lockdown');
    expect(strategic.decision).not.toBe(nonCombatant.decision);
  });

  it('respects exposure prohibition for strategic-essential staff', () => {
    const prohibited = resolvePersonnelClassEmergencyRoute({
      ...baseInput,
      personnelClass: 'strategic_essential',
      exposureRiskClass: 'prohibited',
    });

    expect(prohibited.decision).toBe('secure_lockdown');
    expect(prohibited.reason).toBe('strategic_essential_prohibited_exposure');
    expect(prohibited.auditTrail).toContain('exposure_prohibition_applied');
  });

  it('is deterministic for fixture incidents', () => {
    const input: EmergencyRoutingInput = {
      ...baseInput,
      personnelClass: 'combat_specialist',
      exposureRiskClass: 'low',
    };
    const a = resolvePersonnelClassEmergencyRoute(input);
    const b = resolvePersonnelClassEmergencyRoute(input);
    expect(a).toEqual(b);
    expect(a.decision).toBe('evacuate_offsite');
  });

  it('quarantines high exposure when policy set', () => {
    const result = resolvePersonnelClassEmergencyRoute({
      ...baseInput,
      personnelClass: 'support_staff',
      exposureRiskClass: 'high',
    });
    expect(result.decision).toBe('quarantine_pipeline');
  });
});
