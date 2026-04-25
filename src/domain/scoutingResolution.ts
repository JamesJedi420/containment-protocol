// Contested resolution: team vs anomaly concealment (scouting/investigation)
// Uses tags, conditions, modifiers, and outcome bands
import { aggregateModifiers } from './modifiers';
import type { ModifierSource } from './modifiers';
import { evaluateTagNicheFit, getTeamNicheModifier } from './nicheIdentity';
import { getOutcomeBand, explainOutcome } from './outcomes';
import { hasEffectiveCountermeasure } from './resistances';

/**
 * SPE-59: Add bounded context input (containerType) for context-sensitive reveal.
 */
export interface ScoutingInput {
  teamCapability: number; // e.g., 0-3
  anomalyConcealment: number; // e.g., 0-3
  teamTags?: string[];
  anomalyTags?: string[];
  teamConditions?: string[];
  anomalyConditions?: string[];
  gearTags?: string[];
  /** Optional bounded context: container/site/zone */
  containerType?: 'standard' | 'sealed' | 'open';
  /** SPE-57: Canonical site-space state for bounded spatial logic */
  siteLayer?: 'exterior' | 'transition' | 'interior';
  visibilityState?: 'clear' | 'obstructed' | 'exposed';
  transitionType?: 'open-approach' | 'threshold' | 'chokepoint';
  spatialFlags?: string[];
}

export interface ScoutingResult {
  outcome: ReturnType<typeof getOutcomeBand>;
  value: number;
  explanation: string;
  revealed: boolean;
  withheld: boolean;
}

/**
 * SPE-59: Context-sensitive scouting resolution. If containerType is 'sealed', increase concealment and alter explanation.
 */
export function resolveScouting(input: ScoutingInput): ScoutingResult {
  // Base: team capability - anomaly concealment
  let concealment = input.anomalyConcealment;
  let contextExplanation = '';
  // --- Canonical spatial state effects (SPE-57) ---
  // Visibility state
  if (input.visibilityState === 'obstructed') {
    concealment += 1;
    contextExplanation += 'Obstructed visibility: +1 concealment. ';
  } else if (input.visibilityState === 'exposed') {
    concealment = Math.max(0, concealment - 1);
    contextExplanation += 'Exposed: -1 concealment. ';
  }
  // Site layer
  if (input.siteLayer === 'exterior') {
    contextExplanation += 'Exterior: approach phase. ';
  } else if (input.siteLayer === 'transition') {
    concealment += 1;
    contextExplanation += 'Transition (breach/choke): +1 concealment. ';
  } else if (input.siteLayer === 'interior') {
    concealment += 0.5;
    contextExplanation += 'Interior: close-quarters (+0.5 concealment). ';
  }
  // Transition type
  if (input.transitionType === 'chokepoint') {
    concealment += 1;
    contextExplanation += 'Chokepoint: +1 concealment. ';
  } else if (input.transitionType === 'threshold') {
    concealment += 0.5;
    contextExplanation += 'Threshold: +0.5 concealment. ';
  }
  // Container type (legacy)
  if (input.containerType === 'sealed') {
    concealment += 2;
    contextExplanation += 'Sealed container: +2 concealment penalty.';
  } else if (input.containerType === 'open') {
    concealment = Math.max(0, concealment - 1);
    contextExplanation += 'Open container: -1 concealment bonus.';
  }
  let base = input.teamCapability - concealment;
  const sources: ModifierSource[] = [
    { source: 'base', value: base }
  ];

  // Niche-driven modifiers and explanation
  const nicheModifier = getTeamNicheModifier(
    evaluateTagNicheFit(input.teamTags ?? [], 'recon'),
    { contextLabel: 'scouting' }
  );
  let roleExplanation = nicheModifier.reason;
  if (nicheModifier.delta !== 0) {
    sources.push({ source: 'niche:recon-fit', value: nicheModifier.delta });
  } else if (input.teamTags?.includes('scout')) {
    sources.push({ source: 'tag:scout', value: 1 });
    roleExplanation = 'Scout present: +1 bonus.';
  }
  if (input.anomalyTags?.includes('shapeshifter')) {
    sources.push({ source: 'tag:shapeshifter', value: 1 });
  }
  // Gear-driven modifier (e.g., 'thermal-vision')
  if (input.gearTags?.includes('thermal-vision')) {
    sources.push({ source: 'gear:thermal-vision', value: 1 });
  }
  // Condition-driven modifiers
  if (input.teamConditions?.includes('fatigued')) {
    sources.push({ source: 'condition:fatigued', value: -1 });
  }
  if (input.anomalyConditions?.includes('alerted')) {
    sources.push({ source: 'condition:alerted', value: 1 });
  }

  // Resistance/countermeasure logic for deception (anomaly concealment)
  if (hasEffectiveCountermeasure({ family: 'deception', presentTags: [
    ...(input.teamTags || []),
    ...(input.gearTags || [])
  ] })) {
    sources.push({ source: 'countermeasure:deception', value: 1 });
  }

  // Aggregate and cap
  const agg = aggregateModifiers(sources);
  const outcome = getOutcomeBand(agg.capped);
  const explanation = [
    `Scouting result: ${explainOutcome(outcome)}`,
    `Value: ${agg.capped} (${agg.total} raw)`,
    explainModifiers(agg),
    roleExplanation,
    contextExplanation.trim()
  ].filter(Boolean).join(' | ');

  // Reveal/withhold logic (example: success or strong reveals, fail/catastrophic withholds)
  const revealed = outcome === 'success' || outcome === 'strong';
  const withheld = outcome === 'fail' || outcome === 'catastrophic';

  return { outcome, value: agg.capped, explanation, revealed, withheld };
}

// Helper: explainModifiers imported from modifiers
import { explainModifiers } from './modifiers';
