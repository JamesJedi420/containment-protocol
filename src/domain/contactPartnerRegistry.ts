/**
 * Contact and partner registry readiness — SPE-857 slice 1.
 *
 * Pure deterministic registry for media, stakeholder, partner, responder,
 * and specialist contact records. Tracks reachability, role, relevance,
 * freshness, after-hours contactability, hard-copy/offline backup value,
 * and notification status. Does not model partner capability or message
 * distribution.
 */

export type ContactKind =
  | "media"
  | "stakeholder"
  | "partner"
  | "responder"
  | "specialist";

export type FreshnessState = "fresh" | "aging" | "stale";

export type Reachability = "reachable" | "unreachable" | "unknown";

export type AfterHoursContactability = "reachable" | "unreachable" | "unknown";

export type BackupValue = "high" | "medium" | "low" | "none";

export type NotificationStatus = "notified" | "pending" | "failed" | "not-applicable";

export interface ContactRecord {
  id: string;
  kind: ContactKind;
  role: string;
  relevance: string;
  freshness: FreshnessState;
  reachability: Reachability;
  afterHoursContactability: AfterHoursContactability;
  hardCopyBackupValue: BackupValue;
  notificationStatus: NotificationStatus;
  lastRefreshWeek?: number;
}

export interface ContactRegistry {
  records: Record<string, ContactRecord>;
}

export function createEmptyContactRegistry(): ContactRegistry {
  return { records: {} };
}

export function upsertContact(
  registry: ContactRegistry,
  record: ContactRecord,
): ContactRegistry {
  return {
    records: {
      ...registry.records,
      [record.id]: { ...record },
    },
  };
}

export function getContact(
  registry: ContactRegistry,
  id: string,
): ContactRecord | undefined {
  return registry.records[id];
}

export function listContacts(registry: ContactRegistry): ContactRecord[] {
  return Object.values(registry.records).sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Compute effective readiness for crisis communication.
 * Stale or unreachable contacts reduce readiness; after-hours and backup
 * provide fallback paths.
 */
export function evaluateContactReadiness(
  record: ContactRecord,
  options: { isAfterHours?: boolean; digitalAccessFailed?: boolean } = {},
): {
  ready: boolean;
  reason: string;
  usesBackup: boolean;
} {
  const { isAfterHours = false, digitalAccessFailed = false } = options;

  if (record.freshness === "stale") {
    return {
      ready: false,
      reason: "contact-stale-requires-refresh",
      usesBackup: false,
    };
  }

  if (digitalAccessFailed) {
    if (record.hardCopyBackupValue === "none") {
      return {
        ready: false,
        reason: "digital-failed-no-backup",
        usesBackup: false,
      };
    }
    return {
      ready: true,
      reason: "using-hard-copy-backup",
      usesBackup: true,
    };
  }

  const effectiveReachability = isAfterHours
    ? record.afterHoursContactability
    : record.reachability;

  if (effectiveReachability === "unreachable" || effectiveReachability === "unknown") {
    return {
      ready: false,
      reason: isAfterHours ? "after-hours-unreachable" : "unreachable",
      usesBackup: false,
    };
  }

  return {
    ready: true,
    reason: "ready",
    usesBackup: false,
  };
}

export function markNotified(
  registry: ContactRegistry,
  id: string,
): ContactRegistry {
  const existing = registry.records[id];
  if (!existing) return registry;
  return upsertContact(registry, {
    ...existing,
    notificationStatus: "notified",
  });
}
