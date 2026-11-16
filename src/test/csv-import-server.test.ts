import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseImportCsv } from "@/lib/import/csv";

const mock = vi.hoisted(() => ({ listUsers: vi.fn(), createUser: vi.fn(), from: vi.fn(), rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { auth: { admin: { listUsers: mock.listUsers, createUser: mock.createUser } }, from: mock.from, rpc: mock.rpc } }));
import { runImport, validateRelationships } from "@/lib/import/import.server";

const player = "a1111111-1111-4111-8111-111111111111";
const gang = "b2222222-2222-4222-8222-222222222222";
beforeEach(() => {
  vi.resetAllMocks();
  mock.listUsers.mockResolvedValue({ data: { users: [] }, error: null });
  mock.from.mockReturnValue({ select: () => ({ in: async () => ({ data: [], error: null }) }) });
  mock.createUser.mockResolvedValue({ data: { user: { id: player } }, error: null });
});

describe("server CSV importing", () => {
  it("reports missing user and gang references before writing", () => {
    const { file } = parseImportCsv("gang_chat_messages.csv", "gang_chat_messages", `id,user_id,gang_id,username,body\n${gang},${player},${gang},Traveler,Hello`);
    const errors = validateRelationships([file], {});
    expect(errors.map((error) => error.field)).toEqual(expect.arrayContaining(["user_id", "gang_id"]));
  });
  it("detects existing email and ID conflicts without merging users", () => {
    const { file } = parseImportCsv("users.csv", "users", `id,email\n${player},traveler@example.com`);
    expect(validateRelationships([file], { users: [{ id: gang, email: "traveler@example.com" }] })[0]?.field).toBe("email");
    expect(validateRelationships([file], { users: [{ id: player, email: "different@example.com" }] })[0]?.field).toBe("id");
  });
  it("creates user accounts with exact IDs without importing passwords or confirming email", async () => {
    const { file } = parseImportCsv("users.csv", "users", `id,email,username,encrypted_password\n${player},traveler@example.com,Traveler,discard`);
    const report = await runImport([file], "import", false);
    expect(report.status).toBe("imported");
    expect(mock.createUser).toHaveBeenCalledWith({ id: player, email: "traveler@example.com", email_confirm: false, user_metadata: { username: "Traveler" } });
    expect(report.files[0]?.imported).toBe(1);
  });
  it("validation is read-only", async () => {
    const { file } = parseImportCsv("users.csv", "users", `id,email\n${player},traveler@example.com`);
    expect((await runImport([file], "validate", false)).status).toBe("valid");
    expect(mock.createUser).not.toHaveBeenCalled();
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it("skips existing accounts with matching IDs and emails", async () => {
    mock.listUsers.mockResolvedValue({ data: { users: [{ id: player, email: "traveler@example.com" }] }, error: null });
    const { file } = parseImportCsv("users.csv", "users", `id,email\n${player},traveler@example.com`);
    const report = await runImport([file], "import", true);
    expect(report.files[0]?.skipped).toBe(1);
    expect(mock.createUser).not.toHaveBeenCalled();
  });
});