import { useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, Download, FileUp, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { importCsv } from "@/lib/import/import.functions";
import { csvErrorReport, detectImportTable, parseImportCsv } from "@/lib/import/csv";
import { IMPORT_LIMITS, IMPORT_TABLES, validateImportFiles, type ImportFile, type ImportIssue, type ImportReport, type ImportTable } from "@/lib/import/csv-schema";

type SelectedFile = { key: number; name: string; source: string; table: ImportTable };

export function CsvImporter() {
  const input = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<SelectedFile[]>([]);
  const [replace, setReplace] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [busy, setBusy] = useState<"reading" | "validate" | "import" | null>(null);
  const [message, setMessage] = useState("");
  const run = useServerFn(importCsv);
  const reset = () => { setReport(null); setMessage(""); };

  const choose = async (list: FileList | null) => {
    if (!list) return;
    reset(); setBusy("reading");
    try {
      const files = Array.from(list);
      if (selected.length + files.length > IMPORT_LIMITS.files || files.reduce((total, file) => total + file.size, selected.reduce((total, file) => total + new TextEncoder().encode(file.source).length, 0)) > IMPORT_LIMITS.bytes) throw new Error("Choose up to 20 CSV files, totaling no more than 5 MB.");
      if (files.some((file) => !file.name.toLowerCase().endsWith(".csv"))) throw new Error("Only CSV files can be imported.");
      const next = await Promise.all(files.map(async (file, index) => ({ key: Date.now() + index, name: file.name, source: await file.text(), table: detectImportTable(file.name) ?? "profiles" as ImportTable })));
      setSelected((current) => [...current, ...next]);
    } catch (error) { setMessage(error instanceof Error ? error.message : "These files could not be read."); }
    finally { setBusy(null); if (input.current) input.current.value = ""; }
  };

  const parsed: { files: ImportFile[]; errors: ImportIssue[] } = useMemo(() => {
    if (!selected.length) return { files: [], errors: [] };
    try {
      const parts = selected.map((file) => parseImportCsv(file.name, file.table, file.source));
      const batch = validateImportFiles(parts.map((part) => part.file));
      const all = [...parts.flatMap((part) => part.errors), ...batch.errors];
      const unique = new Map(all.map((error) => [JSON.stringify(error), error]));
      return { files: batch.files, errors: [...unique.values()] };
    } catch (error) { return { files: [], errors: [{ file: "Batch", row: 1, field: "file", message: error instanceof Error ? error.message : "Invalid files." }] }; }
  }, [selected]);
  const errors = [...parsed.errors, ...(report?.errors ?? [])];
  const total = parsed.files.reduce((sum, file) => sum + file.rows.length, 0);

  const submit = async (action: "validate" | "import") => {
    setMessage("");
    if (parsed.errors.length || !parsed.files.length) return;
    setBusy(action);
    try { setReport(await run({ data: { files: parsed.files, action, replace } })); }
    catch (error) { setMessage(error instanceof Error && error.message.includes("Only admins") ? error.message : "The import service could not complete this request. Please try again."); setReport(null); }
    finally { setBusy(null); }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([csvErrorReport(errors)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "import-validation-errors.csv"; link.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4 border-y-2 border-border py-4">
        <div><h2 className="text-xl text-primary">Exported files</h2><p className="text-sm text-muted-foreground">{selected.length} files · {total.toLocaleString()} records</p></div>
        <input ref={input} aria-label="CSV files" type="file" accept=".csv,text/csv" multiple className="hidden" onChange={(event) => void choose(event.target.files)} disabled={busy !== null} />
        <Button variant="outline" onClick={() => input.current?.click()} disabled={busy !== null}><FileUp />Choose CSV files</Button>
      </section>
      {selected.length === 0 && <div className="flex min-h-40 flex-col items-center justify-center gap-3 border-2 border-dashed border-border text-muted-foreground"><Upload className="size-8" aria-hidden="true" /><p>No files selected</p></div>}
      {selected.length > 0 && <ul className="divide-y divide-border">
        {selected.map((file) => {
          const data = parsed.files.find((item) => item.name === file.name && item.table === file.table);
          return <li key={file.key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_15rem_auto] sm:items-center">
            <div className="min-w-0"><p className="break-all text-lg">{file.name}</p><p className="text-sm text-muted-foreground">{data?.rows.length ?? 0} records{data?.ignoredColumns.length ? ` · ${data.ignoredColumns.length} excluded columns` : ""}</p></div>
            <label className="col-start-1 row-start-2 sm:col-start-2 sm:row-start-1"><span className="sr-only">Record type for {file.name}</span><select aria-label={`Record type for ${file.name}`} className="w-full border-2 border-border bg-input px-2 py-2 text-base text-foreground" value={file.table} disabled={busy !== null} onChange={(event) => { setSelected((current) => current.map((item) => item.key === file.key ? { ...item, table: event.target.value as ImportTable } : item)); reset(); }}>
              {Object.entries(IMPORT_TABLES).map(([key, spec]) => <option key={key} value={key}>{spec.label}</option>)}
            </select></label>
            <Button variant="ghost" size="icon" className="col-start-2 row-start-1 sm:col-start-3" aria-label={`Remove ${file.name}`} title={`Remove ${file.name}`} disabled={busy !== null} onClick={() => { setSelected((current) => current.filter((item) => item.key !== file.key)); reset(); }}><Trash2 /></Button>
          </li>;
        })}
      </ul>}
      {selected.length > 0 && <section className="space-y-4 border-t-2 border-border pt-4">
        <label className="flex items-start gap-3"><input type="checkbox" className="mt-1 size-4 accent-primary" checked={replace} disabled={busy !== null} onChange={(event) => { setReplace(event.target.checked); reset(); }} /><span className="text-base">Replace existing game records with matching IDs<span className="block text-sm text-muted-foreground">Existing user accounts are never changed.</span></span></label>
        {replace && <p role="status" className="flex items-start gap-2 text-primary"><AlertTriangle className="mt-0.5 size-4 shrink-0" />Matching game records will be overwritten.</p>}
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" disabled={busy !== null || parsed.errors.length > 0 || total === 0} onClick={() => void submit("validate")}>{busy === "validate" ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}Validate files</Button>
          <Button disabled={busy !== null || report?.status !== "valid" || parsed.errors.length > 0} onClick={() => void submit("import")}>{busy === "import" ? <Loader2 className="animate-spin" /> : <Upload />}Import records</Button>
        </div>
      </section>}
      {busy && <p role="status" className="text-muted-foreground">{busy === "reading" ? "Reading files…" : busy === "validate" ? "Checking IDs and relationships…" : "Importing records…"}</p>}
      {message && <p role="alert" className="break-words text-destructive">{message}</p>}
      {report && <section aria-label="Import results" className="border-t-2 border-border pt-4">
        <h2 role="status" className={`mb-3 text-xl ${report.status === "valid" || report.status === "imported" ? "text-accent" : "text-destructive"}`}>{report.status === "valid" ? "Validation passed" : report.status === "imported" ? "Import complete" : report.status === "partial" ? "Import partially completed" : "Import blocked"}</h2>
        {report.files.map((file, index) => <div key={`${file.file}-${index}`} className="flex flex-wrap justify-between gap-2 border-b border-border py-2"><span className="min-w-0 break-all">{file.file}</span><span className="text-muted-foreground">{file.imported} imported · {file.skipped} skipped · {file.ready} ready</span></div>)}
      </section>}
      {errors.length > 0 && <section aria-label="Validation errors" className="border-t-2 border-destructive pt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl text-destructive">{errors.length} validation {errors.length === 1 ? "error" : "errors"}</h2><Button variant="outline" size="sm" onClick={download}><Download />Download errors</Button></div>
        <ol className="max-h-80 space-y-3 overflow-y-auto" role="alert">{errors.slice(0, 100).map((error, index) => <li key={index} className="border-l-2 border-destructive pl-3"><p className="break-all text-sm text-muted-foreground">{error.file} · Row {error.row} · {error.field}</p><p className="break-words">{error.message}</p></li>)}</ol>
      </section>}
    </div>
  );
}