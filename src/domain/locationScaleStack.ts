export type LinkedLocationScale = 'region' | 'approach' | 'site'
export type LinkedLocationRevealState = 'hidden' | 'partial' | 'revealed'
export type LinkedLocationFeatureKind =
  | 'road'
  | 'ferry'
  | 'river'
  | 'settlement'
  | 'keep'
  | 'lair'
  | 'civic_anchor'
  | 'landmark'
export type LinkedSiteViewKind =
  | 'plan'
  | 'section'
  | 'cutaway'
  | 'detached_submap'
  | 'campus_compound'
export type LinkedCampAction =
  | 'camouflage'
  | 'fortification'
  | 'foraging'
  | 'tend_wounded'
  | 'item_attunement'
  | 'rest'

export type LinkedSiteViewPlacementKind = 'primary' | 'detached' | 'inset'

export interface LinkedLocationIdentityInput {
  locationId: string
  canonicalName: string
  locationClass: string
}

export interface LinkedLocationFeatureInput {
  featureId: string
  featureName: string
  kind: LinkedLocationFeatureKind
  revealByScale?: Partial<Record<LinkedLocationScale, LinkedLocationRevealState>>
}

export interface LinkedRegionScaleInput {
  regionNodeId: string
  label: string
  routeId: string
  featureIds: readonly string[]
  revealState: LinkedLocationRevealState
}

export interface LinkedRegionalAnchorInput {
  anchorId: string
  label: string
  featureId: string
  regionNodeId: string
  routeId: string
}

export interface LinkedApproachHandleInput {
  handleId: string
  label: string
  anchorId: string
  approachNodeId: string
  routeId: string
  preservedFeatureIds: readonly string[]
}

export interface LinkedApproachCampInput {
  anchorId: string
  label: string
  routeId: string
  supportedActions: readonly LinkedCampAction[]
}

export interface LinkedApproachScaleInput {
  approachNodeId: string
  label: string
  routeId: string
  featureIds: readonly string[]
  revealState: LinkedLocationRevealState
  campAnchor?: LinkedApproachCampInput
}

export interface LinkedSiteViewInput {
  viewId: string
  kind: LinkedSiteViewKind
  placementKind?: LinkedSiteViewPlacementKind
  label: string
  routeId: string
  featureIds: readonly string[]
  revealState: LinkedLocationRevealState
  parentViewId?: string
  linkedAnchorId?: string
  linkedHandleId?: string
}

export interface LinkedSiteScaleInput {
  siteNodeId: string
  label: string
  routeId: string
  featureIds: readonly string[]
  revealState: LinkedLocationRevealState
  views: readonly LinkedSiteViewInput[]
}

export interface LinkedScaleTransitionInput {
  fromScale: LinkedLocationScale
  toScale: LinkedLocationScale
  fromNodeId: string
  toNodeId: string
  fromRouteId: string
  toRouteId: string
  preservedFeatureIds: readonly string[]
}

export interface LinkedLocationStackAuthoringInput {
  identity: LinkedLocationIdentityInput
  features: readonly LinkedLocationFeatureInput[]
  region: LinkedRegionScaleInput
  regionalAnchors?: readonly LinkedRegionalAnchorInput[]
  approach: LinkedApproachScaleInput
  approachHandles?: readonly LinkedApproachHandleInput[]
  site: LinkedSiteScaleInput
  transitions: readonly LinkedScaleTransitionInput[]
}

export interface LinkedLocationIdentity {
  locationId: string
  canonicalName: string
  locationClass: string
}

export interface LinkedLocationFeature {
  featureId: string
  featureName: string
  kind: LinkedLocationFeatureKind
  presentAtScales: LinkedLocationScale[]
  revealByScale: Record<LinkedLocationScale, LinkedLocationRevealState>
}

export interface LinkedRegionScale {
  scale: 'region'
  regionNodeId: string
  label: string
  routeId: string
  featureIds: string[]
  revealState: LinkedLocationRevealState
}

export interface LinkedApproachCamp {
  anchorId: string
  label: string
  routeId: string
  supportedActions: LinkedCampAction[]
}

export interface LinkedApproachScale {
  scale: 'approach'
  approachNodeId: string
  label: string
  routeId: string
  featureIds: string[]
  revealState: LinkedLocationRevealState
  campAnchor?: LinkedApproachCamp
}

export interface LinkedRegionalAnchor {
  anchorId: string
  label: string
  featureId: string
  regionNodeId: string
  routeId: string
}

export interface LinkedApproachHandle {
  handleId: string
  label: string
  anchorId: string
  approachNodeId: string
  routeId: string
  preservedFeatureIds: string[]
}

export interface LinkedSiteView {
  viewId: string
  kind: LinkedSiteViewKind
  placementKind: LinkedSiteViewPlacementKind
  label: string
  routeId: string
  featureIds: string[]
  revealState: LinkedLocationRevealState
  parentSiteNodeId: string
  parentViewId?: string
  linkedAnchorId?: string
  linkedHandleId?: string
}

export interface LinkedSiteScale {
  scale: 'site'
  siteNodeId: string
  label: string
  routeId: string
  featureIds: string[]
  revealState: LinkedLocationRevealState
  views: LinkedSiteView[]
}

export interface LinkedScaleTransition {
  transitionId: string
  fromScale: LinkedLocationScale
  toScale: LinkedLocationScale
  fromNodeId: string
  toNodeId: string
  fromRouteId: string
  toRouteId: string
  preservedFeatureIds: string[]
}

export interface LinkedLocationStackPacket {
  identity: LinkedLocationIdentity
  features: LinkedLocationFeature[]
  region: LinkedRegionScale
  regionalAnchors: LinkedRegionalAnchor[]
  approach: LinkedApproachScale
  approachHandles: LinkedApproachHandle[]
  site: LinkedSiteScale
  transitions: LinkedScaleTransition[]
}

export interface LinkedScaleTransitionResolution {
  locationId: string
  transitionId: string
  fromScale: LinkedLocationScale
  toScale: LinkedLocationScale
  continuityRouteIds: [string, string]
  preservedFeatureNames: string[]
  continuityStatus: 'continuous'
}

export interface LinkedScaleRevealProjection {
  locationId: string
  scale: LinkedLocationScale
  scaleRevealState: LinkedLocationRevealState
  visibleFeatureNames: string[]
  partialFeatureNames: string[]
  hiddenFeatureNames: string[]
}

export interface LinkedLocationTravelContext {
  locationId: string
  routeChain: string[]
  transitionIds: string[]
  preservedFeatureNames: string[]
  campAnchorId?: string
  supportedCampActions: LinkedCampAction[]
}

export interface LinkedApproachHandleResolution {
  locationId: string
  handleId: string
  anchorId: string
  continuityRouteIds: [string, string, string]
  preservedFeatureNames: string[]
  continuityStatus: 'continuous'
}

export interface LinkedDetachedSiteViewResolution {
  locationId: string
  parentSiteNodeId: string
  viewId: string
  kind: LinkedSiteViewKind
  placementKind: LinkedSiteViewPlacementKind
  continuityRouteId: string
  linkedAnchorId?: string
  linkedHandleId?: string
  continuityStatus: 'continuous'
}

function normalizeString(value: string): string {
  return value.trim()
}

function uniqueSorted(values: readonly string[]): string[] {
  return Array.from(new Set(values.map((value) => normalizeString(value)).filter(Boolean))).sort(
    (left, right) => left.localeCompare(right)
  )
}

function sortByKey<T>(items: readonly T[], getKey: (item: T) => string): T[] {
  return [...items].sort((left, right) => getKey(left).localeCompare(getKey(right)))
}

function buildPresenceMap(input: LinkedLocationStackAuthoringInput): Map<string, Set<LinkedLocationScale>> {
  const presence = new Map<string, Set<LinkedLocationScale>>()

  function mark(scale: LinkedLocationScale, featureIds: readonly string[]) {
    for (const rawFeatureId of featureIds) {
      const featureId = normalizeString(rawFeatureId)
      if (!presence.has(featureId)) {
        presence.set(featureId, new Set())
      }
      presence.get(featureId)?.add(scale)
    }
  }

  mark('region', input.region.featureIds)
  mark('approach', input.approach.featureIds)
  mark('site', input.site.featureIds)

  for (const view of input.site.views) {
    mark('site', view.featureIds)
  }

  return presence
}

function toRevealByScale(
  input: LinkedLocationFeatureInput,
  presentAtScales: readonly LinkedLocationScale[]
): Record<LinkedLocationScale, LinkedLocationRevealState> {
  const present = new Set(presentAtScales)
  const overrides = input.revealByScale ?? {}

  return {
    region: overrides.region ?? (present.has('region') ? 'revealed' : 'hidden'),
    approach: overrides.approach ?? (present.has('approach') ? 'revealed' : 'hidden'),
    site: overrides.site ?? (present.has('site') ? 'revealed' : 'hidden'),
  }
}

function buildTransitionId(
  locationId: string,
  fromScale: LinkedLocationScale,
  toScale: LinkedLocationScale,
  fromNodeId: string,
  toNodeId: string
): string {
  return `${locationId}:${fromScale}:${toScale}:${fromNodeId}:${toNodeId}`
}

export function deriveLinkedLocationStack(
  input: LinkedLocationStackAuthoringInput
): LinkedLocationStackPacket {
  const identity: LinkedLocationIdentity = {
    locationId: normalizeString(input.identity.locationId),
    canonicalName: normalizeString(input.identity.canonicalName),
    locationClass: normalizeString(input.identity.locationClass),
  }

  const presenceMap = buildPresenceMap(input)
  const features = sortByKey(
    input.features.map((feature) => {
      const featureId = normalizeString(feature.featureId)
      const presentAtScales = uniqueSorted(Array.from(presenceMap.get(featureId) ?? [])) as LinkedLocationScale[]

      return {
        featureId,
        featureName: normalizeString(feature.featureName),
        kind: feature.kind,
        presentAtScales,
        revealByScale: toRevealByScale(feature, presentAtScales),
      }
    }),
    (feature) => feature.featureId
  )

  const region: LinkedRegionScale = {
    scale: 'region',
    regionNodeId: normalizeString(input.region.regionNodeId),
    label: normalizeString(input.region.label),
    routeId: normalizeString(input.region.routeId),
    featureIds: uniqueSorted(input.region.featureIds),
    revealState: input.region.revealState,
  }

  const regionalAnchors: LinkedRegionalAnchor[] = sortByKey(
    (input.regionalAnchors ?? []).map((anchor) => ({
      anchorId: normalizeString(anchor.anchorId),
      label: normalizeString(anchor.label),
      featureId: normalizeString(anchor.featureId),
      regionNodeId: normalizeString(anchor.regionNodeId),
      routeId: normalizeString(anchor.routeId),
    })),
    (anchor) => anchor.anchorId
  )

  const approach: LinkedApproachScale = {
    scale: 'approach',
    approachNodeId: normalizeString(input.approach.approachNodeId),
    label: normalizeString(input.approach.label),
    routeId: normalizeString(input.approach.routeId),
    featureIds: uniqueSorted(input.approach.featureIds),
    revealState: input.approach.revealState,
    ...(input.approach.campAnchor
      ? {
          campAnchor: {
            anchorId: normalizeString(input.approach.campAnchor.anchorId),
            label: normalizeString(input.approach.campAnchor.label),
            routeId: normalizeString(input.approach.campAnchor.routeId),
            supportedActions: uniqueSorted(
              input.approach.campAnchor.supportedActions
            ) as LinkedCampAction[],
          },
        }
      : {}),
  }

  const approachHandles: LinkedApproachHandle[] = sortByKey(
    (input.approachHandles ?? []).map((handle) => ({
      handleId: normalizeString(handle.handleId),
      label: normalizeString(handle.label),
      anchorId: normalizeString(handle.anchorId),
      approachNodeId: normalizeString(handle.approachNodeId),
      routeId: normalizeString(handle.routeId),
      preservedFeatureIds: uniqueSorted(handle.preservedFeatureIds),
    })),
    (handle) => handle.handleId
  )

  const site: LinkedSiteScale = {
    scale: 'site',
    siteNodeId: normalizeString(input.site.siteNodeId),
    label: normalizeString(input.site.label),
    routeId: normalizeString(input.site.routeId),
    featureIds: uniqueSorted(input.site.featureIds),
    revealState: input.site.revealState,
    views: sortByKey(
      input.site.views.map((view) => ({
        viewId: normalizeString(view.viewId),
        kind: view.kind,
        placementKind:
          view.placementKind ??
          (view.kind === 'detached_submap'
            ? 'detached'
            : view.kind === 'section' || view.kind === 'cutaway'
              ? 'inset'
              : 'primary'),
        label: normalizeString(view.label),
        routeId: normalizeString(view.routeId),
        featureIds: uniqueSorted(view.featureIds),
        revealState: view.revealState,
        parentSiteNodeId: normalizeString(input.site.siteNodeId),
        ...(view.parentViewId ? { parentViewId: normalizeString(view.parentViewId) } : {}),
        ...(view.linkedAnchorId ? { linkedAnchorId: normalizeString(view.linkedAnchorId) } : {}),
        ...(view.linkedHandleId ? { linkedHandleId: normalizeString(view.linkedHandleId) } : {}),
      })),
      (view) => view.viewId
    ),
  }

  const transitions = sortByKey(
    input.transitions.map((transition) => ({
      transitionId: buildTransitionId(
        identity.locationId,
        transition.fromScale,
        transition.toScale,
        normalizeString(transition.fromNodeId),
        normalizeString(transition.toNodeId)
      ),
      fromScale: transition.fromScale,
      toScale: transition.toScale,
      fromNodeId: normalizeString(transition.fromNodeId),
      toNodeId: normalizeString(transition.toNodeId),
      fromRouteId: normalizeString(transition.fromRouteId),
      toRouteId: normalizeString(transition.toRouteId),
      preservedFeatureIds: uniqueSorted(transition.preservedFeatureIds),
    })),
    (transition) => transition.transitionId
  )

  return {
    identity,
    features,
    region,
    regionalAnchors,
    approach,
    approachHandles,
    site,
    transitions,
  }
}

export function resolveLinkedApproachHandle(
  packet: LinkedLocationStackPacket,
  handleId: string
): LinkedApproachHandleResolution {
  const normalizedHandleId = normalizeString(handleId)
  const handle = packet.approachHandles.find((candidate) => candidate.handleId === normalizedHandleId)
  if (!handle) {
    throw new Error(`Missing linked approach handle ${normalizedHandleId}`)
  }

  const anchor = packet.regionalAnchors.find((candidate) => candidate.anchorId === handle.anchorId)
  if (!anchor) {
    throw new Error(`Missing linked regional anchor ${handle.anchorId}`)
  }

  const featureNameById = new Map(packet.features.map((feature) => [feature.featureId, feature.featureName]))

  return {
    locationId: packet.identity.locationId,
    handleId: handle.handleId,
    anchorId: handle.anchorId,
    continuityRouteIds: [anchor.routeId, handle.routeId, packet.site.routeId],
    preservedFeatureNames: handle.preservedFeatureIds
      .map((featureId) => featureNameById.get(featureId))
      .filter((featureName): featureName is string => Boolean(featureName)),
    continuityStatus: 'continuous',
  }
}

export function resolveLinkedDetachedSiteView(
  packet: LinkedLocationStackPacket,
  viewId: string
): LinkedDetachedSiteViewResolution {
  const normalizedViewId = normalizeString(viewId)
  const view = packet.site.views.find((candidate) => candidate.viewId === normalizedViewId)
  if (!view) {
    throw new Error(`Missing linked site view ${normalizedViewId}`)
  }

  return {
    locationId: packet.identity.locationId,
    parentSiteNodeId: packet.site.siteNodeId,
    viewId: view.viewId,
    kind: view.kind,
    placementKind: view.placementKind,
    continuityRouteId: view.routeId,
    ...(view.linkedAnchorId ? { linkedAnchorId: view.linkedAnchorId } : {}),
    ...(view.linkedHandleId ? { linkedHandleId: view.linkedHandleId } : {}),
    continuityStatus: 'continuous',
  }
}

export function resolveLinkedScaleTransition(
  packet: LinkedLocationStackPacket,
  fromScale: LinkedLocationScale,
  toScale: LinkedLocationScale
): LinkedScaleTransitionResolution {
  const transition = packet.transitions.find(
    (candidate) => candidate.fromScale === fromScale && candidate.toScale === toScale
  )
  if (!transition) {
    throw new Error(`Missing linked transition for ${fromScale} -> ${toScale}`)
  }

  const featureNameById = new Map(packet.features.map((feature) => [feature.featureId, feature.featureName]))

  return {
    locationId: packet.identity.locationId,
    transitionId: transition.transitionId,
    fromScale,
    toScale,
    continuityRouteIds: [transition.fromRouteId, transition.toRouteId],
    preservedFeatureNames: transition.preservedFeatureIds
      .map((featureId) => featureNameById.get(featureId))
      .filter((featureName): featureName is string => Boolean(featureName)),
    continuityStatus: 'continuous',
  }
}

export function projectLinkedScaleReveal(
  packet: LinkedLocationStackPacket,
  scale: LinkedLocationScale
): LinkedScaleRevealProjection {
  const scaleRevealState =
    scale === 'region'
      ? packet.region.revealState
      : scale === 'approach'
        ? packet.approach.revealState
        : packet.site.revealState

  const visibleFeatureNames: string[] = []
  const partialFeatureNames: string[] = []
  const hiddenFeatureNames: string[] = []

  for (const feature of packet.features) {
    const revealState = feature.revealByScale[scale]
    if (revealState === 'revealed') {
      visibleFeatureNames.push(feature.featureName)
    } else if (revealState === 'partial') {
      partialFeatureNames.push(feature.featureName)
    } else {
      hiddenFeatureNames.push(feature.featureName)
    }
  }

  return {
    locationId: packet.identity.locationId,
    scale,
    scaleRevealState,
    visibleFeatureNames,
    partialFeatureNames,
    hiddenFeatureNames,
  }
}

export function resolveLinkedLocationTravelContext(
  packet: LinkedLocationStackPacket
): LinkedLocationTravelContext {
  const regionToApproach = resolveLinkedScaleTransition(packet, 'region', 'approach')
  const approachToSite = resolveLinkedScaleTransition(packet, 'approach', 'site')

  return {
    locationId: packet.identity.locationId,
    routeChain: [
      regionToApproach.continuityRouteIds[0],
      regionToApproach.continuityRouteIds[1],
      approachToSite.continuityRouteIds[1],
    ],
    transitionIds: [regionToApproach.transitionId, approachToSite.transitionId],
    preservedFeatureNames: uniqueSorted([
      ...regionToApproach.preservedFeatureNames,
      ...approachToSite.preservedFeatureNames,
    ]),
    campAnchorId: packet.approach.campAnchor?.anchorId,
    supportedCampActions: [...(packet.approach.campAnchor?.supportedActions ?? [])],
  }
}
