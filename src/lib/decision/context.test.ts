import { describe, expect, it } from "vitest";
import { permittedAreas } from "./context";

describe("decision context privacy gate", () => {
  it("requires explicit consent and server-side privacy flags", () => {
    const settings = { share_goals: true, share_finance: false, share_health: true, share_career: false };
    expect(permittedAreas(["goals", "finance", "health"], settings, false)).toEqual([]);
    expect(permittedAreas(["goals", "finance", "health"], settings, true)).toEqual(["goals", "health"]);
  });
});
