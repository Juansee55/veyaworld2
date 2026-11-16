import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { MapBuilder } from "../maps/types";
import { hasMap, registerMap } from "../maps";

type Tb = Database["public"]["Tables"];
export type WorldMapRow = Tb["world_maps"]["Row"];
export type TileRow = Tb["world_tiles"]["Row"];
export type WarpRow = Tb["world_warps"]["Row"];
export type NpcRow = Tb["world_npcs"]["Row"];
export type FurnitureRow = Tb["world_furniture"]["Row"];
export type PropRow = Tb["world_props"]["Row"];
export interface MapExtras { tiles: TileRow[]; warps: WarpRow[]; npcs: NpcRow[]; props: PropRow[]; furniture: FurnitureRow[]; assets: Tb["world_assets"]["Row"][] }
const initialExtras = new Map<string, MapExtras>();
export function primeMapExtras(mapId: string, extras: MapExtras) { initialExtras.set(mapId, extras); }
export function takeInitialExtras(mapId: string) { const ex = initialExtras.get(mapId); initialExtras.delete(mapId); return ex; }

/** Custom (editor-made) maps are registered into the normal map registry. */
export function registerCustomMap(m: WorldMapRow) {
  registerMap(m.id, () => {
    const b = new MapBuilder(m.width, m.height, m.width * 31 + m.height);
    b.rect("ground", 0, 0, m.width, m.height, m.ground_tile);
    return b.build(m.id, m.name, { x: Math.min(m.spawn_x, m.width - 1), y: Math.min(m.spawn_y, m.height - 1) }, []);
  });
}

export async function loadCustomMaps(): Promise<WorldMapRow[]> {
  const { data } = await supabase.from("world_maps").select("*").order("created_at");
  for (const m of data ?? []) registerCustomMap(m);
  return data ?? [];
}

export async function loadMapExtras(mapId: string): Promise<MapExtras> {
  const [t, w, n, p, f, a] = await Promise.all([
    supabase.from("world_tiles").select("*").eq("map_id", mapId),
    supabase.from("world_warps").select("*").eq("map_id", mapId),
    supabase.from("world_npcs").select("*").eq("map_id", mapId),
    supabase.from("world_props").select("*").eq("map_id", mapId),
    supabase.from("world_furniture").select("*"),
    supabase.from("world_assets").select("*"),
  ]);
  return { tiles: t.data ?? [], warps: w.data ?? [], npcs: n.data ?? [], props: p.data ?? [], furniture: f.data ?? [], assets: a.data ?? [] };
}

export { hasMap };
