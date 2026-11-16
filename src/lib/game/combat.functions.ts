import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { hasLineOfSight } from "@/game/combat/lineOfSight";

const MESSAGES: Record<string, string> = {
  cooldown: "Too fast — wait for your weapon",
  too_far: "Out of range",
  protected: "That player has spawn protection",
  friendly: "You can't attack gang members or allies",
  not_here: "That player is in another room",
  out_of_sync: "Connection lagging, try again",
  not_ready: "Combat not ready yet",
  invalid_target: "Invalid target",
};

export const attackPlayer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { targetId: string }) => {
    if (typeof input?.targetId !== "string" || !/^[0-9a-f-]{36}$/i.test(input.targetId)) throw new Error("Invalid target");
    return { targetId: input.targetId };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pos, error } = await supabaseAdmin
      .from("player_positions").select("user_id, map_id, x, y").in("user_id", [context.userId, data.targetId]);
    if (error) throw new Error("Combat unavailable");
    const a = pos?.find((p) => p.user_id === context.userId);
    const b = pos?.find((p) => p.user_id === data.targetId);
    if (!a || !b) throw new Error(MESSAGES["out_of_sync"]);
    if (a.map_id !== b.map_id) throw new Error(MESSAGES["not_here"]);
    if (!hasLineOfSight(a.map_id, a.x, a.y, b.x, b.y)) throw new Error("A wall is in the way");
    const { data: res, error: e2 } = await supabaseAdmin.rpc("resolve_attack", { _attacker: context.userId, _target: data.targetId });
    if (e2) throw new Error(MESSAGES[e2.message] ?? "Attack rejected");
    return res as { damage: number; hp: number; max_hp: number; killed: boolean; weapon: string };
  });
