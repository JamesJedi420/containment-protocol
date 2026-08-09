export const EQUIPMENT_AUTO_SCRAP_REASON_CODES = [
  'auto_scrap.eligible_at_or_below_threshold',
  'auto_scrap.grade_above_threshold',
  'auto_scrap.grade_unavailable',
  'auto_scrap.recovery_profile_unavailable',
  'auto_scrap.recovery_unavailable',
  'auto_scrap.fabricated_lot_selection_unavailable',
  'auto_scrap.custody_restricted',
  'auto_scrap.evidence_held',
  'auto_scrap.authorization_required',
  'auto_scrap.contamination_quarantine',
  'auto_scrap.reserved',
  'auto_scrap.unstable_anomaly',
] as const

export type EquipmentAutoScrapReasonCode = (typeof EQUIPMENT_AUTO_SCRAP_REASON_CODES)[number]
