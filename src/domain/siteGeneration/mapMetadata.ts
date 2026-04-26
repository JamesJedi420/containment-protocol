import type { SiteGenerationStageSnapshot, SiteHazardId, SiteTopologyId } from './packets'

// ─── Public types ─────────────────────────────────────────────────────────────

export interface MapSymbolRouteEffect {
  /** Restricts how many operatives can traverse a route at once */
  passRestriction: 'single-file' | 'one-way' | null
  /** Negative = operatives gain concealment while traversing; positive = exposed */
  visibilityMod: number
}

export interface MapSymbol {
  id: string
  glyph: string
  name: string
  interactionHint: string
  /** true = symbol not visible on initial map layer; requires successful recon to reveal */
  hiddenUntilReveal: boolean
  /** Non-null means this symbol materially changes route traversal understanding */
  routeEffect: MapSymbolRouteEffect | null
}

export interface RouteAnnotation {
  id: string
  label: string
  routeClass: 'open' | 'choke' | 'exposed' | 'concealed' | 'rigged'
  activeSymbolIds: readonly string[]
}

// ─── Cross-scale types ───────────────────────────────────────────────────────

/** Depth band assigned to a zone — from coarsest (region) to finest (room) grain. */
export type ZoneDepthBand = 'region' | 'district' | 'building' | 'room'

/**
 * A directed link between two zones that cross a scale boundary.
 * Anchors are always aligned to a specific route and carry an access tier that
 * determines whether institutional defenders gain a positional advantage.
 */
export interface ScaleAnchor {
  /** Stable identifier, e.g. 'district_to_building'. */
  id: string
  fromDepthBand: ZoneDepthBand
  toDepthBand: ZoneDepthBand
  /** Must match a ZoneAnnotation.id in the same MapLayerResult. */
  fromZoneId: string
  /** Must match a ZoneAnnotation.id in the same MapLayerResult. */
  toZoneId: string
  /** Must match a RouteAnnotation.id in the same MapLayerResult. */
  routeId: string
  /**
   * open: scale transition is uncontrolled (no institutional advantage).
   * restricted: access is checked — defenders have a positional advantage.
   * locked: access is actively denied — maximum positional advantage.
   */
  accessTier: 'open' | 'restricted' | 'locked'
}

export interface ZoneAnnotation {
  id: string
  name: string
  symbolIds: readonly string[]
  hiddenSymbolIds: readonly string[]
  /** Depth-band classification for this zone. Undefined on non-annotated single-scale topologies. */
  depthBand?: ZoneDepthBand
}

export interface MapLayerResult {
  /**
   * map-metadata-first: zones and symbols express the primary useful content.
   * prose-key-first: symbols are supplemental; room prose is the primary source.
   */
  authoringMode: 'map-metadata-first' | 'prose-key-first'
  /** All symbols referenced anywhere in this layer — shared vocabulary for the legend */
  legend: readonly MapSymbol[]
  zones: readonly ZoneAnnotation[]
  routes: readonly RouteAnnotation[]
  /** Route IDs known to current occupiers. Concealed routes are excluded — they predate or escape occupier awareness. Derived deterministically at generation time. */
  occupierKnownRouteIds: readonly string[]
  /**
   * SPE-451: Directed cross-scale links. Empty for single-scale topologies.
   * Each anchor ties a route to a scale-boundary transition, allowing consumers
   * to distinguish institutional depth-band traversal from intra-scale movement.
   */
  scaleAnchors: readonly ScaleAnchor[]
}

// ─── Symbol catalog ───────────────────────────────────────────────────────────

const MAP_SYMBOL_CATALOG: Readonly<Record<string, MapSymbol>> = {
  ward_glyph: {
    id: 'ward_glyph',
    glyph: 'W',
    name: 'Ward Glyph',
    interactionHint:
      'Activates ward_feedback on unchecked crossing; anti-ward kit required to suppress. Narrows effective passage width.',
    hiddenUntilReveal: true,
    routeEffect: { passRestriction: 'single-file', visibilityMod: -1 },
  },
  choke_bolt: {
    id: 'choke_bolt',
    glyph: 'X',
    name: 'Choke Bolt',
    interactionHint:
      'Locked choke bolt: only one operative at a time may pass; full breach kit required to open wide passage.',
    hiddenUntilReveal: false,
    routeEffect: { passRestriction: 'single-file', visibilityMod: 0 },
  },
  structural_crack: {
    id: 'structural_crack',
    glyph: '/',
    name: 'Structural Crack',
    interactionHint:
      'Structural weakness: loud engagement risks structural_fall; movement within zone costs one additional action.',
    hiddenUntilReveal: false,
    routeEffect: null,
  },
  blood_trap_marker: {
    id: 'blood_trap_marker',
    glyph: 'B',
    name: 'Blood Trap Marker',
    interactionHint:
      'Pressure-trigger blood trap: activates blood_traps hazard on threshold crossing; disarm with medical kit.',
    hiddenUntilReveal: true,
    routeEffect: null,
  },
  predator_cache: {
    id: 'predator_cache',
    glyph: 'P',
    name: 'Predator Cache',
    interactionHint:
      'Feral feeding cache: disturbing it triggers predator_ambush; requires stealth approach or controlled engagement.',
    hiddenUntilReveal: true,
    routeEffect: null,
  },
  concealed_shaft: {
    id: 'concealed_shaft',
    glyph: 'S',
    name: 'Concealed Shaft',
    interactionHint:
      'Hidden secondary ingress: revealed on successful recon; allows one operative to bypass main entry via one-way crawl.',
    hiddenUntilReveal: true,
    routeEffect: { passRestriction: 'one-way', visibilityMod: -2 },
  },
}

// ─── Topology map profiles ────────────────────────────────────────────────────

interface HazardSymbolPlacement {
  hazardId: SiteHazardId
  zoneId: string
  symbolId: string
}

interface TopologyMapProfile {
  authoringMode: 'map-metadata-first' | 'prose-key-first'
  baseZones: readonly { id: string; name: string; depthBand?: ZoneDepthBand }[]
  baseRoutes: readonly RouteAnnotation[]
  staticSymbolsByZone: Readonly<Record<string, { visible: readonly string[]; hidden: readonly string[] }>>
  hazardSymbolPlacements: readonly HazardSymbolPlacement[]
  scaleAnchors: readonly ScaleAnchor[]
}

const TOPOLOGY_MAP_PROFILES: Record<SiteTopologyId, TopologyMapProfile> = {
  // SPE-451: concentric_sanctum is the canonical multi-scale institutional topology.
  // outer_ring = district-scale public approach; middle_ring = building-scale controlled
  // corridor; inner_sanctum = room-scale secure core. Two scale anchors mark the
  // transitions: the first is restricted (access checked), the second is locked
  // (access actively denied), conferring increasing institutional defense advantage.
  concentric_sanctum: {
    authoringMode: 'map-metadata-first',
    baseZones: [
      { id: 'outer_ring', name: 'Outer Ring', depthBand: 'district' },
      { id: 'middle_ring', name: 'Middle Ring', depthBand: 'building' },
      { id: 'inner_sanctum', name: 'Inner Sanctum', depthBand: 'room' },
    ],
    baseRoutes: [
      {
        id: 'outer_to_middle',
        label: 'Outer Ring → Middle Ring',
        routeClass: 'choke',
        activeSymbolIds: ['choke_bolt'],
      },
      {
        id: 'middle_to_inner',
        label: 'Middle Ring → Inner Sanctum',
        routeClass: 'choke',
        activeSymbolIds: ['ward_glyph'],
      },
    ],
    staticSymbolsByZone: {
      outer_ring: { visible: ['structural_crack'], hidden: [] },
      middle_ring: { visible: [], hidden: [] },
      inner_sanctum: { visible: [], hidden: [] },
    },
    hazardSymbolPlacements: [
      { hazardId: 'ward_feedback', zoneId: 'middle_ring', symbolId: 'ward_glyph' },
      { hazardId: 'ward_feedback', zoneId: 'inner_sanctum', symbolId: 'ward_glyph' },
      { hazardId: 'ritual_backwash', zoneId: 'inner_sanctum', symbolId: 'ward_glyph' },
      { hazardId: 'structural_fall', zoneId: 'outer_ring', symbolId: 'structural_crack' },
    ],
    scaleAnchors: [
      {
        id: 'district_to_building',
        fromDepthBand: 'district',
        toDepthBand: 'building',
        fromZoneId: 'outer_ring',
        toZoneId: 'middle_ring',
        routeId: 'outer_to_middle',
        accessTier: 'restricted',
      },
      {
        id: 'building_to_room',
        fromDepthBand: 'building',
        toDepthBand: 'room',
        fromZoneId: 'middle_ring',
        toZoneId: 'inner_sanctum',
        routeId: 'middle_to_inner',
        accessTier: 'locked',
      },
    ],
  },

  lure_corridors: {
    authoringMode: 'map-metadata-first',
    baseZones: [
      { id: 'entry_gallery', name: 'Entry Gallery', depthBand: 'building' },
      { id: 'bait_chamber', name: 'Bait Chamber', depthBand: 'building' },
      { id: 'collapse_throat', name: 'Collapse Throat', depthBand: 'building' },
    ],
    baseRoutes: [
      {
        id: 'entry_to_bait',
        label: 'Entry Gallery → Bait Chamber',
        routeClass: 'exposed',
        activeSymbolIds: [],
      },
      {
        id: 'bait_to_collapse',
        label: 'Bait Chamber → Collapse Throat',
        routeClass: 'rigged',
        activeSymbolIds: ['blood_trap_marker'],
      },
    ],
    staticSymbolsByZone: {
      entry_gallery: { visible: [], hidden: [] },
      bait_chamber: { visible: [], hidden: [] },
      collapse_throat: { visible: [], hidden: [] },
    },
    hazardSymbolPlacements: [
      { hazardId: 'predator_ambush', zoneId: 'bait_chamber', symbolId: 'predator_cache' },
      { hazardId: 'blood_traps', zoneId: 'collapse_throat', symbolId: 'blood_trap_marker' },
      { hazardId: 'structural_fall', zoneId: 'collapse_throat', symbolId: 'structural_crack' },
    ],
    scaleAnchors: [],
  },

  collapsed_cells: {
    authoringMode: 'prose-key-first',
    baseZones: [
      { id: 'cell_block', name: 'Cell Block', depthBand: 'building' },
      { id: 'rubble_access', name: 'Rubble Access', depthBand: 'building' },
    ],
    baseRoutes: [
      {
        id: 'cell_to_rubble',
        label: 'Cell Block → Rubble Access',
        routeClass: 'concealed',
        activeSymbolIds: [],
      },
    ],
    staticSymbolsByZone: {
      cell_block: { visible: [], hidden: [] },
      rubble_access: { visible: ['structural_crack'], hidden: [] },
    },
    hazardSymbolPlacements: [
      { hazardId: 'structural_fall', zoneId: 'cell_block', symbolId: 'structural_crack' },
      { hazardId: 'structural_fall', zoneId: 'rubble_access', symbolId: 'structural_crack' },
    ],
    scaleAnchors: [],
  },
}

// ─── Optional ingress-derived symbol placement ────────────────────────────────

const INGRESS_OPTIONAL_SYMBOLS: Readonly<
  Record<string, { zoneIndex: number; symbolId: string; threshold: number }>
> = {
  maintenance_shaft: { zoneIndex: 0, symbolId: 'concealed_shaft', threshold: 0.55 },
  storm_drain: { zoneIndex: 0, symbolId: 'concealed_shaft', threshold: 0.45 },
}

// ─── Resolver ─────────────────────────────────────────────────────────────────

function lookupSymbol(id: string): MapSymbol | undefined {
  return MAP_SYMBOL_CATALOG[id]
}

export function resolveMapMetadata(
  stages: SiteGenerationStageSnapshot,
  rng: () => number
): MapLayerResult {
  const profile = TOPOLOGY_MAP_PROFILES[stages.topology]

  // Build per-zone symbol sets from static definitions
  const zoneVisible: Record<string, Set<string>> = {}
  const zoneHidden: Record<string, Set<string>> = {}

  for (const zone of profile.baseZones) {
    const staticEntry = profile.staticSymbolsByZone[zone.id]
    zoneVisible[zone.id] = new Set(staticEntry?.visible ?? [])
    zoneHidden[zone.id] = new Set(staticEntry?.hidden ?? [])
  }

  // Apply hazard-driven symbol placements
  for (const placement of profile.hazardSymbolPlacements) {
    if (stages.hazards.includes(placement.hazardId)) {
      const symbol = lookupSymbol(placement.symbolId)
      if (symbol) {
        if (symbol.hiddenUntilReveal) {
          zoneHidden[placement.zoneId]?.add(placement.symbolId)
        } else {
          zoneVisible[placement.zoneId]?.add(placement.symbolId)
        }
      }
    }
  }

  // Apply optional ingress-derived symbol (rng-gated)
  const ingressOptional = INGRESS_OPTIONAL_SYMBOLS[stages.ingress]
  if (ingressOptional) {
    const roll = rng()
    const targetZone = profile.baseZones[ingressOptional.zoneIndex]
    if (roll >= ingressOptional.threshold && targetZone) {
      const symbol = lookupSymbol(ingressOptional.symbolId)
      if (symbol) {
        if (symbol.hiddenUntilReveal) {
          zoneHidden[targetZone.id]?.add(ingressOptional.symbolId)
        } else {
          zoneVisible[targetZone.id]?.add(ingressOptional.symbolId)
        }
      }
    }
  }

  const zones: ZoneAnnotation[] = profile.baseZones.map((z) => ({
    id: z.id,
    name: z.name,
    symbolIds: [...(zoneVisible[z.id] ?? [])],
    hiddenSymbolIds: [...(zoneHidden[z.id] ?? [])],
    depthBand: z.depthBand,
  }))

  // Collect all referenced symbol IDs to assemble the legend
  const allSymbolIds = new Set<string>()
  for (const zone of zones) {
    for (const id of zone.symbolIds) allSymbolIds.add(id)
    for (const id of zone.hiddenSymbolIds) allSymbolIds.add(id)
  }
  for (const route of profile.baseRoutes) {
    for (const id of route.activeSymbolIds) allSymbolIds.add(id)
  }

  const legend = [...allSymbolIds]
    .map((id) => lookupSymbol(id))
    .filter((s): s is MapSymbol => s !== undefined)

  const occupierKnownRouteIds = profile.baseRoutes
    .filter((r) => r.routeClass !== 'concealed')
    .map((r) => r.id)

  return {
    authoringMode: profile.authoringMode,
    legend,
    zones,
    routes: profile.baseRoutes,
    occupierKnownRouteIds,
    scaleAnchors: profile.scaleAnchors,
  }
}

// ─── Cross-scale helpers ──────────────────────────────────────────────────────

/**
 * Returns true if this map layer spans more than one depth band
 * (i.e., at least one scale anchor exists).
 */
export function isMultiScaleMapLayer(mapLayer: MapLayerResult): boolean {
  return mapLayer.scaleAnchors.length > 0
}

/**
 * Returns scale anchors whose access tier is 'restricted' or 'locked'.
 * These represent controlled boundaries between depth bands where institutional
 * defenders hold a positional advantage.
 */
export function getRestrictedScaleAnchors(mapLayer: MapLayerResult): readonly ScaleAnchor[] {
  return mapLayer.scaleAnchors.filter(
    (anchor) => anchor.accessTier === 'restricted' || anchor.accessTier === 'locked'
  )
}
