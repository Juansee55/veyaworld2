import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertImportAdmin, validateImportFiles, type ImportFile, type ImportReport } from "./csv-schema";

export const getImportAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    return { allowed: !error && data === true };
  });

export const importCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { files: ImportFile[]; action: "validate" | "import"; replace: boolean }) => {
    if (!input || !["validate", "import"].includes(input.action) || typeof input.replace !== "boolean") throw new Error("Invalid import request.");
    return { ...validateImportFiles(input.files), action: input.action, replace: input.replace };
  })
  .handler(async ({ data, context }): Promise<ImportReport> => {
    const { data: allowed, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    assertImportAdmin(!error && allowed === true);
    if (data.errors.length) return { status: "invalid", errors: data.errors, files: [] };
    const { runImport } = await import("./import.server");
    return runImport(data.files, data.action, data.replace);
  });