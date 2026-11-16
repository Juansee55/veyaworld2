import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { notify } from "./notify";

type Fns = Database["public"]["Functions"];

/** Calls a server-validated game function; shows the server's reason when it refuses. */
export async function rpc<K extends keyof Fns & string>(fn: K, args?: Fns[K]["Args"], okMsg?: string): Promise<Fns[K]["Returns"] | undefined> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)(fn, args ?? {});
  if (error) { notify(error.message || "Something went wrong", "error"); return undefined; }
  if (okMsg) notify(okMsg);
  return data as Fns[K]["Returns"];
}

export const fmtHs = (n: number | null | undefined) => { const minutes = Math.max(0, Math.floor(n ?? 0)); return `${Math.floor(minutes / 60)}h ${minutes % 60}min`; };
