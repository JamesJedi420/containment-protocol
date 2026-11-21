import { describe, expect, it } from "vitest";
import {
  type EffectInstance,
  type StackingFamilyRule,
  resolveStacking,
} from "./effectStackingPolicy";

describe("SPE-780 effect stacking policy", () => {
  const rules: StackingFamilyRule[] = [
    { family: "strength", policy: "replace-weaker" },
    { family: "haste", policy: "reject-duplicate" },
    { family: "regen", policy: "extend-duration" },
    { family: "armor", policy: "stack-magnitude" },
    { family: "focus", policy: "cap-total", cap: 5 },
    { family: "calm", policy: "mutual-exclusion", opposes: ["rage"] },
  ];

  it("replace-weaker keeps the strongest instance", () => {
    const active: EffectInstance[] = [
      { id: "a1", family: "strength", magnitude: 2, duration: 3 },
    ];
    const incoming: EffectInstance = { id: "a2", family: "strength", magnitude: 4, duration: 2 };
    const result = resolveStacking(rules, active, incoming);
    expect(result.retained).toEqual([incoming]);
    expect(result.rejected).toHaveLength(1);
    expect(result.reasons).toContain("replace-weaker: kept strongest");
  });

  it("reject-duplicate rejects a second instance", () => {
    const active: EffectInstance[] = [
      { id: "b1", family: "haste", magnitude: 1, duration: 4 },
    ];
    const incoming: EffectInstance = { id: "b2", family: "haste", magnitude: 1, duration: 2 };
    const result = resolveStacking(rules, active, incoming);
    expect(result.retained).toEqual(active);
    expect(result.rejected).toEqual([incoming]);
  });

  it("extend-duration sums duration without increasing magnitude", () => {
    const active: EffectInstance[] = [
      { id: "c1", family: "regen", magnitude: 1, duration: 3 },
    ];
    const incoming: EffectInstance = { id: "c2", family: "regen", magnitude: 1, duration: 2 };
    const result = resolveStacking(rules, active, incoming);
    expect(result.retained[0].duration).toBe(5);
    expect(result.retained[0].magnitude).toBe(1);
  });

  it("stack-magnitude sums magnitudes", () => {
    const active: EffectInstance[] = [
      { id: "d1", family: "armor", magnitude: 2, duration: 5 },
    ];
    const incoming: EffectInstance = { id: "d2", family: "armor", magnitude: 3, duration: 1 };
    const result = resolveStacking(rules, active, incoming);
    expect(result.retained[0].magnitude).toBe(5);
  });

  it("cap-total enforces the family cap", () => {
    const active: EffectInstance[] = [
      { id: "e1", family: "focus", magnitude: 3, duration: 2 },
    ];
    const incoming: EffectInstance = { id: "e2", family: "focus", magnitude: 4, duration: 1 };
    const result = resolveStacking(rules, active, incoming);
    expect(result.retained[0].magnitude).toBe(5);
  });

  it("mutual-exclusion cancels opposing effects", () => {
    const active: EffectInstance[] = [
      { id: "f1", family: "rage", magnitude: 2, duration: 3, polarity: "negative" },
    ];
    const incoming: EffectInstance = { id: "f2", family: "calm", magnitude: 1, duration: 2, polarity: "positive" };
    const result = resolveStacking(rules, active, incoming);
    expect(result.canceled).toHaveLength(2);
    expect(result.retained).toHaveLength(0);
  });

  it("equal inputs are deterministic via id tie-break", () => {
    const active: EffectInstance[] = [
      { id: "z", family: "strength", magnitude: 3, duration: 1 },
    ];
    const incoming: EffectInstance = { id: "a", family: "strength", magnitude: 3, duration: 1 };
    const result = resolveStacking(rules, active, incoming);
    expect(result.retained[0].id).toBe("a");
  });
});
