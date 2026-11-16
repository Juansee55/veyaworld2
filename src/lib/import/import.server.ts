import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";
import { IMPORT_TABLES, type FileResult, type ImportFile, type ImportIssue, type ImportReport, type ImportValue, type TableSpec } from "./csv-schema";

export type ExistingRecord = Record<string, ImportValue>;
type ExistingRecords = Record<string, ExistingRecord[]>;
const references: Record<string, Record<string, [string, string]>> = {
  profiles: { id: ["users", "id"] },
  gangs: { leader_id: ["profiles", "id"], preferred_base_id: ["bases", "id"] },
  gang_members: { user_id: ["profiles", "id"], gang_id: ["gangs", "id"] },
  gang_invitations: { user_id: ["profiles", "id"], invited_by: ["profiles", "id"], gang_id: ["gangs", "id"] },
  gang_alliances: { gang_a: ["gangs", "id"], gang_b: ["gangs", "id"], requested_by: ["profiles", "id"] },
  gang_daily_hours: { gang_id: ["gangs", "id"] }, gang_total_hours: { gang_id: ["gangs", "id"] },
  player_weapons: { user_id: ["profiles", "id"], weapon_id: ["weapons", "id"] },
  player_inventory: { user_id: ["profiles", "id"], item_id: ["items", "id"] },
  player_combat: { user_id: ["profiles", "id"] }, player_positions: { user_id: ["profiles", "id"] },
  player_respawns: { user_id: ["profiles", "id"], killer_id: ["profiles", "id"], base_id: ["bases", "id"] },
  player_art: { user_id: ["profiles", "id"] },
  global_chat_messages: { user_id: ["profiles", "id"] },
  gang_chat_messages: { user_id: ["profiles", "id"], gang_id: ["gangs", "id"] },
  alliance_chat_messages: { user_id: ["profiles", "id"], gang_id: ["gangs", "id"] },
  user_roles: { user_id: ["users", "id"] },
};

export function validateRelationships(files: ImportFile[], existing: ExistingRecords): ImportIssue[] {
  const errors: ImportIssue[] = [];
  const available: ExistingRecords = Object.fromEntries(Object.entries(existing).map(([table, rows]) => [table, [...rows]]));
  for (const file of files) available[file.table] = [...(available[file.table] ?? []), ...file.rows.map((row) => row.values)];
  // Auth's signup trigger supplies a profile even when no player CSV is included.
  available["profiles"] = [...(available["profiles"] ?? []), ...(available["users"] ?? []).map((user) => ({ id: user["id"] ?? null }))];
  for (const file of files) for (const row of file.rows) {
    for (const [field, [target, targetField]] of Object.entries(references[file.table] ?? {})) {
      const value = row.values[field];
      if (value !== null && value !== undefined && !(available[target] ?? []).some((record) => record[targetField] === value)) errors.push({ file: file.name, row: row.row, field, message: `No matching ${target === "users" ? "user" : target.replaceAll("_", " ")} ID exists or is included in this batch.` });
    }
    if (file.table === "users") {
      const sameId = (existing["users"] ?? []).find((user) => user["id"] === row.values["id"]);
      const sameEmail = (existing["users"] ?? []).find((user) => user["email"] === row.values["email"]);
      if (sameId && sameId["email"] !== row.values["email"]) errors.push({ file: file.name, row: row.row, field: "id", message: "This user ID already belongs to a different email. Accounts are never merged." });
      if (sameEmail && sameEmail["id"] !== row.values["id"]) errors.push({ file: file.name, row: row.row, field: "email", message: "This email already belongs to a different user ID. Accounts are never merged." });
    }
  }
  return errors;
}

async function loadExisting(files: ImportFile[]): Promise<ExistingRecords> {
  const records: ExistingRecords = {};
  // Only return safe identity fields from Auth; never password/session fields.
  const users: ExistingRecord[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error("User records could not be checked. Please try again.");
    users.push(...data.users.map((user) => ({ id: user.id, email: user.email?.toLowerCase() ?? null })));
    if (data.users.length < 1000) break;
  }
  records["users"] = users;
  const targets = new Map<string, Set<string>>();
  const add = (table: string, field: string, value: ImportValue | undefined) => {
    if (typeof value !== "string" || table === "users") return;
    const key = `${table}.${field}`;
    if (!targets.has(key)) targets.set(key, new Set());
    targets.get(key)?.add(value);
  };
  for (const file of files) for (const row of file.rows) {
    for (const [field, [target, targetField]] of Object.entries(references[file.table] ?? {})) add(target, targetField, row.values[field]);
    if (file.table !== "users") for (const key of IMPORT_TABLES[file.table].keys) add(file.table, key, row.values[key]);
  }
  await Promise.all([...targets].map(async ([target, values]) => {
    const [table, field] = target.split(".");
    if (!table || !field) return;
    const list = [...values];
    for (let start = 0; start < list.length; start += 100) {
      // Target identifiers originate exclusively from the server's schema allowlist.
      const { data, error } = await supabaseAdmin.from(table as keyof Database["public"]["Tables"]).select("*").in(field, list.slice(start, start + 100));
      if (error) throw new Error("Existing records could not be checked. Please try again.");
      records[table] = [...(records[table] ?? []), ...(data ?? []) as unknown as ExistingRecord[]];
    }
  }));
  return records;
}

export async function runImport(files: ImportFile[], action: "validate" | "import", replace: boolean): Promise<ImportReport> {
  const existing = await loadExisting(files);
  const errors = validateRelationships(files, existing);
  const results: FileResult[] = files.map((file) => {
    const spec: TableSpec = IMPORT_TABLES[file.table];
    const skipped = file.rows.filter((row) => (existing[file.table] ?? []).some((record) => spec.keys.every((key) => record[key] === row.values[key]))).length;
    return { file: file.name, table: file.table, imported: 0, skipped: replace && file.table !== "users" ? 0 : skipped, ready: file.rows.length - (replace && file.table !== "users" ? 0 : skipped) };
  });
  if (errors.length) return { status: "invalid", errors, files: results };
  if (action === "validate") return { status: "valid", errors: [], files: results };
  const created: string[] = [];
  for (const [index, file] of files.entries()) {
    if (file.table !== "users") continue;
    const result = results[index];
    if (!result) continue;
    for (const row of file.rows) {
      const id = row.values["id"];
      const email = row.values["email"];
      if (typeof id !== "string" || typeof email !== "string") continue;
      if ((existing["users"] ?? []).some((user) => user["id"] === id)) continue;
      const { data, error } = await supabaseAdmin.auth.admin.createUser({ id, email, email_confirm: false, user_metadata: { username: typeof row.values["username"] === "string" ? row.values["username"] : "player" } });
      if (error || data.user?.id !== id) {
        errors.push({ file: file.name, row: row.row, field: "user", message: "The account could not be created with its original ID. Check email conflicts and retry. No player, gang or chat records were imported." });
        return { status: created.length ? "partial" : "invalid", errors, files: results };
      }
      created.push(id); result.imported++; result.ready--;
    }
  }
  const applicationFiles = files.filter((file) => file.table !== "users");
  if (applicationFiles.length) {
    const { data, error } = await supabaseAdmin.rpc("import_csv_records", { _files: applicationFiles, _replace: replace, _new_user_ids: created });
    if (error) {
      errors.push({ file: "Batch", row: 1, field: "import", message: "Game records could not be saved. Newly created users remain available; retry the batch." });
      return { status: created.length ? "partial" : "invalid", errors, files: results };
    }
    const saved = data as unknown as { errors: ImportIssue[]; files: FileResult[] };
    for (const item of saved.files) {
      const index = results.findIndex((result) => result.file === item.file && result.table === item.table);
      if (index !== -1) results[index] = item;
    }
    if (saved.errors.length) return { status: created.length ? "partial" : "invalid", errors: saved.errors, files: results };
  }
  return { status: "imported", errors: [], files: results };
}