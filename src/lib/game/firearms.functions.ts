import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { hasLineOfSight } from "@/game/combat/lineOfSight";
import { rayTarget, type Aim } from "./firearm-rules";

export interface ShotResult { rounds: number; damage: number; hp: number; max_hp: number; killed: boolean; targetId: string | null }
export const shootFirearm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { aim: Aim }) => {
    if (!input || !["up", "down", "left", "right"].includes(input.aim)) throw new Error("Invalid aim");
    return { aim: input.aim };
  })
  .handler(async ({ data, context }) => {
    const { data: a, error } = await context.supabase.from("player_positions").select("user_id,map_id,x,y").eq("user_id", context.userId).maybeSingle();
    if (error || !a) throw new Error("Espera a conectar con el mapa");
    const { data: others, error: e } = await context.supabase.from("player_positions").select("user_id,x,y").eq("map_id", a.map_id).neq("user_id", context.userId).gte("updated_at", new Date(Date.now() - 4000).toISOString());
    if (e) throw new Error("No se pudo disparar");
    const target = rayTarget(data.aim, a.x, a.y, others ?? []);
    const targetId = target && hasLineOfSight(a.map_id, a.x, a.y, target.x, target.y) ? target.user_id : null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error: shotError } = await supabaseAdmin.rpc("resolve_firearm_shot", { _attacker: context.userId, _target: targetId ?? context.userId, _aim: data.aim });
    if (shotError) throw new Error(shotError.message);
    return result as unknown as ShotResult;
  });