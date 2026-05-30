/**
 * Canonical hub / location / scene IDs for RuntimeState navigation (hydration problem 438).
 * Shell routes, front-desk authored content, and save/load fixtures must stay aligned with this map.
 */
export interface RuntimeHubDefinition {
  hubId: string
  /** locationId -> allowed sceneIds for that location within the hub */
  locations: Readonly<Record<string, readonly string[]>>
}

export const DEFAULT_RUNTIME_HUB_ID = 'operations-desk' as const
export const DEFAULT_RUNTIME_LOCATION_ID = 'operations-desk' as const
export const DEFAULT_RUNTIME_SCENE_ID = 'dashboard' as const

export const AUTHORED_RUNTIME_HUBS: readonly RuntimeHubDefinition[] = [
  {
    hubId: 'operations-desk',
    locations: {
      'operations-desk': ['dashboard', 'weekly-report-tutorial'],
    },
  },
  {
    hubId: 'agency',
    locations: {
      'front-desk': ['weekly-report', 'special-recruit-opportunity'],
      'operations-desk': ['briefing-room', 'dashboard'],
    },
  },
  {
    hubId: 'recruitment',
    locations: {
      'recruitment-board': ['special-recruit-review', 'candidate-sweep'],
    },
  },
  {
    hubId: 'intel',
    locations: {
      'intel-archive': ['template-preview'],
    },
  },
] as const

const HUB_MAP = new Map(AUTHORED_RUNTIME_HUBS.map((hub) => [hub.hubId, hub]))

const LOCATION_SCENE_MAP = new Map<string, Set<string>>()

for (const hub of AUTHORED_RUNTIME_HUBS) {
  for (const [locationId, sceneIds] of Object.entries(hub.locations)) {
    const existing = LOCATION_SCENE_MAP.get(locationId) ?? new Set<string>()
    for (const sceneId of sceneIds) {
      existing.add(sceneId)
    }
    LOCATION_SCENE_MAP.set(locationId, existing)
  }
}

export function isKnownRuntimeHubId(hubId: string) {
  return HUB_MAP.has(hubId)
}

export function isKnownRuntimeLocationScene(locationId: string, sceneId: string) {
  const scenes = LOCATION_SCENE_MAP.get(locationId)
  return scenes !== undefined && scenes.has(sceneId)
}

export function isRuntimeSceneValidForHub(
  hubId: string,
  locationId: string | undefined,
  sceneId: string | undefined
) {
  const hub = HUB_MAP.get(hubId)
  if (!hub || !locationId || !sceneId) {
    return false
  }

  const scenes = hub.locations[locationId]
  return scenes !== undefined && scenes.includes(sceneId)
}

export function getDefaultRuntimeLocation(week: number) {
  return {
    hubId: DEFAULT_RUNTIME_HUB_ID,
    locationId: DEFAULT_RUNTIME_LOCATION_ID,
    sceneId: DEFAULT_RUNTIME_SCENE_ID,
    updatedWeek: Math.max(1, Math.trunc(week)),
  }
}

/**
 * Repairs unknown hub/location/scene on currentLocation to the operations desk default.
 */
export function resolveRuntimeCurrentLocation(
  value: {
    hubId?: string
    locationId?: string
    sceneId?: string
    updatedWeek?: number
  },
  campaignWeek: number
) {
  const defaultLocation = getDefaultRuntimeLocation(campaignWeek)
  const hubId =
    typeof value.hubId === 'string' && value.hubId.trim().length > 0
      ? value.hubId.trim()
      : defaultLocation.hubId

  if (!isKnownRuntimeHubId(hubId)) {
    return { ...defaultLocation }
  }

  const locationId =
    typeof value.locationId === 'string' && value.locationId.trim().length > 0
      ? value.locationId.trim()
      : undefined
  const sceneId =
    typeof value.sceneId === 'string' && value.sceneId.trim().length > 0
      ? value.sceneId.trim()
      : undefined

  if (locationId && sceneId && isRuntimeSceneValidForHub(hubId, locationId, sceneId)) {
    return {
      hubId,
      locationId,
      sceneId,
      updatedWeek: Math.max(
        1,
        Math.min(
          Math.max(1, Math.trunc(campaignWeek)),
          typeof value.updatedWeek === 'number' && Number.isFinite(value.updatedWeek)
            ? Math.trunc(value.updatedWeek)
            : campaignWeek
        )
      ),
    }
  }

  const hub = HUB_MAP.get(hubId)!
  const fallbackLocationId = hub.locations[DEFAULT_RUNTIME_LOCATION_ID]
    ? DEFAULT_RUNTIME_LOCATION_ID
    : Object.keys(hub.locations)[0]
  const fallbackScenes = hub.locations[fallbackLocationId] ?? [DEFAULT_RUNTIME_SCENE_ID]

  return {
    hubId,
    locationId: fallbackLocationId,
    sceneId: fallbackScenes[0] ?? DEFAULT_RUNTIME_SCENE_ID,
    updatedWeek: Math.max(
      1,
      Math.min(
        Math.max(1, Math.trunc(campaignWeek)),
        typeof value.updatedWeek === 'number' && Number.isFinite(value.updatedWeek)
          ? Math.trunc(value.updatedWeek)
          : campaignWeek
      )
    ),
  }
}

/**
 * Scene history stores location+scene without hub. Drop entries with unknown pairs (stale policy).
 */
export function isRuntimeSceneHistoryEntryValid(locationId: string, sceneId: string) {
  return isKnownRuntimeLocationScene(locationId, sceneId)
}
