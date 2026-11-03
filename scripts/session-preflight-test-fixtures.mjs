export const SHA = '1'.repeat(40)
export const OTHER_SHA = '2'.repeat(40)
export const OBSERVED_AT = '2026-11-03T03:30:00.000Z'
export const CHECKED_AT = '2026-11-03T03:29:30.000Z'

export function baseInput(overrides = {}) {
  const input = {
    schemaVersion: 1,
    repository: 'JamesJedi420/containment-protocol',
    observedAt: OBSERVED_AT,
    freshnessWindowSeconds: 300,
    requestedOperation: 'start',
    executionMode: 'local-checkout',
    handoff: {
      issueId: 'SPE-3337',
      workstream: 'shared-system',
      parentId: null,
      sliceRef: 'planning/spe-3337-session-preflight-slice.md',
      intendedBranch: 'codex/spe-3337-session-preflight',
      expectedBaseMainSha: SHA,
      blockerIds: [],
      dependencyIds: [],
    },
    linear: {
      collectionStatus: 'ready',
      checkedAt: CHECKED_AT,
      sourceRef: 'linear:SPE-3337@2026-11-03T03:29:30Z',
      issueId: 'SPE-3337',
      parentId: null,
      status: 'Backlog',
      statusType: 'backlog',
      approvalState: 'approved',
      blockerIds: [],
      dependencyIds: [],
    },
    github: {
      collectionStatus: 'ready',
      checkedAt: CHECKED_AT,
      sourceRef: 'github:JamesJedi420/containment-protocol:open-prs',
      remoteMainSha: SHA,
      openPullRequests: [],
      implementationEvidence: {
        checkedAt: CHECKED_AT,
        sourceRef: 'github:JamesJedi420/containment-protocol:implementation:SPE-3337',
        mergedCurrentMain: false,
        mergedPrUrls: [],
      },
    },
    git: {
      collectionStatus: 'ready',
      checkedAt: CHECKED_AT,
      sourceRef: `git:${SHA}`,
      headSha: SHA,
      currentBranch: 'main',
      detachedHead: false,
      trackedDirty: false,
      localMainSha: SHA,
      remoteMainSha: SHA,
    },
  }
  return deepMerge(input, overrides)
}

function deepMerge(base, overrides) {
  const output = structuredClone(base)
  for (const [key, value] of Object.entries(overrides)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && typeof output[key] === 'object') {
      output[key] = deepMerge(output[key], value)
    } else {
      output[key] = value
    }
  }
  return output
}

export function reasonCodes(result) {
  return result.reasons.map((reason) => reason.code)
}
