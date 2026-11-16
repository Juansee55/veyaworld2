import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getMap, hasMap } from "@/game/maps";
import { assertEditorAdmin, validatePlayerDestination } from "./editor-rules";

export const dragPlayer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; mapId: string; x: number; y: number }) => input)
  .handler(async ({ data, context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("am_admin");
    assertEditorAdmin(!roleError && admin === true);
    let dimensions: { width: number; height: number };
    if (hasMap(data.mapId)) dimensions = getMap(data.mapId);
    else {
      const { data: map, error } = await context.supabase.from("world_maps").select("width,height").eq("id", data.mapId).single();
      if (error || !map) throw new Error("Mapa inexistente.");
      dimensions = map;
    }
    validatePlayerDestination(data, dimensions.width, dimensions.height);
    const { error } = await context.supabase.rpc("admin_drag_player", { _user: data.userId, _map: data.mapId, _x: data.x, _y: data.y });
    if (error) throw new Error("No se pudo mover al jugador.");
    return { ok: true };
  });