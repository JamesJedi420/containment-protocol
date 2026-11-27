/**
 * SPE-752 Canonical anomaly family and subtype records (slice 1)
 * Pure deterministic registry for family overviews and linked subtypes.
 * No mutation, no side effects. Consumes classification contracts externally.
 */

export interface AnomalySubtypeRecord {
  id: string;
  familyId: string;
  name: string;
  kind: 'ordinary' | 'elite' | 'apex' | 'narrow';
  hazardProfile: string;
  behavioralNotes: string;
  responsePolicy: string;
}

export interface AnomalyFamilyRecord {
  id: string;
  name: string;
  overview: string;
  origin: string;
  subtypes: string[]; // subtype ids
}

const FAMILIES: ReadonlyArray<AnomalyFamilyRecord> = [
  {
    id: 'haunt-family',
    name: 'Haunt',
    overview: 'Spectral presence bound to location or object with residual intent.',
    origin: 'Unresolved death or ritual remnant',
    subtypes: ['haunt-standard', 'haunt-elite-apex'],
  },
];

const SUBTYPES: ReadonlyArray<AnomalySubtypeRecord> = [
  {
    id: 'haunt-standard',
    familyId: 'haunt-family',
    name: 'Standard Haunt',
    kind: 'ordinary',
    hazardProfile: 'localized fear and object displacement',
    behavioralNotes: 'Repeats last observed pattern',
    responsePolicy: 'containment via binding or relocation',
  },
  {
    id: 'haunt-elite-apex',
    familyId: 'haunt-family',
    name: 'Apex Residual',
    kind: 'apex',
    hazardProfile: 'wide-area cognitive distortion',
    behavioralNotes: 'adapts to observer belief',
    responsePolicy: 'priority neutralization or isolation',
  },
];

export function listFamilies(): ReadonlyArray<AnomalyFamilyRecord> {
  return FAMILIES;
}

export function getFamily(id: string): AnomalyFamilyRecord | undefined {
  return FAMILIES.find((f) => f.id === id);
}

export function getSubtypesForFamily(familyId: string): ReadonlyArray<AnomalySubtypeRecord> {
  return SUBTYPES.filter((s) => s.familyId === familyId);
}

export function getSubtype(id: string): AnomalySubtypeRecord | undefined {
  return SUBTYPES.find((s) => s.id === id);
}
