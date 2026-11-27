import { describe, expect, it } from "vitest";
import { nextEventOccurrence } from "./due";

describe("recurring event notices", () => {
  it("finds a later daily occurrence", () => expect(nextEventOccurrence("2025-01-01T09:00:00Z", "daily", new Date("2026-11-17T08:00:00Z"))?.toISOString()).toBe("2026-11-17T09:00:00.000Z"));
  it("clamps monthly recurrence to shorter months", () => expect(nextEventOccurrence("2026-01-31T09:00:00Z", "monthly", new Date("2026-02-01T00:00:00Z"))?.toISOString()).toBe("2026-02-28T09:00:00.000Z"));
  it("does not repeat a single past event", () => expect(nextEventOccurrence("2026-01-01T09:00:00Z", null, new Date("2026-02-01T00:00:00Z"))).toBeNull());
});
