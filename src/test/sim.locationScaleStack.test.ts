import { describe, expect, it } from 'vitest'
import {
  deriveLinkedLocationStack,
  projectLinkedScaleReveal,
  resolveLinkedApproachHandle,
  resolveLinkedCampPhaseAction,
  resolveLinkedDetachedSiteView,
  resolveLinkedLocationTravelContext,
  resolveLinkedRoutePhaseContext,
  resolveLinkedScaleTransition,
  type LinkedLocationStackAuthoringInput,
} from '../domain/locationScaleStack'

function makeLinkedLocationInput(): LinkedLocationStackAuthoringInput {
  return {
    identity: {
      locationId: 'loc:rivergate-ferry-keep',
      canonicalName: 'Rivergate Ferry Keep',
      locationClass: 'riverside_civic_strongpoint',
    },
    features: [
      {
        featureId: 'feature:blackwater-river',
        featureName: 'Blackwater River',
        kind: 'river',
        revealByScale: {
          region: 'revealed',
          approach: 'revealed',
          site: 'partial',
        },
      },
      {
        featureId: 'feature:rivergate-ferry',
        featureName: 'Rivergate Ferry',
        kind: 'ferry',
        revealByScale: {
          region: 'partial',
          approach: 'revealed',
          site: 'hidden',
        },
      },
      {
        featureId: 'feature:lantern-keep',
        featureName: 'Lantern Keep',
        kind: 'keep',
        revealByScale: {
          region: 'partial',
          approach: 'revealed',
          site: 'revealed',
        },
      },
      {
        featureId: 'feature:market-road',
        featureName: 'Market Road',
        kind: 'road',
        revealByScale: {
          region: 'hidden',
          approach: 'revealed',
          site: 'partial',
        },
      },
      {
        featureId: 'feature:north-gate',
        featureName: 'North Gate',
        kind: 'landmark',
        revealByScale: {
          region: 'hidden',
          approach: 'partial',
          site: 'revealed',
        },
      },
      {
        featureId: 'feature:chapel-yard',
        featureName: 'Chapel Yard',
        kind: 'civic_anchor',
        revealByScale: {
          region: 'hidden',
          approach: 'hidden',
          site: 'revealed',
        },
      },
      {
        featureId: 'feature:undercroft',
        featureName: 'Undercroft',
        kind: 'landmark',
        revealByScale: {
          region: 'hidden',
          approach: 'hidden',
          site: 'hidden',
        },
      },
    ],
    region: {
      regionNodeId: 'region:blackwater-bend',
      label: 'Blackwater Bend',
      routeId: 'route:kings-road',
      featureIds: ['feature:blackwater-river', 'feature:rivergate-ferry', 'feature:lantern-keep'],
      revealState: 'partial',
    },
    regionalAnchors: [
      {
        anchorId: 'anchor:river-bend-beacon',
        label: 'River Bend Beacon',
        featureId: 'feature:blackwater-river',
        regionNodeId: 'region:blackwater-bend',
        routeId: 'route:kings-road',
      },
    ],
    approach: {
      approachNodeId: 'approach:rivergate-causeway',
      label: 'Rivergate Causeway',
      routeId: 'route:causeway-road',
      featureIds: [
        'feature:blackwater-river',
        'feature:rivergate-ferry',
        'feature:lantern-keep',
        'feature:market-road',
        'feature:north-gate',
      ],
      revealState: 'revealed',
      campAnchor: {
        anchorId: 'camp:causeway-grove',
        label: 'Causeway Grove',
        routeId: 'route:causeway-road',
        supportedActions: ['fortification', 'rest'],
      },
    },
    approachHandles: [
      {
        handleId: 'handle:beacon-causeway',
        label: 'Beacon Causeway Handle',
        anchorId: 'anchor:river-bend-beacon',
        approachNodeId: 'approach:rivergate-causeway',
        routeId: 'route:causeway-road',
        preservedFeatureIds: ['feature:blackwater-river', 'feature:north-gate'],
      },
    ],
    site: {
      siteNodeId: 'site:lantern-keep',
      label: 'Lantern Keep Grounds',
      routeId: 'route:north-gate',
      featureIds: ['feature:lantern-keep', 'feature:north-gate', 'feature:chapel-yard'],
      revealState: 'partial',
      views: [
        {
          viewId: 'site-view:keep-plan',
          kind: 'plan',
          placementKind: 'primary',
          label: 'Lantern Keep Plan',
          routeId: 'route:north-gate',
          featureIds: ['feature:lantern-keep', 'feature:north-gate', 'feature:chapel-yard'],
          revealState: 'partial',
        },
        {
          viewId: 'site-view:undercroft-detached',
          kind: 'detached_submap',
          placementKind: 'detached',
          label: 'Undercroft Detached Map',
          routeId: 'route:service-stairs',
          featureIds: ['feature:undercroft'],
          revealState: 'hidden',
          linkedAnchorId: 'anchor:river-bend-beacon',
          linkedHandleId: 'handle:beacon-causeway',
          parentViewId: 'site-view:keep-plan',
        },
        {
          viewId: 'site-view:north-gate-section',
          kind: 'section',
          placementKind: 'inset',
          label: 'North Gate Section',
          routeId: 'route:north-gate',
          featureIds: ['feature:north-gate'],
          revealState: 'partial',
          parentViewId: 'site-view:keep-plan',
        },
      ],
    },
    transitions: [
      {
        fromScale: 'region',
        toScale: 'approach',
        fromNodeId: 'region:blackwater-bend',
        toNodeId: 'approach:rivergate-causeway',
        fromRouteId: 'route:kings-road',
        toRouteId: 'route:causeway-road',
        preservedFeatureIds: [
          'feature:blackwater-river',
          'feature:rivergate-ferry',
          'feature:lantern-keep',
        ],
      },
      {
        fromScale: 'approach',
        toScale: 'site',
        fromNodeId: 'approach:rivergate-causeway',
        toNodeId: 'site:lantern-keep',
        fromRouteId: 'route:causeway-road',
        toRouteId: 'route:north-gate',
        preservedFeatureIds: ['feature:lantern-keep', 'feature:market-road', 'feature:north-gate'],
      },
    ],
  }
}

describe('locationScaleStack', () => {
  it('preserves one shared location identity across region, approach, and site scales', () => {
    const stack = deriveLinkedLocationStack(makeLinkedLocationInput())

    expect(stack.identity).toEqual({
      locationId: 'loc:rivergate-ferry-keep',
      canonicalName: 'Rivergate Ferry Keep',
      locationClass: 'riverside_civic_strongpoint',
    })
    expect(stack.region.regionNodeId).toBe('region:blackwater-bend')
    expect(stack.approach.approachNodeId).toBe('approach:rivergate-causeway')
    expect(stack.site.siteNodeId).toBe('site:lantern-keep')
    expect(stack.transitions.map((transition) => transition.transitionId)).toEqual([
      'loc:rivergate-ferry-keep:approach:site:approach:rivergate-causeway:site:lantern-keep',
      'loc:rivergate-ferry-keep:region:approach:region:blackwater-bend:approach:rivergate-causeway',
    ])
  })

  it('preserves named features and route continuity across deterministic scale transitions', () => {
    const stack = deriveLinkedLocationStack(makeLinkedLocationInput())
    const regionToApproach = resolveLinkedScaleTransition(stack, 'region', 'approach')
    const approachToSite = resolveLinkedScaleTransition(stack, 'approach', 'site')

    expect(regionToApproach.continuityRouteIds).toEqual([
      'route:kings-road',
      'route:causeway-road',
    ])
    expect(regionToApproach.preservedFeatureNames).toEqual([
      'Blackwater River',
      'Lantern Keep',
      'Rivergate Ferry',
    ])
    expect(approachToSite.continuityRouteIds).toEqual([
      'route:causeway-road',
      'route:north-gate',
    ])
    expect(approachToSite.preservedFeatureNames).toEqual([
      'Lantern Keep',
      'Market Road',
      'North Gate',
    ])
  })

  it('allows reveal state to differ by scale without losing the shared identity', () => {
    const stack = deriveLinkedLocationStack(makeLinkedLocationInput())
    const regionReveal = projectLinkedScaleReveal(stack, 'region')
    const approachReveal = projectLinkedScaleReveal(stack, 'approach')
    const siteReveal = projectLinkedScaleReveal(stack, 'site')

    expect(regionReveal.locationId).toBe('loc:rivergate-ferry-keep')
    expect(regionReveal.scaleRevealState).toBe('partial')
    expect(regionReveal.visibleFeatureNames).toEqual(['Blackwater River'])
    expect(regionReveal.partialFeatureNames).toEqual(['Lantern Keep', 'Rivergate Ferry'])
    expect(regionReveal.hiddenFeatureNames).toContain('North Gate')

    expect(approachReveal.scaleRevealState).toBe('revealed')
    expect(approachReveal.visibleFeatureNames).toEqual([
      'Blackwater River',
      'Lantern Keep',
      'Market Road',
      'Rivergate Ferry',
    ])
    expect(approachReveal.partialFeatureNames).toEqual(['North Gate'])

    expect(siteReveal.scaleRevealState).toBe('partial')
    expect(siteReveal.visibleFeatureNames).toEqual([
      'Chapel Yard',
      'Lantern Keep',
      'North Gate',
    ])
    expect(siteReveal.partialFeatureNames).toEqual(['Blackwater River', 'Market Road'])
    expect(siteReveal.hiddenFeatureNames).toContain('Rivergate Ferry')
  })

  it('keeps more than one linked site view under the same site-scale identity', () => {
    const stack = deriveLinkedLocationStack(makeLinkedLocationInput())

    expect(stack.site.views).toEqual([
      {
        viewId: 'site-view:keep-plan',
        kind: 'plan',
        placementKind: 'primary',
        label: 'Lantern Keep Plan',
        routeId: 'route:north-gate',
        featureIds: ['feature:chapel-yard', 'feature:lantern-keep', 'feature:north-gate'],
        revealState: 'partial',
        parentSiteNodeId: 'site:lantern-keep',
      },
      {
        viewId: 'site-view:north-gate-section',
        kind: 'section',
        placementKind: 'inset',
        label: 'North Gate Section',
        routeId: 'route:north-gate',
        featureIds: ['feature:north-gate'],
        revealState: 'partial',
        parentSiteNodeId: 'site:lantern-keep',
        parentViewId: 'site-view:keep-plan',
      },
      {
        viewId: 'site-view:undercroft-detached',
        kind: 'detached_submap',
        placementKind: 'detached',
        label: 'Undercroft Detached Map',
        routeId: 'route:service-stairs',
        featureIds: ['feature:undercroft'],
        revealState: 'hidden',
        parentSiteNodeId: 'site:lantern-keep',
        parentViewId: 'site-view:keep-plan',
        linkedAnchorId: 'anchor:river-bend-beacon',
        linkedHandleId: 'handle:beacon-causeway',
      },
    ])
  })

  it('preserves landmark-linked placement continuity from regional anchors through approach handles', () => {
    const stack = deriveLinkedLocationStack(makeLinkedLocationInput())
    const handleResolution = resolveLinkedApproachHandle(stack, 'handle:beacon-causeway')

    expect(stack.regionalAnchors).toEqual([
      {
        anchorId: 'anchor:river-bend-beacon',
        label: 'River Bend Beacon',
        featureId: 'feature:blackwater-river',
        regionNodeId: 'region:blackwater-bend',
        routeId: 'route:kings-road',
      },
    ])
    expect(stack.approachHandles).toEqual([
      {
        handleId: 'handle:beacon-causeway',
        label: 'Beacon Causeway Handle',
        anchorId: 'anchor:river-bend-beacon',
        approachNodeId: 'approach:rivergate-causeway',
        routeId: 'route:causeway-road',
        preservedFeatureIds: ['feature:blackwater-river', 'feature:north-gate'],
      },
    ])
    expect(handleResolution).toEqual({
      locationId: 'loc:rivergate-ferry-keep',
      handleId: 'handle:beacon-causeway',
      anchorId: 'anchor:river-bend-beacon',
      continuityRouteIds: ['route:kings-road', 'route:causeway-road', 'route:north-gate'],
      preservedFeatureNames: ['Blackwater River', 'North Gate'],
      continuityStatus: 'continuous',
    })
  })

  it('resolves detached and inset site views back to one shared parent site identity', () => {
    const stack = deriveLinkedLocationStack(makeLinkedLocationInput())
    const detached = resolveLinkedDetachedSiteView(stack, 'site-view:undercroft-detached')
    const inset = resolveLinkedDetachedSiteView(stack, 'site-view:north-gate-section')

    expect(detached).toEqual({
      locationId: 'loc:rivergate-ferry-keep',
      parentSiteNodeId: 'site:lantern-keep',
      viewId: 'site-view:undercroft-detached',
      kind: 'detached_submap',
      placementKind: 'detached',
      continuityRouteId: 'route:service-stairs',
      linkedAnchorId: 'anchor:river-bend-beacon',
      linkedHandleId: 'handle:beacon-causeway',
      continuityStatus: 'continuous',
    })
    expect(inset).toEqual({
      locationId: 'loc:rivergate-ferry-keep',
      parentSiteNodeId: 'site:lantern-keep',
      viewId: 'site-view:north-gate-section',
      kind: 'section',
      placementKind: 'inset',
      continuityRouteId: 'route:north-gate',
      continuityStatus: 'continuous',
    })
  })

  it('resolves travel and camp actions through the same linked route-and-location context', () => {
    const travelContext = resolveLinkedLocationTravelContext(
      deriveLinkedLocationStack(makeLinkedLocationInput())
    )

    expect(travelContext).toEqual({
      locationId: 'loc:rivergate-ferry-keep',
      routeChain: ['route:kings-road', 'route:causeway-road', 'route:north-gate'],
      transitionIds: [
        'loc:rivergate-ferry-keep:region:approach:region:blackwater-bend:approach:rivergate-causeway',
        'loc:rivergate-ferry-keep:approach:site:approach:rivergate-causeway:site:lantern-keep',
      ],
      preservedFeatureNames: [
        'Blackwater River',
        'Lantern Keep',
        'Market Road',
        'North Gate',
        'Rivergate Ferry',
      ],
      campAnchorId: 'camp:causeway-grove',
      supportedCampActions: ['fortification', 'rest'],
    })
  })

  it('builds one deterministic route context spanning region to site entry', () => {
    const stack = deriveLinkedLocationStack(makeLinkedLocationInput())
    const routeContext = resolveLinkedRoutePhaseContext(stack, 'handle:beacon-causeway')

    expect(routeContext).toEqual({
      routeContextId: 'loc:rivergate-ferry-keep:route-context:handle:beacon-causeway',
      locationId: 'loc:rivergate-ferry-keep',
      scaleChain: ['region', 'approach', 'site'],
      routeChain: ['route:kings-road', 'route:causeway-road', 'route:north-gate'],
      transitionIds: [
        'loc:rivergate-ferry-keep:region:approach:region:blackwater-bend:approach:rivergate-causeway',
        'loc:rivergate-ferry-keep:approach:site:approach:rivergate-causeway:site:lantern-keep',
      ],
      preservedFeatureNames: [
        'Blackwater River',
        'Lantern Keep',
        'Market Road',
        'North Gate',
        'Rivergate Ferry',
      ],
      linkedAnchorId: 'anchor:river-bend-beacon',
      linkedHandleId: 'handle:beacon-causeway',
      campAnchorId: 'camp:causeway-grove',
      supportedCampActions: ['fortification', 'rest'],
      continuityStatus: 'continuous',
    })
  })

  it('attaches camp-phase action to the same shared route context with landmark/handle continuity', () => {
    const stack = deriveLinkedLocationStack(makeLinkedLocationInput())
    const routeContext = resolveLinkedRoutePhaseContext(stack, 'handle:beacon-causeway')
    const campPhase = resolveLinkedCampPhaseAction(stack, 'fortification', 'handle:beacon-causeway')

    expect(campPhase).toEqual({
      routeContextId: routeContext.routeContextId,
      locationId: 'loc:rivergate-ferry-keep',
      phase: 'camp',
      action: 'fortification',
      campAnchorId: 'camp:causeway-grove',
      routeChain: ['route:kings-road', 'route:causeway-road', 'route:north-gate'],
      linkedAnchorId: 'anchor:river-bend-beacon',
      linkedHandleId: 'handle:beacon-causeway',
      preservedFeatureNames: [
        'Blackwater River',
        'Lantern Keep',
        'Market Road',
        'North Gate',
        'Rivergate Ferry',
      ],
      continuityStatus: 'continuous',
    })
  })

  it('remains repeatable for identical authored inputs', () => {
    const first = deriveLinkedLocationStack(makeLinkedLocationInput())
    const second = deriveLinkedLocationStack(makeLinkedLocationInput())

    expect(second).toEqual(first)
    expect(resolveLinkedLocationTravelContext(second)).toEqual(
      resolveLinkedLocationTravelContext(first)
    )
    expect(projectLinkedScaleReveal(second, 'site')).toEqual(projectLinkedScaleReveal(first, 'site'))
    expect(resolveLinkedApproachHandle(second, 'handle:beacon-causeway')).toEqual(
      resolveLinkedApproachHandle(first, 'handle:beacon-causeway')
    )
    expect(resolveLinkedDetachedSiteView(second, 'site-view:undercroft-detached')).toEqual(
      resolveLinkedDetachedSiteView(first, 'site-view:undercroft-detached')
    )
    expect(resolveLinkedRoutePhaseContext(second, 'handle:beacon-causeway')).toEqual(
      resolveLinkedRoutePhaseContext(first, 'handle:beacon-causeway')
    )
    expect(resolveLinkedCampPhaseAction(second, 'fortification', 'handle:beacon-causeway')).toEqual(
      resolveLinkedCampPhaseAction(first, 'fortification', 'handle:beacon-causeway')
    )
  })
})
