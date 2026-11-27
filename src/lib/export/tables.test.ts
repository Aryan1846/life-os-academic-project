import { describe, expect, it } from "vitest";
import { personalExportTables } from "./tables";

describe("personal export allowlist", () => {
  it("excludes authentication and administrative data", () => {
    const names = Object.keys(personalExportTables);
    expect(names).not.toContain("auth.users");
    expect(names).not.toContain("audit_logs");
    expect(names).not.toContain("system_settings");
    expect(JSON.stringify(personalExportTables)).not.toMatch(/password|secret|token|api_key/i);
  });
});
