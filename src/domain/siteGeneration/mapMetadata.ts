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

export interface ZoneAnnotation {
  id: string
  name: string
  symbolIds: readonly string[]
  hiddenSymbolIds: readonly string[]
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
  baseZones: readonly { id: string; name: string }[]
  baseRoutes: readonly RouteAnnotation[]
  staticSymbolsByZone: Readonly<Record<string, { visible: readonly string[]; hidden: readonly string[] }>>
  hazardSymbolPlacements: readonly HazardSymbolPlacement[]
}

const TOPOLOGY_MAP_PROFILES: Record<SiteTopologyId, TopologyMapProfile> = {
  concentric_sanctum: {
    authoringMode: 'map-metadata-first',
    baseZones: [
      { id: 'outer_ring', name: 'Outer Ring' },
      { id: 'middle_ring', name: 'Middle Ring' },
      { id: 'inner_sanctum', name: 'Inner Sanctum' },
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
  },

  lure_corridors: {
    authoringMode: 'map-metadata-first',
    baseZones: [
      { id: 'entry_gallery', name: 'Entry Gallery' },
      { id: 'bait_chamber', name: 'Bait Chamber' },
      { id: 'collapse_throat', name: 'Collapse Throat' },
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
  },

  collapsed_cells: {
    authoringMode: 'prose-key-first',
    baseZones: [
      { id: 'cell_block', name: 'Cell Block' },
      { id: 'rubble_access', name: 'Rubble Access' },
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

  return {
    authoringMode: profile.authoringMode,
    legend,
    zones,
    routes: profile.baseRoutes,
  }
}
