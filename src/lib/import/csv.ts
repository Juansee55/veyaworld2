import Papa from "papaparse";
import { IMPORT_LIMITS, IMPORT_TABLES, isCredentialColumn, isImportTable, validateImportFiles, type ImportFile, type ImportIssue, type ImportTable, type ImportValue } from "./csv-schema";

export function detectImportTable(name: string): ImportTable | null {
  const stem = name.toLowerCase().replace(/\.csv$/, "").replace(/^(public|auth)[._-]/, "").replace(/[- ]/g, "_");
  if (stem === "players" || stem === "player") return "profiles";
  if (stem === "chat" || stem === "chat_messages") return "global_chat_messages";
  if (isImportTable(stem)) return stem;
  return Object.keys(IMPORT_TABLES).sort((a, b) => b.length - a.length).find((table) => stem.startsWith(`${table}_`)) as ImportTable | undefined ?? null;
}

export function parseImportCsv(name: string, table: ImportTable, source: string): { file: ImportFile; errors: ImportIssue[] } {
  const errors: ImportIssue[] = [];
  if (new TextEncoder().encode(source).length > IMPORT_LIMITS.bytes) throw new Error("This CSV is larger than 5 MB.");
  const result = Papa.parse<string[]>(source.replace(/^\uFEFF/, ""), { skipEmptyLines: "greedy" });
  const headers = (result.data[0] ?? []).map((column) => column.trim().toLowerCase());
  const ignoredColumns = headers.filter((column) => isCredentialColumn(column) || (table === "users" && !Object.hasOwn(IMPORT_TABLES.users.fields, column)));
  const file: ImportFile = { name, table, rows: [], ignoredColumns: [...new Set(ignoredColumns)] };
  for (const error of result.errors) errors.push({ file: name, row: (error.row ?? 0) + 1, field: "CSV", message: "Malformed CSV: check quotes and delimiters." });
  if (headers.length === 0 || headers.every((column) => !column)) errors.push({ file: name, row: 1, field: "headers", message: "A header row is required." });
  if (new Set(headers).size !== headers.length) errors.push({ file: name, row: 1, field: "headers", message: "Duplicate column names." });
  for (let i = 1; i < result.data.length; i++) {
    const cells = result.data[i];
    if (!cells) continue;
    if (cells.length !== headers.length) { errors.push({ file: name, row: i + 1, field: "CSV", message: "The row has a different number of columns than the header." }); continue; }
    const values: Record<string, ImportValue> = {};
    headers.forEach((column, index) => { if (column && !ignoredColumns.includes(column)) values[column] = cells[index] ?? ""; });
    file.rows.push({ row: i + 1, values });
  }
  const validated = validateImportFiles([file]);
  return { file: validated.files[0] ?? file, errors: [...errors, ...validated.errors] };
}

export function csvErrorReport(errors: ImportIssue[]): string {
  return Papa.unparse(errors.map((error) => ({ file: error.file, row: error.row, field: error.field, error: error.message })), { escapeFormulae: true });
}