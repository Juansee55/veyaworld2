import { describe, expect, it } from "vitest";
import { parseImportCsv, detectImportTable, csvErrorReport } from "@/lib/import/csv";
import { assertImportAdmin, validateImportFiles } from "@/lib/import/csv-schema";

const player = "a1111111-1111-4111-8111-111111111111";
const gang = "b2222222-2222-4222-8222-222222222222";

describe("admin CSV imports", () => {
  it("preserves exported player IDs", () => {
    const { file, errors } = parseImportCsv("players.csv", "profiles", `id,username,pos_x\n${player},Traveler,160`);
    expect(errors).toEqual([]);
    expect(file.rows[0]?.values["id"]).toBe(player);
    expect(file.rows[0]?.values["pos_x"]).toBe(160);
  });
  it("preserves exported gang IDs", () => {
    const { file, errors } = parseImportCsv("gangs.csv", "gangs", `id,name,tag,leader_id\n${gang},Explorers,EXP,${player}`);
    expect(errors).toEqual([]);
    expect(file.rows[0]?.values["id"]).toBe(gang);
    expect(file.rows[0]?.values["leader_id"]).toBe(player);
  });
  it("preserves chat IDs and quoted multiline messages", () => {
    const { file, errors } = parseImportCsv("chat.csv", "global_chat_messages", `id,user_id,username,body\n${gang},${player},Traveler,"Hello, world\nSecond line"`);
    expect(errors).toEqual([]);
    expect(file.rows[0]?.values["id"]).toBe(gang);
    expect(file.rows[0]?.values["body"]).toBe("Hello, world\nSecond line");
  });
  it("preserves user IDs while removing credentials before sending", () => {
    const { file, errors } = parseImportCsv("users.csv", "users", `id,email,encrypted_password,raw_app_meta_data,recovery_token\n${player},traveler@example.com,discard,discard,discard`);
    expect(errors).toEqual([]);
    expect(file.rows[0]?.values).toEqual({ id: player, email: "traveler@example.com" });
    expect(file.ignoredColumns).toContain("encrypted_password");
  });
  it("reports validation errors with file, row and field", () => {
    const { errors } = parseImportCsv("players.csv", "profiles", "id,username,pos_x\nwrong,Traveler,not-a-number");
    expect(errors).toEqual(expect.arrayContaining([expect.objectContaining({ file: "players.csv", row: 2, field: "id" }), expect.objectContaining({ row: 2, field: "pos_x" })]));
  });
  it("rejects duplicate IDs across files instead of changing IDs", () => {
    const { file } = parseImportCsv("players.csv", "profiles", `id,username\n${player},Traveler`);
    expect(validateImportFiles([file, { ...file, name: "players2.csv" }]).errors.some((error) => error.message.includes("Duplicate ID"))).toBe(true);
  });
  it("rejects duplicate user emails rather than merging users", () => {
    const result = parseImportCsv("users.csv", "users", `id,email\n${player},traveler@example.com\n${gang},TRAVELER@example.com`);
    expect(result.errors.some((error) => error.field === "email")).toBe(true);
  });
  it("blocks non-admin importing", () => {
    expect(() => assertImportAdmin(false)).toThrow("Only admins");
    expect(() => assertImportAdmin(true)).not.toThrow();
  });
  it("rejects unknown columns and malformed CSV rows", () => {
    expect(parseImportCsv("players.csv", "profiles", `id,unexpected\n${player},value`).errors.some((error) => error.field === "unexpected")).toBe(true);
    expect(parseImportCsv("players.csv", "profiles", `id,username\n${player},one,extra`).errors.some((error) => error.field === "CSV")).toBe(true);
  });
  it("identifies exported file names and escapes formula-like error values", () => {
    expect(detectImportTable("public.gang_chat_messages.csv")).toBe("gang_chat_messages");
    expect(detectImportTable("players.csv")).toBe("profiles");
    expect(csvErrorReport([{ file: "=danger.csv", row: 2, field: "id", message: "Invalid UUID" }])).toContain("'=danger.csv");
  });
});