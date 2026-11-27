import { describe, expect, it } from "vitest";
import {
  createEmptyContactRegistry,
  upsertContact,
  getContact,
  listContacts,
  evaluateContactReadiness,
  markNotified,
  type ContactRecord,
} from "./contactPartnerRegistry";

describe("contactPartnerRegistry (SPE-857)", () => {
  const freshContact: ContactRecord = {
    id: "c1",
    kind: "partner",
    role: "liaison",
    relevance: "high",
    freshness: "fresh",
    reachability: "reachable",
    afterHoursContactability: "reachable",
    hardCopyBackupValue: "high",
    notificationStatus: "not-applicable",
    lastRefreshWeek: 5,
  };

  it("stores and retrieves contact records", () => {
    let reg = createEmptyContactRegistry();
    reg = upsertContact(reg, freshContact);
    expect(getContact(reg, "c1")).toEqual(freshContact);
    expect(listContacts(reg)).toHaveLength(1);
  });

  it("flags stale contacts as not ready", () => {
    const stale: ContactRecord = { ...freshContact, freshness: "stale" };
    const result = evaluateContactReadiness(stale);
    expect(result.ready).toBe(false);
    expect(result.reason).toBe("contact-stale-requires-refresh");
  });

  it("uses hard-copy backup when digital access fails", () => {
    const result = evaluateContactReadiness(freshContact, {
      digitalAccessFailed: true,
    });
    expect(result.ready).toBe(true);
    expect(result.usesBackup).toBe(true);
    expect(result.reason).toBe("using-hard-copy-backup");
  });

  it("fails when digital fails and no backup", () => {
    const noBackup: ContactRecord = {
      ...freshContact,
      hardCopyBackupValue: "none",
    };
    const result = evaluateContactReadiness(noBackup, {
      digitalAccessFailed: true,
    });
    expect(result.ready).toBe(false);
    expect(result.reason).toBe("digital-failed-no-backup");
  });

  it("respects after-hours contactability", () => {
    const daytimeOnly: ContactRecord = {
      ...freshContact,
      afterHoursContactability: "unreachable",
    };
    const day = evaluateContactReadiness(daytimeOnly, { isAfterHours: false });
    const night = evaluateContactReadiness(daytimeOnly, { isAfterHours: true });
    expect(day.ready).toBe(true);
    expect(night.ready).toBe(false);
    expect(night.reason).toBe("after-hours-unreachable");
  });

  it("marks notification status", () => {
    let reg = upsertContact(createEmptyContactRegistry(), freshContact);
    reg = markNotified(reg, "c1");
    expect(getContact(reg, "c1")?.notificationStatus).toBe("notified");
  });
});
