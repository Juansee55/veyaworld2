export type Field = { type: "text" | "uuid" | "integer" | "number" | "boolean" | "timestamp" | "date" | "email"; required?: boolean; nullable?: boolean; values?: string[]; min?: number; max?: number };
export type TableSpec = { label: string; keys: string[]; fields: Record<string, Field> };
const text: Field = { type: "text" };
const uuid: Field = { type: "uuid", required: true };
const optionalUuid: Field = { type: "uuid", nullable: true };
const requiredText: Field = { type: "text", required: true };
const integer: Field = { type: "integer" };
const nonnegative: Field = { type: "integer", min: 0 };
const timestamp: Field = { type: "timestamp" };
const boolean: Field = { type: "boolean" };
const nullableText: Field = { type: "text", nullable: true };
const chat = { id: uuid, user_id: uuid, username: requiredText, tag: nullableText, body: requiredText, deleted: boolean, created_at: timestamp };

export const IMPORT_TABLES = {
  users: { label: "Users", keys: ["id"], fields: { id: uuid, email: { type: "email", required: true }, username: text } },
  profiles: { label: "Players", keys: ["id"], fields: { id: uuid, username: text, body_id: text, head_id: text, hat_id: text, melee_id: text, facing_direction: { type: "text", values: ["up", "down", "left", "right"] }, animation_state: text, map_id: text, pos_x: { type: "number" }, pos_y: { type: "number" }, updated_at: timestamp } },
  gangs: { label: "Gangs", keys: ["id"], fields: { id: uuid, name: requiredText, tag: requiredText, emblem: text, color: text, leader_id: uuid, preferred_base_id: nullableText, created_at: timestamp } },
  gang_members: { label: "Gang members", keys: ["user_id"], fields: { user_id: uuid, gang_id: uuid, role: { type: "text", values: ["leader", "officer", "member"] }, joined_at: timestamp } },
  gang_invitations: { label: "Gang invitations", keys: ["id"], fields: { id: uuid, gang_id: uuid, user_id: uuid, invited_by: uuid, status: { type: "text", values: ["pending", "accepted", "rejected", "cancelled"] }, created_at: timestamp } },
  gang_alliances: { label: "Gang alliances", keys: ["id"], fields: { id: uuid, gang_a: uuid, gang_b: uuid, requested_by: uuid, status: { type: "text", values: ["pending", "active"] }, created_at: timestamp } },
  gang_daily_hours: { label: "Daily gang hours", keys: ["gang_id", "day"], fields: { gang_id: uuid, day: { type: "date", required: true }, hours: integer } },
  gang_total_hours: { label: "Total gang hours", keys: ["gang_id"], fields: { gang_id: uuid, hours: integer } },
  player_weapons: { label: "Player weapons", keys: ["user_id", "weapon_id"], fields: { user_id: uuid, weapon_id: requiredText, equipped: boolean, acquired_at: timestamp } },
  player_inventory: { label: "Player inventory", keys: ["user_id", "item_id"], fields: { user_id: uuid, item_id: requiredText, qty: nonnegative, equipped: boolean } },
  player_combat: { label: "Player combat", keys: ["user_id"], fields: { user_id: uuid, hp: integer, max_hp: integer, protected_until: timestamp, last_attack_at: timestamp, kills: nonnegative, deaths: nonnegative, respawn_seq: nonnegative, respawn_map: nullableText, respawn_x: { type: "integer", nullable: true }, respawn_y: { type: "integer", nullable: true }, last_supply_at: timestamp, updated_at: timestamp } },
  player_positions: { label: "Player positions", keys: ["user_id"], fields: { user_id: uuid, map_id: requiredText, x: { type: "number", required: true }, y: { type: "number", required: true }, updated_at: timestamp } },
  player_respawns: { label: "Player respawns", keys: ["id"], fields: { id: uuid, user_id: uuid, killer_id: optionalUuid, base_id: nullableText, map_id: requiredText, x: { type: "integer", required: true }, y: { type: "integer", required: true }, seq: { type: "integer", required: true }, created_at: timestamp } },
  player_art: { label: "Player art records", keys: ["id"], fields: { id: uuid, user_id: uuid, kind: { type: "text", required: true, values: ["body", "head", "hat", "melee"] }, name: { type: "text", required: true, max: 40 }, sheet_path: requiredText, original_path: requiredText, frames: { type: "integer", min: 1, max: 200 }, frame_ms: { type: "integer", min: 20, max: 2000 }, created_at: timestamp } },
  global_chat_messages: { label: "Global chat", keys: ["id"], fields: chat },
  gang_chat_messages: { label: "Gang chat", keys: ["id"], fields: { ...chat, gang_id: uuid } },
  alliance_chat_messages: { label: "Alliance chat", keys: ["id"], fields: { ...chat, gang_id: uuid } },
  user_roles: { label: "User roles", keys: ["id"], fields: { id: uuid, user_id: uuid, role: { type: "text", required: true, values: ["admin", "moderator", "user"] } } },
} satisfies Record<string, TableSpec>;

export type ImportTable = keyof typeof IMPORT_TABLES;
export type ImportValue = string | number | boolean | null;
export type ImportRow = { row: number; values: Record<string, ImportValue> };
export type ImportIssue = { file: string; row: number; field: string; message: string };
export type ImportFile = { name: string; table: ImportTable; rows: ImportRow[]; ignoredColumns: string[] };
export type FileResult = { file: string; table: ImportTable; imported: number; skipped: number; ready: number };
export type ImportReport = { status: "valid" | "invalid" | "imported" | "partial"; errors: ImportIssue[]; files: FileResult[] };
export const IMPORT_LIMITS = { files: 20, bytes: 5 * 1024 * 1024, rows: 2000, users: 100 };
export const IMPORT_ORDER = Object.keys(IMPORT_TABLES) as ImportTable[];
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isImportTable(value: unknown): value is ImportTable {
  return typeof value === "string" && Object.hasOwn(IMPORT_TABLES, value);
}

export function isCredentialColumn(name: string): boolean {
  const compact = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  return ["password", "passwd", "secret", "credential", "privatekey", "apikey", "apitoken", "bearertoken", "providertoken", "accesstoken", "refreshtoken", "idtoken", "sessiontoken", "verificationtoken", "resettoken", "authtoken", "confirmationtoken", "emailchangetoken", "reauthenticationtoken", "recoverytoken", "signingkey", "clientkey", "connectionstring", "databaseurl", "mfasecret"].some((part) => compact.includes(part)) || compact.endsWith("tokens") || ["jwt", "token", "authorization", "cookie", "cookies"].includes(compact);
}

export function assertImportAdmin(allowed: boolean): void {
  if (!allowed) throw new Error("Only admins can import records.");
}

export function normalizeValue(value: unknown, field: Field): ImportValue | undefined {
  if (value === null || value === "\\N" || value === "NULL" || value === "") {
    if (field.required) throw new Error("A value is required.");
    return field.nullable ? null : undefined;
  }
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") throw new Error("Invalid value.");
  const source = String(value);
  if (field.type === "uuid") {
    if (!UUID_PATTERN.test(source.trim())) throw new Error("A valid UUID is required.");
    return source.trim().toLowerCase();
  }
  if (field.type === "email") {
    const email = source.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("A valid email address is required.");
    return email;
  }
  if (field.type === "integer" || field.type === "number") {
    if (!source.trim()) throw new Error("A number is required.");
    const number = Number(source);
    if (!Number.isFinite(number) || (field.type === "integer" && (!Number.isInteger(number) || number < -2147483648 || number > 2147483647))) throw new Error(field.type === "integer" ? "A whole number is required." : "A finite number is required.");
    if ((field.min !== undefined && number < field.min) || (field.max !== undefined && number > field.max)) throw new Error("The number is outside the allowed range.");
    return number;
  }
  if (field.type === "boolean") {
    if (["true", "t", "1"].includes(source.toLowerCase())) return true;
    if (["false", "f", "0"].includes(source.toLowerCase())) return false;
    throw new Error("Use true or false.");
  }
  if (field.type === "timestamp") {
    if (source === "epoch") return "1970-01-01T00:00:00.000Z";
    if (["infinity", "-infinity"].includes(source)) return source;
    if (!/^\d{4}-\d{2}-\d{2}[T ]/.test(source) || !Number.isFinite(Date.parse(source))) throw new Error("A valid date and time are required.");
    return source;
  }
  if (field.type === "date") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(source) || !Number.isFinite(Date.parse(source)) || new Date(source).toISOString().slice(0, 10) !== source) throw new Error("Use a valid YYYY-MM-DD date.");
  }
  if (field.required && !source.trim()) throw new Error("A value is required.");
  if (field.values && !field.values.includes(source)) throw new Error(`Use ${field.values.join(", ")}.`);
  if (field.max !== undefined && source.length > field.max) throw new Error("The text is too long.");
  return source;
}

export function validateImportFiles(input: unknown): { files: ImportFile[]; errors: ImportIssue[] } {
  const errors: ImportIssue[] = [];
  const files: ImportFile[] = [];
  const seen = new Set<string>();
  const emails = new Set<string>();
  if (!Array.isArray(input) || input.length === 0 || input.length > IMPORT_LIMITS.files || JSON.stringify(input).length > IMPORT_LIMITS.bytes) throw new Error("Choose up to 20 CSV files, totaling no more than 5 MB.");
  let count = 0;
  let userCount = 0;
  for (const raw of input) {
    if (!raw || typeof raw.name !== "string" || raw.name.length > 128 || !isImportTable(raw.table) || !Array.isArray(raw.rows)) throw new Error("Invalid import file.");
    const table: ImportTable = raw.table;
    const spec: TableSpec = IMPORT_TABLES[table];
    const file: ImportFile = { name: raw.name, table, rows: [], ignoredColumns: Array.isArray(raw.ignoredColumns) ? raw.ignoredColumns.filter((v: unknown) => typeof v === "string").slice(0, 100) : [] };
    if (raw.rows.length === 0) errors.push({ file: file.name, row: 1, field: "file", message: "The file contains no records." });
    for (const rawRow of raw.rows) {
      if (!rawRow || !Number.isInteger(rawRow.row) || rawRow.row < 2 || !rawRow.values || typeof rawRow.values !== "object" || Array.isArray(rawRow.values)) throw new Error("Invalid CSV row.");
      count++;
      if (table === "users") userCount++;
      const values: Record<string, ImportValue> = {};
      const issue = (field: string, message: string) => errors.push({ file: file.name, row: rawRow.row, field, message });
      for (const key of Object.keys(rawRow.values)) {
        if (isCredentialColumn(key)) { if (!file.ignoredColumns.includes(key)) file.ignoredColumns.push(key); continue; }
        if (!Object.hasOwn(spec.fields, key)) issue(key, "Unknown column for this record type.");
      }
      for (const [key, field] of Object.entries(spec.fields)) {
        const value = rawRow.values[key];
        if (value === undefined) { if (field.required || spec.keys.includes(key)) issue(key, "A value is required."); continue; }
        try { const normalized = normalizeValue(value, { ...field, required: field.required || spec.keys.includes(key) }); if (normalized !== undefined) values[key] = normalized; }
        catch (error) { issue(key, error instanceof Error ? error.message : "Invalid value."); }
      }
      const identity = `${table}:${JSON.stringify(spec.keys.map((key) => values[key]))}`;
      if (spec.keys.every((key) => values[key] !== undefined)) {
        if (seen.has(identity)) issue(spec.keys.join(", "), "Duplicate ID in the selected files.");
        seen.add(identity);
      }
      if (table === "users" && typeof values["email"] === "string") {
        if (emails.has(values["email"])) issue("email", "Duplicate email in the selected files.");
        emails.add(values["email"]);
      }
      if (table === "gang_alliances" && values["gang_a"] === values["gang_b"]) issue("gang_b", "An alliance requires two different gangs.");
      if (table === "player_art") for (const key of ["sheet_path", "original_path"]) if (typeof values[key] === "string" && !values[key].startsWith(`${values["user_id"]}/`)) issue(key, "Art paths must belong to this player ID.");
      file.rows.push({ row: rawRow.row, values });
    }
    files.push(file);
  }
  if (count > IMPORT_LIMITS.rows) errors.push({ file: "Batch", row: 1, field: "records", message: "Import no more than 2,000 records at a time." });
  if (userCount > IMPORT_LIMITS.users) errors.push({ file: "Batch", row: 1, field: "users", message: "Import no more than 100 users at a time." });
  files.sort((a, b) => IMPORT_ORDER.indexOf(a.table) - IMPORT_ORDER.indexOf(b.table));
  return { files, errors };
}