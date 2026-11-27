import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const maybeSingle = vi.fn();
const eq = vi.fn();
const select = vi.fn();
const from = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser }, from }) }));

import { GET as getDecision } from "./[id]/route";
import { POST as createDecision } from "./route";

const id = "11111111-1111-4111-8111-111111111111";
describe("decision route ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: "owner-id" } } });
    maybeSingle.mockResolvedValue({ data: null, error: null });
    eq.mockReturnValue({ eq, maybeSingle });
    select.mockReturnValue({ eq });
    from.mockReturnValue({ select });
  });
  it("scopes individual reads to the authenticated owner and hides other users' records", async () => {
    const response = await getDecision(new Request(`http://localhost/api/decisions/${id}`), { params: Promise.resolve({ id }) });
    expect(response.status).toBe(404);
    expect(eq).toHaveBeenCalledWith("user_id", "owner-id");
  });
  it("rejects unauthenticated writes before reading a request body", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const response = await createDecision(new Request("http://localhost/api/decisions", { method: "POST" }));
    expect(response.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });
});
