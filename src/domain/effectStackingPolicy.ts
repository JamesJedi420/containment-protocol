/**
 * SPE-780 — Effect stacking policy schema.
 *
 * Bounded family-level policies for how active effects of the same family
 * interact: replace-weaker, reject-duplicate, extend-duration, stack-magnitude,
 * cap-total, or mutual exclusion / direct cancel.
 *
 * Distinct from priority sorting or last-write-wins. Deterministic only.
 * No GameState persistence, UI, or full effect runtime here.
 */

export type EffectStackingPolicy =
  | "replace-weaker"
  | "reject-duplicate"
  | "extend-duration"
  | "stack-magnitude"
  | "cap-total"
  | "mutual-exclusion";

export interface EffectInstance {
  id: string;
  family: string;
  magnitude: number;
  duration: number;
  /** Optional polarity for cancel: positive vs negative. */
  polarity?: "positive" | "negative";
}

export interface StackingFamilyRule {
  family: string;
  policy: EffectStackingPolicy;
  /** For cap-total: maximum summed magnitude. */
  cap?: number;
  /** For mutual-exclusion: opposing families that cancel. */
  opposes?: string[];
}

export interface StackResolution {
  retained: EffectInstance[];
  rejected: EffectInstance[];
  canceled: EffectInstance[];
  reasons: string[];
}

const DEFAULT_CAP = 10;

function stronger(a: EffectInstance, b: EffectInstance): EffectInstance {
  if (a.magnitude > b.magnitude) return a;
  if (b.magnitude > a.magnitude) return b;
  // Stable tie-break by id.
  return a.id.localeCompare(b.id) <= 0 ? a : b;
}

export function resolveStacking(
  rules: StackingFamilyRule[],
  active: EffectInstance[],
  incoming: EffectInstance,
): StackResolution {
  const reasons: string[] = [];
  const retained: EffectInstance[] = [];
  const rejected: EffectInstance[] = [];
  const canceled: EffectInstance[] = [];

  const rule = rules.find((r) => r.family === incoming.family);
  if (!rule) {
    retained.push(...active, incoming);
    reasons.push("no-family-rule: coexist");
    return { retained, rejected, canceled, reasons };
  }

  const sameFamily = active.filter((e) => e.family === incoming.family);
  const others = active.filter((e) => e.family !== incoming.family);

  switch (rule.policy) {
    case "replace-weaker": {
      const candidates = [...sameFamily, incoming];
      const best = candidates.reduce(stronger);
      retained.push(...others, best);
      candidates.filter((c) => c !== best).forEach((c) => rejected.push(c));
      reasons.push("replace-weaker: kept strongest");
      break;
    }
    case "reject-duplicate": {
      if (sameFamily.length > 0) {
        retained.push(...active);
        rejected.push(incoming);
        reasons.push("reject-duplicate: already present");
      } else {
        retained.push(...active, incoming);
        reasons.push("reject-duplicate: first instance kept");
      }
      break;
    }
    case "extend-duration": {
      if (sameFamily.length > 0) {
        const existing = sameFamily[0];
        const extended: EffectInstance = {
          ...existing,
          duration: existing.duration + incoming.duration,
        };
        retained.push(...others, extended);
        rejected.push(...sameFamily.slice(1), incoming);
        reasons.push("extend-duration: duration summed, magnitude unchanged");
      } else {
        retained.push(...active, incoming);
        reasons.push("extend-duration: new instance");
      }
      break;
    }
    case "stack-magnitude": {
      const totalMag = sameFamily.reduce((s, e) => s + e.magnitude, 0) + incoming.magnitude;
      const stacked: EffectInstance = {
        id: incoming.id,
        family: incoming.family,
        magnitude: totalMag,
        duration: Math.max(...sameFamily.map((e) => e.duration), incoming.duration, 0),
      };
      retained.push(...others, stacked);
      rejected.push(...sameFamily);
      reasons.push("stack-magnitude: magnitudes summed");
      break;
    }
    case "cap-total": {
      const cap = rule.cap ?? DEFAULT_CAP;
      const totalMag = sameFamily.reduce((s, e) => s + e.magnitude, 0) + incoming.magnitude;
      const capped = Math.min(totalMag, cap);
      const stacked: EffectInstance = {
        id: incoming.id,
        family: incoming.family,
        magnitude: capped,
        duration: Math.max(...sameFamily.map((e) => e.duration), incoming.duration, 0),
      };
      retained.push(...others, stacked);
      rejected.push(...sameFamily);
      reasons.push(`cap-total: magnitude capped at ${cap}`);
      break;
    }
    case "mutual-exclusion": {
      const opposes = rule.opposes ?? [];
      const opposing = active.filter((e) => opposes.includes(e.family) || (e.polarity && e.polarity !== incoming.polarity && e.family === incoming.family));
      if (opposing.length > 0) {
        canceled.push(...opposing, incoming);
        retained.push(...active.filter((e) => !opposing.includes(e)));
        reasons.push("mutual-exclusion: opposing effects canceled");
      } else {
        retained.push(...active, incoming);
        reasons.push("mutual-exclusion: no opposition");
      }
      break;
    }
    default: {
      retained.push(...active, incoming);
      reasons.push("unknown-policy: coexist");
    }
  }

  return { retained, rejected, canceled, reasons };
}
